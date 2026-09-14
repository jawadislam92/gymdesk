<?php
/**
 * =============================================================================
 *  SITE MALWARE SCANNER  --  READ ONLY
 * =============================================================================
 *  Finds injected PHP backdoors, webshells, .htaccess redirects, rogue files in
 *  upload folders, and tampered WordPress core files.
 *
 *  This script NEVER writes to, moves, renames or deletes anything it scans.
 *  The only files it creates are the report files you ask for with --out.
 *
 *  ---------------------------------------------------------------------------
 *  USAGE A -- SSH (preferred)
 *
 *      php scan.php --root=/home/uXXXXXX/domains/blazerealty.com/public_html \
 *                   --out=/home/uXXXXXX/scan-report \
 *                   --since=2026-06-01
 *
 *  USAGE B -- no SSH, browser only
 *
 *      1. Edit $BROWSER_TOKEN below, put a long random string in it.
 *      2. Upload this file next to index.php via hPanel File Manager.
 *      3. Open  https://yoursite.com/scan.php?token=YOUR_TOKEN
 *      4. DELETE scan.php from the server when you are finished.
 *  ---------------------------------------------------------------------------
 */

$BROWSER_TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

@set_time_limit(0);
@ini_set('memory_limit', '512M');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

$IS_CLI = (PHP_SAPI === 'cli');

if (!$IS_CLI) {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    $given = isset($_GET['token']) ? $_GET['token'] : '';
    if ($BROWSER_TOKEN === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING') {
        exit('Set $BROWSER_TOKEN inside scan.php before running it from a browser.');
    }
    if (!hash_equals($BROWSER_TOKEN, $given)) {
        header('HTTP/1.1 404 Not Found');
        exit('Not Found');
    }
}

/** Read a --name=value CLI flag, or ?name=value in browser mode. */
function opt($name, $default = null)
{
    global $IS_CLI;
    if ($IS_CLI) {
        foreach ($GLOBALS['argv'] as $a) {
            if (strpos($a, '--' . $name . '=') === 0) {
                return substr($a, strlen($name) + 3);
            }
            if ($a === '--' . $name) {
                return true;
            }
        }
        return $default;
    }
    return isset($_GET[$name]) ? $_GET[$name] : $default;
}

$ROOT = rtrim((string) opt('root', $IS_CLI ? getcwd() : dirname(__FILE__)), '/');
$OUT  = (string) opt('out', ($IS_CLI ? getcwd() : dirname(__FILE__)) . '/scan-report');
$SINCE = opt('since', null);
$SINCE_TS = $SINCE ? strtotime($SINCE) : null;
$MAX_READ = 3 * 1024 * 1024;   // fully read files up to 3 MB
$HEAD_TAIL = 512 * 1024;       // for bigger files, read this much from each end
$SKIP_DIRS = array('.git', '.svn', 'node_modules', '.quarantine', '.wp-cli', '.cache');

if (!is_dir($ROOT)) {
    exit("Root directory not found: $ROOT\n");
}

// -----------------------------------------------------------------------------
// Signatures
// -----------------------------------------------------------------------------
// sev: critical = almost certainly malicious, remove it
//      high     = strong indicator, read the file before removing
//      medium   = suspicious, needs a human look
//      low      = worth noting, often legitimate

$SIGNATURES = array(

    // ---- remote code execution / backdoors -------------------------------
    array('id' => 'eval_decoded', 'sev' => 'critical',
        're' => '~\beval\s*\(\s*(?:@\s*)?(?:base64_decode|gzinflate|gzuncompress|gzdecode|str_rot13|strrev|rawurldecode|urldecode|hex2bin|pack|convert_uudecode)\s*\(~i',
        'desc' => 'eval() running a decoded/compressed payload - classic injected backdoor'),

    array('id' => 'eval_var', 'sev' => 'critical',
        're' => '~\beval\s*\(\s*(?:@\s*)?[\$\(]~',
        'desc' => 'eval() executing a variable or expression'),

    array('id' => 'assert_var', 'sev' => 'critical',
        're' => '~\bassert\s*\(\s*(?:@\s*)?\$[A-Za-z_]~',
        'desc' => 'assert() abused as eval()'),

    array('id' => 'superglobal_callable', 'sev' => 'critical',
        're' => '~\$_(?:POST|GET|REQUEST|COOKIE|SERVER|FILES)\s*\[[^\]]{0,60}\]\s*\(~',
        'desc' => 'Function name taken straight from the HTTP request - webshell'),

    array('id' => 'php_input_exec', 'sev' => 'critical',
        're' => '~(?:php://input|_INPUT)[^;]{0,120}(?:eval|assert|system|passthru|shell_exec|popen|proc_open)~i',
        'desc' => 'Raw request body passed to an execution function'),

    array('id' => 'preg_replace_e', 'sev' => 'critical',
        're' => '~preg_replace\s*\(\s*([\'"])\s*(?P<d>[^\w\s\\\\])(?:(?!(?P=d)).)*(?P=d)[a-zA-Z]*e[a-zA-Z]*\1~s',
        'desc' => 'preg_replace() with the /e modifier - executes the replacement as code'),

    array('id' => 'shell_from_request', 'sev' => 'critical',
        're' => '~\b(?:system|exec|shell_exec|passthru|popen|proc_open)\s*\(\s*(?:@\s*)?(?:\$_(?:POST|GET|REQUEST|COOKIE)|stripslashes\s*\(\s*\$_)~i',
        'desc' => 'Shell command built directly from the HTTP request'),

    array('id' => 'create_function', 'sev' => 'high',
        're' => '~\bcreate_function\s*\(~i',
        'desc' => 'create_function() - removed in PHP 8, commonly used to hide eval()'),

    array('id' => 'callable_obfuscated', 'sev' => 'critical',
        're' => '~\$\{\s*[\'"]_(?:POST|GET|REQUEST|COOKIE|SERVER)~i',
        'desc' => 'Superglobal reached through a variable-variable to dodge scanners'),

    array('id' => 'dynamic_globals_call', 'sev' => 'high',
        're' => '~\$GLOBALS\s*\[\s*[\'"][^\'"]+[\'"]\s*\]\s*\(\s*\$~',
        'desc' => 'Function called dynamically through $GLOBALS'),

    // ---- obfuscation ------------------------------------------------------
    array('id' => 'split_string_eval', 'sev' => 'high',
        're' => '~[\'"](?:e|ev|eva|as|ass|sys|ba|base)[\'"]\s*\.\s*[\'"][a-z0-9_]{1,6}[\'"]\s*\.\s*[\'"]~i',
        'desc' => 'Function name glued together from string fragments to hide it'),

    array('id' => 'chr_chain', 'sev' => 'high',
        're' => '~(?:chr\s*\(\s*\d+\s*\)\s*\.\s*){4,}~i',
        'desc' => 'Long chr() chain building a hidden string'),

    array('id' => 'hex_escape_blob', 'sev' => 'high',
        're' => '~(?:\\\\x[0-9a-fA-F]{2}){12,}~',
        'desc' => 'Long hex-escaped string - typical obfuscated payload'),

    array('id' => 'base64_blob', 'sev' => 'medium',
        're' => '~[\'"][A-Za-z0-9+/]{260,}={0,2}[\'"]~',
        'desc' => 'Very long base64 blob embedded in source'),

    array('id' => 'rot13_decode', 'sev' => 'high',
        're' => '~\bstr_rot13\s*\(\s*[\'"]~i',
        'desc' => 'str_rot13() on a literal - used to hide function names'),

    array('id' => 'gz_decode_chain', 'sev' => 'critical',
        're' => '~\b(?:gzinflate|gzuncompress|gzdecode)\s*\(\s*(?:@\s*)?base64_decode\s*\(~i',
        'desc' => 'Compressed + base64 payload - almost always injected code'),

    array('id' => 'obfuscator_header', 'sev' => 'critical',
        're' => '~(?:\$GLOBALS\[[\'"][a-z0-9_]{6,}[\'"]\]\s*=\s*){3,}~i',
        'desc' => 'Bulk $GLOBALS assignment block - signature of a packed dropper'),

    // ---- known shells -----------------------------------------------------
    array('id' => 'known_shell', 'sev' => 'critical',
        're' => '~\b(?:FilesMan|WSO\s*\d|b374k|c99shell|r57shell|IndoXploit|Alfa\s*Team|AlfaShell|MARIJUANA|priv8|Mini\s*Shell|adminer\.php|WebShell\s*by|angel\s*shell|Symlink\s*Bypass|Shell\s*Backdoor)\b~i',
        'desc' => 'Known webshell branding string'),

    array('id' => 'shell_auth_gate', 'sev' => 'high',
        're' => '~if\s*\(\s*(?:md5|sha1|crc32)\s*\(\s*\$_(?:POST|GET|COOKIE|REQUEST)\s*\[~i',
        'desc' => 'Password gate on a request parameter - shells protect themselves this way'),

    // ---- droppers / persistence ------------------------------------------
    array('id' => 'remote_fetch_exec', 'sev' => 'critical',
        're' => '~(?:file_get_contents|curl_exec|fsockopen|fopen)\s*\([^;]{0,160}https?://[^;]{0,160}\)\s*\)?\s*;?\s*(?:eval|assert)~i',
        'desc' => 'Downloads remote content and executes it'),

    array('id' => 'writes_php_file', 'sev' => 'high',
        're' => '~\b(?:file_put_contents|fwrite)\s*\([^;]{0,120}\.php[\'"][^;]{0,200}\$_(?:POST|GET|REQUEST|COOKIE)~i',
        'desc' => 'Writes a .php file using request data - dropper behaviour'),

    array('id' => 'hidden_include', 'sev' => 'high',
        're' => '~@?\s*(?:include|require)(?:_once)?\s*\(?\s*[\'"][^\'"]*(?:/tmp/|/\.[a-z0-9_]+|\.ico|\.png|\.jpg|\.gif|\.txt)[\'"]~i',
        'desc' => 'Includes a non-PHP or hidden file - payload smuggled in a fake asset'),

    array('id' => 'error_silence_header', 'sev' => 'medium',
        're' => '~@?\s*(?:ini_set\s*\(\s*[\'"]display_errors|error_reporting\s*\(\s*0\s*\))[^;]{0,40};\s*@?\s*(?:set_time_limit|ini_set|eval|\$)~i',
        'desc' => 'Errors silenced at the top of the file - common in injected code'),

    array('id' => 'wp_user_create', 'sev' => 'critical',
        're' => '~\b(?:wp_create_user|wp_insert_user)\s*\(~i',
        'desc' => 'Creates a WordPress user - remove unless this is a known plugin'),

    array('id' => 'wp_admin_grant', 'sev' => 'critical',
        're' => '~[\'"]role[\'"]\s*=>\s*[\'"]administrator[\'"]~i',
        'desc' => 'Grants administrator role in code'),

    array('id' => 'user_agent_cloak', 'sev' => 'high',
        're' => '~HTTP_USER_AGENT[^;]{0,120}(?:googlebot|bingbot|yandex|baidu)~i',
        'desc' => 'Behaves differently for search engines - SEO spam cloaking'),

    array('id' => 'referrer_redirect', 'sev' => 'high',
        're' => '~HTTP_REFERER[^;]{0,160}(?:header\s*\(\s*[\'"]Location|window\.location)~i',
        'desc' => 'Redirects visitors based on where they came from - spam redirect'),

    // ---- JavaScript side --------------------------------------------------
    array('id' => 'js_fromcharcode', 'sev' => 'high',
        're' => '~String\.fromCharCode\s*\(\s*(?:\d{1,3}\s*,\s*){15,}~i',
        'desc' => 'Long fromCharCode chain - obfuscated JavaScript'),

    array('id' => 'js_unescape_write', 'sev' => 'high',
        're' => '~document\.write\s*\(\s*unescape\s*\(~i',
        'desc' => 'document.write(unescape(...)) - injected script'),

    array('id' => 'js_eval_atob', 'sev' => 'high',
        're' => '~eval\s*\(\s*(?:window\.)?atob\s*\(~i',
        'desc' => 'eval(atob(...)) - obfuscated JavaScript payload'),

    array('id' => 'js_hidden_iframe', 'sev' => 'high',
        're' => '~<iframe[^>]*(?:width\s*=\s*[\'"]?[01][\'"]?|style\s*=\s*[\'"][^\'"]*display\s*:\s*none)[^>]*>~i',
        'desc' => 'Zero-size or hidden iframe - drive-by injection'),
);

// -----------------------------------------------------------------------------
// What we open
// -----------------------------------------------------------------------------

$CODE_EXT  = array('php','php3','php4','php5','php7','php8','phtml','phps','pht','inc','module','install','html','htm','js','mjs','tpl','twig','cgi','pl','suspected');
$MAGIC_EXT = array('ico','png','jpg','jpeg','gif','bmp','webp','svg','css','txt','log','json','xml','woff','ttf','zip','bak','old','env','ini','md');

$findings = array();
$stats = array('files' => 0, 'bytes' => 0, 'skipped' => 0, 'started' => time());

function add_finding(&$out, $sev, $rule, $path, $desc, $evidence, $line = 0, $mtime = 0)
{
    $out[] = array(
        'severity' => $sev,
        'rule'     => $rule,
        'path'     => $path,
        'line'     => $line,
        'desc'     => $desc,
        'evidence' => $evidence,
        'mtime'    => $mtime ? date('Y-m-d H:i:s', $mtime) : '',
    );
}

/** Shorten a matched snippet so the report stays readable. */
function snippet($text, $len = 180)
{
    $text = preg_replace('~\s+~', ' ', $text);
    if (strlen($text) > $len) {
        $text = substr($text, 0, $len) . ' ...';
    }
    return $text;
}

/** Byte offset -> 1-based line number. */
function line_at($content, $offset)
{
    return substr_count($content, "\n", 0, min($offset, strlen($content))) + 1;
}

// -----------------------------------------------------------------------------
// Walk
// -----------------------------------------------------------------------------

$dirIter = new RecursiveDirectoryIterator($ROOT, FilesystemIterator::SKIP_DOTS | FilesystemIterator::FOLLOW_SYMLINKS);
$filter = new RecursiveCallbackFilterIterator($dirIter, function ($current) use ($SKIP_DIRS) {
    if ($current->isDir()) {
        return !in_array($current->getFilename(), $SKIP_DIRS, true);
    }
    return true;
});
$walker = new RecursiveIteratorIterator($filter, RecursiveIteratorIterator::LEAVES_ONLY);

foreach ($walker as $file) {
    if (!$file->isFile()) {
        continue;
    }

    $path = $file->getPathname();
    $rel  = ltrim(substr($path, strlen($ROOT)), '/');
    $name = $file->getFilename();
    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $size = $file->getSize();
    $mtime = $file->getMTime();
    $lower = strtolower($rel);

    // --- structural checks (no need to open the file) ----------------------

    $isCode = in_array($ext, $CODE_EXT, true);
    $isPhp  = preg_match('~^(?:php[3-8]?|phtml|phps|pht|inc)$~', $ext) === 1;

    if ($isPhp && preg_match('~(?:^|/)(?:wp-content/uploads|uploads|upload|images|img|assets/images|media|cache|tmp|backup|backups)/~', $lower)) {
        add_finding($findings, 'critical', 'php_in_upload_dir', $rel,
            'Executable PHP sitting in a folder that should only hold uploads or assets', $name, 0, $mtime);
    }

    if ($isPhp && preg_match('~(?:^|/)wp-content/mu-plugins/~', $lower)) {
        add_finding($findings, 'high', 'mu_plugin', $rel,
            'Must-use plugin - loads on every request with no way to disable it from wp-admin. Verify you installed it.', $name, 0, $mtime);
    }

    if (preg_match('~\.(?:php[3-8]?|phtml)\.(?:jpg|jpeg|png|gif|txt|bak|old|suspected)$~i', $name)
        || preg_match('~\.(?:jpg|jpeg|png|gif|txt|zip)\.(?:php[3-8]?|phtml)$~i', $name)) {
        add_finding($findings, 'critical', 'double_extension', $rel,
            'Double file extension - used to sneak code past upload filters', $name, 0, $mtime);
    }

    if ($isPhp && preg_match('~^[a-z0-9]{8,}\.php$~', $name) && !preg_match('~^(?:wp|index|config|functions|database|settings)~', $name)) {
        add_finding($findings, 'high', 'random_filename', $rel,
            'Random-looking PHP filename - dropped files are usually named this way', $name, 0, $mtime);
    }

    if ($isPhp && $name[0] === '.') {
        add_finding($findings, 'critical', 'hidden_php', $rel,
            'Hidden (dot-prefixed) PHP file', $name, 0, $mtime);
    }

    $perms = @fileperms($path) & 0777;
    if ($perms === 0777 || $perms === 0666) {
        add_finding($findings, 'medium', 'world_writable', $rel,
            'World-writable file (' . decoct($perms) . ') - anyone on the server can rewrite it', decoct($perms), 0, $mtime);
    }

    if ($SINCE_TS && $mtime >= $SINCE_TS && ($isCode || $name === '.htaccess')) {
        add_finding($findings, 'low', 'recently_modified', $rel,
            'Changed on or after ' . date('Y-m-d', $SINCE_TS) . ' - check this against your own deploys', date('Y-m-d H:i:s', $mtime), 0, $mtime);
    }

    // --- decide whether to read the contents --------------------------------

    $readIt = $isCode || $name === '.htaccess' || $name === '.user.ini' || in_array($ext, $MAGIC_EXT, true);
    if (!$readIt || $size === 0) {
        $stats['skipped']++;
        continue;
    }

    $content = '';
    $fh = @fopen($path, 'rb');
    if (!$fh) {
        $stats['skipped']++;
        continue;
    }
    if ($size <= $MAX_READ) {
        $content = (string) @stream_get_contents($fh);
    } else {
        $content = (string) @fread($fh, $HEAD_TAIL);
        @fseek($fh, -$HEAD_TAIL, SEEK_END);
        $content .= "\n/*...scanner skipped the middle of this file...*/\n" . (string) @stream_get_contents($fh);
    }
    @fclose($fh);

    $stats['files']++;
    $stats['bytes'] += $size;

    // --- PHP hiding inside a non-PHP file -----------------------------------

    if (!$isPhp && in_array($ext, $MAGIC_EXT, true)) {
        if (preg_match('~<\?php|<\?=~', $content, $m, PREG_OFFSET_CAPTURE)) {
            add_finding($findings, 'critical', 'php_in_asset', $rel,
                'PHP code found inside a .' . $ext . ' file - payload disguised as an asset',
                snippet(substr($content, max(0, $m[0][1] - 20), 200)), line_at($content, $m[0][1]), $mtime);
        }
    }

    // --- .htaccess / .user.ini -----------------------------------------------

    if ($name === '.htaccess' || $name === '.user.ini') {
        if (preg_match('~auto_prepend_file|auto_append_file~i', $content, $m, PREG_OFFSET_CAPTURE)) {
            add_finding($findings, 'critical', 'htaccess_prepend', $rel,
                'auto_prepend_file / auto_append_file loads code into every PHP request',
                snippet($m[0][0]), line_at($content, $m[0][1]), $mtime);
        }
        if (preg_match_all('~^\s*(?:RewriteRule|Redirect(?:Match|Permanent)?)\s+[^\n]*?(https?://(?!(?:www\.)?(?:localhost|127\.0\.0\.1))[^\s"\']+)~mi', $content, $mm, PREG_SET_ORDER)) {
            foreach ($mm as $m2) {
                add_finding($findings, 'high', 'htaccess_external_redirect', $rel,
                    'Rewrite/redirect sending traffic to an external domain', snippet(trim($m2[0])), 0, $mtime);
            }
        }
        if (preg_match('~^\s*php_value\s+(?:auto_prepend_file|include_path)~mi', $content, $m, PREG_OFFSET_CAPTURE)) {
            add_finding($findings, 'high', 'htaccess_php_value', $rel,
                'php_value directive altering how PHP loads files', snippet($m[0][0]), line_at($content, $m[0][1]), $mtime);
        }
        if (preg_match('~<FilesMatch[^>]*>\s*[^<]{0,200}(?:SetHandler\s+application/x-httpd-php)~i', $content, $m, PREG_OFFSET_CAPTURE)) {
            add_finding($findings, 'critical', 'htaccess_php_handler', $rel,
                'Forces non-PHP files to be executed as PHP', snippet($m[0][0]), line_at($content, $m[0][1]), $mtime);
        }
    }

    // --- signature sweep -------------------------------------------------------

    $hitsThisFile = 0;
    foreach ($SIGNATURES as $sig) {
        if ($hitsThisFile >= 12) {
            break;
        }
        // JS-only rules are noisy on minified libraries; keep them for js/html.
        if (strpos($sig['id'], 'js_') === 0 && !in_array($ext, array('js','mjs','html','htm','php','phtml','tpl','twig'), true)) {
            continue;
        }
        if (@preg_match($sig['re'], $content, $m, PREG_OFFSET_CAPTURE)) {
            add_finding($findings, $sig['sev'], $sig['id'], $rel, $sig['desc'],
                snippet($m[0][0]), line_at($content, $m[0][1]), $mtime);
            $hitsThisFile++;
        }
    }

    unset($content);
}

// -----------------------------------------------------------------------------
// WordPress specific checks
// -----------------------------------------------------------------------------

$wpVersion = null;
$isWp = is_file($ROOT . '/wp-includes/version.php');

if ($isWp) {
    $verSrc = (string) @file_get_contents($ROOT . '/wp-includes/version.php');
    if (preg_match('~\$wp_version\s*=\s*[\'"]([^\'"]+)~', $verSrc, $m)) {
        $wpVersion = $m[1];
    }

    // wp-config.php: anything outside the PHP block, or an injected include
    $cfgPath = is_file($ROOT . '/wp-config.php') ? $ROOT . '/wp-config.php' : dirname($ROOT) . '/wp-config.php';
    if (is_file($cfgPath)) {
        $cfg = (string) @file_get_contents($cfgPath);
        if (substr(ltrim($cfg), 0, 5) !== '<?php') {
            add_finding($findings, 'critical', 'wpconfig_prefix', basename($cfgPath),
                'Content before the opening <?php tag in wp-config.php', snippet(substr(ltrim($cfg), 0, 120)), 1, @filemtime($cfgPath));
        }
        if (preg_match('~\?>\s*\S~', $cfg, $m, PREG_OFFSET_CAPTURE)) {
            add_finding($findings, 'critical', 'wpconfig_suffix', basename($cfgPath),
                'Content after the closing ?> tag in wp-config.php', snippet($m[0][0]), line_at($cfg, $m[0][1]), @filemtime($cfgPath));
        }
    }

    // Core file integrity against the official checksums
    if ($wpVersion) {
        $api = 'https://api.wordpress.org/core/checksums/1.0/?version=' . rawurlencode($wpVersion) . '&locale=en_US';
        $raw = @file_get_contents($api);
        if ($raw) {
            $json = json_decode($raw, true);
            if (isset($json['checksums']) && is_array($json['checksums'])) {
                $sums = $json['checksums'];
                foreach ($sums as $relCore => $md5) {
                    $abs = $ROOT . '/' . $relCore;
                    if (strpos($relCore, 'wp-content/') === 0) {
                        continue; // themes and plugins legitimately differ
                    }
                    if (!is_file($abs)) {
                        add_finding($findings, 'medium', 'wp_core_missing', $relCore,
                            'WordPress core file is missing', 'expected ' . $md5, 0, 0);
                        continue;
                    }
                    if (@md5_file($abs) !== $md5) {
                        add_finding($findings, 'critical', 'wp_core_modified', $relCore,
                            'WordPress core file does not match the official ' . $wpVersion . ' release - it has been edited',
                            'checksum mismatch', 0, @filemtime($abs));
                    }
                }
                // Extra files that do not belong in core directories
                foreach (array('wp-admin', 'wp-includes') as $coreDir) {
                    $d = $ROOT . '/' . $coreDir;
                    if (!is_dir($d)) {
                        continue;
                    }
                    $it = new RecursiveIteratorIterator(
                        new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS),
                        RecursiveIteratorIterator::LEAVES_ONLY
                    );
                    foreach ($it as $f) {
                        if (!$f->isFile()) {
                            continue;
                        }
                        $r = ltrim(substr($f->getPathname(), strlen($ROOT)), '/');
                        if (!isset($sums[$r])) {
                            add_finding($findings, 'critical', 'wp_core_foreign', $r,
                                'File inside ' . $coreDir . '/ that is not part of WordPress ' . $wpVersion,
                                $f->getFilename(), 0, $f->getMTime());
                        }
                    }
                }
            }
        } else {
            add_finding($findings, 'low', 'wp_checksums_unavailable', 'wp-includes/version.php',
                'Could not reach api.wordpress.org, so core files were not verified. Run again with outbound HTTPS allowed.',
                'WordPress ' . $wpVersion, 0, 0);
        }
    }
}

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------

$order = array('critical' => 0, 'high' => 1, 'medium' => 2, 'low' => 3);
usort($findings, function ($a, $b) use ($order) {
    if ($a['severity'] !== $b['severity']) {
        return $order[$a['severity']] - $order[$b['severity']];
    }
    return strcmp($a['path'], $b['path']);
});

$counts = array('critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0);
foreach ($findings as $f) {
    $counts[$f['severity']]++;
}

$meta = array(
    'scanned_root' => $ROOT,
    'generated_at' => date('c'),
    'wordpress'    => $wpVersion ? $wpVersion : ($isWp ? 'detected, version unknown' : 'not detected'),
    'files_read'   => $stats['files'],
    'bytes_read'   => $stats['bytes'],
    'duration_sec' => time() - $stats['started'],
    'counts'       => $counts,
);

$jsonPath = $OUT . '.json';
@file_put_contents($jsonPath, json_encode(array('meta' => $meta, 'findings' => $findings), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

// HTML report
$rows = '';
foreach ($findings as $f) {
    $rows .= '<tr class="' . $f['severity'] . '">'
        . '<td><span class="sev ' . $f['severity'] . '">' . strtoupper($f['severity']) . '</span></td>'
        . '<td class="path">' . htmlspecialchars($f['path']) . ($f['line'] ? '<span class="ln">:' . $f['line'] . '</span>' : '') . '</td>'
        . '<td>' . htmlspecialchars($f['desc']) . '<div class="rule">' . htmlspecialchars($f['rule']) . '</div></td>'
        . '<td><code>' . htmlspecialchars($f['evidence']) . '</code></td>'
        . '<td class="mt">' . htmlspecialchars($f['mtime']) . '</td>'
        . '</tr>';
}

$html = '<!doctype html><meta charset="utf-8"><title>Malware scan report</title>'
    . '<style>'
    . 'body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#0f1115;color:#e6e8ec}'
    . '.wrap{max-width:1200px;margin:0 auto;padding:24px 16px}'
    . 'h1{font-size:20px;margin:0 0 4px}'
    . '.meta{color:#9aa3b2;font-size:13px;margin-bottom:16px}'
    . '.cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}'
    . '.card{background:#171a21;border:1px solid #262b36;border-radius:8px;padding:10px 14px;min-width:96px}'
    . '.card b{display:block;font-size:22px}'
    . 'table{width:100%;border-collapse:collapse;background:#171a21;border-radius:8px;overflow:hidden}'
    . 'th,td{padding:8px 10px;border-bottom:1px solid #262b36;text-align:left;vertical-align:top}'
    . 'th{background:#1d212a;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9aa3b2}'
    . '.sev{font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap}'
    . '.sev.critical{background:#4a1015;color:#ff8f96}.sev.high{background:#4a2a0d;color:#ffb870}'
    . '.sev.medium{background:#3d3a10;color:#e8dc7a}.sev.low{background:#1d2b3d;color:#8fb8e8}'
    . '.path{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all;max-width:320px}'
    . '.ln{color:#7a8598}.rule{color:#6f7889;font-size:11px;font-family:ui-monospace,monospace;margin-top:2px}'
    . 'code{font-size:11px;color:#c9d1d9;word-break:break-all;display:block;max-width:380px}'
    . '.mt{color:#9aa3b2;font-size:12px;white-space:nowrap}'
    . '.empty{padding:40px;text-align:center;color:#9aa3b2}'
    . '</style><div class="wrap">'
    . '<h1>Malware scan report</h1>'
    . '<div class="meta">' . htmlspecialchars($ROOT) . ' &middot; ' . htmlspecialchars($meta['generated_at'])
    . ' &middot; WordPress: ' . htmlspecialchars($meta['wordpress'])
    . ' &middot; ' . number_format($stats['files']) . ' files read in ' . $meta['duration_sec'] . 's</div>'
    . '<div class="cards">'
    . '<div class="card"><b style="color:#ff8f96">' . $counts['critical'] . '</b>Critical</div>'
    . '<div class="card"><b style="color:#ffb870">' . $counts['high'] . '</b>High</div>'
    . '<div class="card"><b style="color:#e8dc7a">' . $counts['medium'] . '</b>Medium</div>'
    . '<div class="card"><b style="color:#8fb8e8">' . $counts['low'] . '</b>Low</div>'
    . '</div>'
    . ($findings
        ? '<table><tr><th>Severity</th><th>File</th><th>What it is</th><th>Evidence</th><th>Modified</th></tr>' . $rows . '</table>'
        : '<div class="empty">Nothing flagged. That is good, but it is not proof the site is clean - also check the database with db-scan.php.</div>')
    . '</div>';

$htmlPath = $OUT . '.html';
@file_put_contents($htmlPath, $html);

// Console / browser summary
if ($IS_CLI) {
    echo "\n";
    echo "Root        : $ROOT\n";
    echo "WordPress   : " . $meta['wordpress'] . "\n";
    echo "Files read  : " . number_format($stats['files']) . " (" . round($stats['bytes'] / 1048576, 1) . " MB) in " . $meta['duration_sec'] . "s\n";
    echo "Findings    : {$counts['critical']} critical, {$counts['high']} high, {$counts['medium']} medium, {$counts['low']} low\n";
    echo "Reports     : $jsonPath\n";
    echo "              $htmlPath\n\n";
    $shown = 0;
    foreach ($findings as $f) {
        if ($f['severity'] !== 'critical' && $f['severity'] !== 'high') {
            continue;
        }
        if ($shown++ >= 60) {
            echo "  ... plus more, see the report files\n";
            break;
        }
        printf("  [%-8s] %s%s\n             %s\n", strtoupper($f['severity']), $f['path'], $f['line'] ? ':' . $f['line'] : '', $f['desc']);
    }
    echo "\nNothing was changed. Review the report, then use quarantine.php to move confirmed files out.\n\n";
} else {
    echo $html;
    echo '<div class="wrap"><p class="meta">Reports also written to <code>' . htmlspecialchars($jsonPath) . '</code> and <code>' . htmlspecialchars($htmlPath) . '</code>. Delete scan.php from the server when you are done.</p></div>';
}
