<?php
/**
 * =============================================================================
 *  CLEANER  --  quarantine whole malicious files, or strip injected blocks
 * =============================================================================
 *  Works from the JSON report produced by scan.php. It has two modes:
 *
 *    --mode=quarantine   The whole file is malware (a dropped shell, a PHP file
 *                        in an uploads folder, a foreign file inside wp-admin).
 *                        The file is MOVED to the quarantine folder, never
 *                        deleted, so you can put it back if something breaks.
 *
 *    --mode=strip        The file is one of yours but code was injected into it
 *                        (theme functions.php, index.php, wp-config.php). A full
 *                        copy goes to quarantine first, then only the injected
 *                        block is removed and the rest of the file is left alone.
 *
 *  NOTHING HAPPENS WITHOUT --confirm. Without it you get a dry run that prints
 *  exactly what it would do.
 *
 *      # see the plan
 *      php clean.php --root=/home/uXXX/domains/blazerealty.ae/public_html \
 *                    --report=/home/uXXX/scan-report.json --mode=quarantine
 *
 *      # do it
 *      php clean.php --root=... --report=... --mode=quarantine --confirm
 *
 *  Every action is logged and a restore script is written into the quarantine
 *  folder, so the whole run can be undone with one command.
 * =============================================================================
 */

@set_time_limit(0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

if (PHP_SAPI !== 'cli') {
    header('HTTP/1.1 404 Not Found');
    exit("This tool only runs from the command line.\n");
}

function opt($name, $default = null)
{
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

$ROOT    = rtrim((string) opt('root', ''), '/');
$REPORT  = (string) opt('report', '');
$MODE    = (string) opt('mode', 'quarantine');
$CONFIRM = (bool) opt('confirm', false);
$QDIR    = rtrim((string) opt('quarantine', ''), '/');
$ONLY    = opt('only', null);   // comma separated rule ids
$SEV     = (string) opt('severity', 'critical');  // critical | critical,high

if ($ROOT === '' || !is_dir($ROOT)) {
    exit("Pass --root=/full/path/to/public_html\n");
}
if ($REPORT === '' || !is_file($REPORT)) {
    exit("Pass --report=/full/path/to/scan-report.json (produced by scan.php)\n");
}
if (!in_array($MODE, array('quarantine', 'strip'), true)) {
    exit("--mode must be quarantine or strip\n");
}
if ($QDIR === '') {
    // Default: a sibling of the web root, so it is never reachable over HTTP.
    $QDIR = dirname($ROOT) . '/.quarantine-' . date('Ymd-His');
}

$data = json_decode((string) file_get_contents($REPORT), true);
if (!isset($data['findings'])) {
    exit("That does not look like a scan.php report.\n");
}

$wantSev = array_map('trim', explode(',', $SEV));
$wantRules = $ONLY ? array_map('trim', explode(',', (string) $ONLY)) : null;

// -----------------------------------------------------------------------------
// Which rules mean "the entire file is malware"
// -----------------------------------------------------------------------------

$WHOLE_FILE_RULES = array(
    'php_in_upload_dir', 'double_extension', 'hidden_php', 'php_in_asset',
    'wp_core_foreign', 'known_shell', 'random_filename', 'shell_auth_gate',
    'superglobal_callable', 'php_input_exec', 'shell_from_request',
    'obfuscator_header', 'remote_fetch_exec',
);

// Rules where the file is legitimate and only a block was injected
$STRIP_RULES = array(
    'eval_decoded', 'eval_var', 'assert_var', 'gz_decode_chain', 'preg_replace_e',
    'split_string_eval', 'chr_chain', 'hex_escape_blob', 'callable_obfuscated',
    'rot13_decode', 'dynamic_globals_call', 'wpconfig_prefix', 'wpconfig_suffix',
    'js_fromcharcode', 'js_unescape_write', 'js_eval_atob', 'js_hidden_iframe',
    'hidden_include', 'user_agent_cloak', 'referrer_redirect',
);

// Never touch these automatically - they need a WordPress core reinstall instead
$MANUAL_ONLY = array(
    'wp_core_modified', 'wp_core_missing',
    'htaccess_prepend', 'htaccess_external_redirect', 'htaccess_php_value', 'htaccess_php_handler',
    'mu_plugin',
);

// -----------------------------------------------------------------------------
// Shared payload stripper
// -----------------------------------------------------------------------------

/**
 * Remove injected blocks from a file's source.
 * Returns array($newSource, $listOfWhatWasRemoved).
 */
function strip_payload($src)
{
    $removed = array();
    $malRe = '~\\beval\\s*\\(|\\bassert\\s*\\(\\s*\\$|gzinflate\\s*\\(|gzuncompress\\s*\\(|base64_decode\\s*\\(|str_rot13\\s*\\(|create_function\\s*\\(|\\$_(?:POST|GET|REQUEST|COOKIE)\\s*\\[[^\\]]*\\]\\s*\\(~i';

    // Pattern A: compact PHP blocks that contain nothing but obfuscated code.
    $guard = 0;
    while ($guard++ < 50) {
        if (!preg_match('~<\\?php(?:(?!<\\?php).)*?\\?' . '>~s', $src, $m, PREG_OFFSET_CAPTURE)) {
            break;
        }
        $found = false;
        $offset = 0;
        while (preg_match('~<\\?php(?:(?!<\\?php).)*?\\?' . '>~s', $src, $m, PREG_OFFSET_CAPTURE, $offset)) {
            $block = $m[0][0];
            $at    = $m[0][1];
            $offset = $at + strlen($block);
            if (strlen($block) > 20000 || !preg_match($malRe, $block)) {
                continue;
            }
            $src = substr_replace($src, '', $at, strlen($block));
            $removed[] = 'PHP block at byte ' . $at . ' (' . strlen($block) . ' bytes)';
            $found = true;
            break;
        }
        if (!$found) {
            break;
        }
    }

    // Pattern B: junk before the very first opening tag.
    if (preg_match('~^(.*?)<\\?php~s', $src, $m) && trim($m[1]) !== '' && strlen($m[1]) < 8000) {
        if (preg_match('~eval|base64|gzinflate|<script|<iframe~i', $m[1])) {
            $src = substr($src, strlen($m[1]));
            $removed[] = 'junk before the opening tag (' . strlen($m[1]) . ' bytes)';
        }
    }

    // Pattern C: junk after the final closing tag.
    if (preg_match('~\\?' . '>(?!.*\\?' . '>)(.+)$~s', $src, $m) && trim($m[1]) !== '' && strlen($m[1]) < 8000) {
        if (preg_match('~eval|base64|gzinflate|<script|<iframe~i', $m[1])) {
            $src = substr($src, 0, strlen($src) - strlen($m[1]));
            $removed[] = 'junk after the closing tag (' . strlen($m[1]) . ' bytes)';
        }
    }

    // Pattern D: injected script / iframe tags in html and js.
    $before = $src;
    $src = preg_replace('~<script[^>]*>\\s*(?:eval\\s*\\(\\s*(?:window\\.)?atob|document\\.write\\s*\\(\\s*unescape|String\\.fromCharCode\\s*\\(\\s*(?:\\d{1,3}\\s*,\\s*){15,}).*?</script>~is', '', $src);
    $src = preg_replace('~<iframe[^>]*(?:width\\s*=\\s*[\'"]?[01][\'"]?|style\\s*=\\s*[\'"][^\'"]*display\\s*:\\s*none)[^>]*>.*?</iframe>~is', '', $src);
    if ($src !== $before) {
        $removed[] = 'injected script/iframe tags';
    }

    // Standalone JS statements, for .js files with no surrounding tags.
    $before = $src;
    $src = preg_replace('~^\\s*(?:eval\\s*\\(\\s*(?:window\\.)?atob|document\\.write\\s*\\(\\s*unescape)\\s*\\([^\\n]*\\);?\\s*$~im', '', $src);
    if ($src !== $before) {
        $removed[] = 'injected JavaScript statements';
    }

    // A stray blank line before the opening tag makes WordPress emit output too
    // early and then complain that headers were already sent. Trim it.
    if ($removed && preg_match('~^\s+<\?(?:php|=)~', $src)) {
        $src = ltrim($src);
    }

    return array($src, $removed);
}

/**
 * True when the file carries a serious execution signature and nothing that
 * looks like real application code. Such a file exists only to run the payload,
 * so it should be removed whole rather than edited.
 */
function file_is_all_payload($src, $reasons)
{
    $fatal = array('eval_decoded', 'eval_var', 'gz_decode_chain', 'superglobal_callable',
        'php_input_exec', 'shell_from_request', 'assert_var', 'preg_replace_e',
        'known_shell', 'obfuscator_header', 'remote_fetch_exec', 'callable_obfuscated');
    if (!array_intersect($reasons, $fatal)) {
        return false;
    }
    if (strlen($src) > 65536) {
        return false;
    }
    $body = preg_replace('~<\?php|<\?=|\?' . '>~', '', $src);
    $body = preg_replace('~/\*.*?\*/~s', '', $body);
    $body = preg_replace('~^\s*(?://|#).*$~m', '', $body);
    $legit = preg_match_all('~\b(?:function\s+[a-zA-Z_]\w*\s*\(|class\s+[A-Za-z_]\w*|interface\s+[A-Za-z_]\w*'
        . '|namespace\s+[A-Za-z_]|use\s+[A-Za-z_]\w*\\\\|add_action\s*\(|add_filter\s*\(|add_shortcode\s*\('
        . '|require(?:_once)?\s*[\(\'"$]|include(?:_once)?\s*[\(\'"$]|register_activation_hook'
        . '|wp_enqueue_|new\s+[A-Z]\w*|echo\s+[\'"]<)~', $body);
    return $legit === 0;
}

/**
 * True when what is left of a file after stripping carries no real content,
 * which means the file existed only to hold the payload.
 */
function is_empty_residue($src)
{
    $r = preg_replace('~<\\?php|<\\?=|\\?' . '>~', '', $src);
    $r = preg_replace('~/\\*.*?\\*/~s', '', $r);
    $r = preg_replace('~^\\s*(?://|#).*$~m', '', $r);
    return trim($r) === '';
}

/**
 * Print the files that must be handled by a person, grouped by what they need.
 */
function print_manual($manual)
{
    if (!$manual) {
        return;
    }
    $groups = array(
        'core' => array('label' => 'Reinstall WordPress core over these', 'paths' => array(),
            'how' => "  Download the exact same WordPress version from wordpress.org, then\n"
                   . "  overwrite wp-admin/, wp-includes/ and the root wp-*.php files.\n"
                   . "  Leave wp-config.php and wp-content/ untouched."),
        'htaccess' => array('label' => 'Rewrite these by hand', 'paths' => array(),
            'how' => "  Do not just delete .htaccess - permalinks break. Open it, delete the\n"
                   . "  auto_prepend_file lines and any redirect pointing at a domain that is\n"
                   . "  not yours, and keep the block between # BEGIN WordPress and\n"
                   . "  # END WordPress. If you are unsure, replace the file with the default\n"
                   . "  WordPress rules and re-save Settings > Permalinks."),
        'mu' => array('label' => 'Check every must-use plugin', 'paths' => array(),
            'how' => "  Files in wp-content/mu-plugins/ run on every request and cannot be\n"
                   . "  disabled from wp-admin. Open each one. Delete anything you did not\n"
                   . "  install yourself - especially anything calling wp_insert_user or\n"
                   . "  setting a role of administrator."),
    );

    foreach ($manual as $path => $rules) {
        $keys = array_keys($rules);
        $bucket = 'core';
        foreach ($keys as $k) {
            if (strpos($k, 'htaccess') === 0) {
                $bucket = 'htaccess';
                break;
            }
            if ($k === 'mu_plugin') {
                $bucket = 'mu';
                break;
            }
        }
        $groups[$bucket]['paths'][] = $path;
    }

    echo "\nStill to do by hand:\n";
    foreach ($groups as $g) {
        if (!$g['paths']) {
            continue;
        }
        echo "\n  " . $g['label'] . ":\n";
        foreach ($g['paths'] as $path) {
            echo "    - $path\n";
        }
        echo $g['how'] . "\n";
    }
    echo "\n";
}

// -----------------------------------------------------------------------------
// Build the work list
// -----------------------------------------------------------------------------

$targets = array();   // path => list of findings
$manual  = array();

// First pass: any path with a manual-only finding is handled by hand, whole.
foreach ($data['findings'] as $f) {
    if (in_array($f['rule'], $MANUAL_ONLY, true)) {
        $manual[$f['path']][$f['rule']] = $f['desc'];
    }
}

foreach ($data['findings'] as $f) {
    if (!in_array($f['severity'], $wantSev, true)) {
        continue;
    }
    if ($wantRules && !in_array($f['rule'], $wantRules, true)) {
        continue;
    }
    if (isset($manual[$f['path']])) {
        continue;
    }
    // Collect every actionable rule. Which action a file actually gets is
    // decided per file further down, from what is left after stripping it.
    if (!in_array($f['rule'], $WHOLE_FILE_RULES, true)
        && !in_array($f['rule'], $STRIP_RULES, true)) {
        continue;
    }
    $targets[$f['path']][] = $f;
}

if (!$targets) {
    echo "\nNothing matches mode=$MODE severity=$SEV in that report.\n";
    print_manual($manual);
    exit(0);
}

// -----------------------------------------------------------------------------
// Safety rails
// -----------------------------------------------------------------------------

$realRoot = realpath($ROOT);

/** Refuse to act on anything that escapes the web root. */
function inside_root($abs, $realRoot)
{
    $r = realpath($abs);
    if ($r === false) {
        return false;
    }
    return strpos($r, $realRoot . DIRECTORY_SEPARATOR) === 0;
}

$PROTECTED = array('wp-config.php', '.htaccess');   // handled, but always backed up and reported loudly

$log = array();
$acted = 0;
$skipped = 0;

echo "\n";
echo "Mode       : $MODE" . ($CONFIRM ? '' : '   (DRY RUN - nothing will change)') . "\n";
echo "Root       : $ROOT\n";
echo "Quarantine : $QDIR\n";
echo "Severity   : $SEV\n";
echo "Files       : " . count($targets) . "\n\n";

if ($CONFIRM && !is_dir($QDIR)) {
    @mkdir($QDIR, 0700, true);
    @file_put_contents($QDIR . '/.htaccess', "Require all denied\nDeny from all\n");
    @file_put_contents($QDIR . '/index.php', "<?php // nothing here\n");
}

foreach ($targets as $rel => $hits) {
    $abs = $ROOT . '/' . $rel;

    if (!is_file($abs)) {
        echo "  skip (gone)      $rel\n";
        $skipped++;
        continue;
    }
    if (!inside_root($abs, $realRoot)) {
        echo "  skip (outside)   $rel\n";
        $skipped++;
        continue;
    }

    $reasons = array();
    foreach ($hits as $h) {
        $reasons[] = $h['rule'];
    }
    $reasons = array_values(array_unique($reasons));
    $isProtected = in_array(basename($rel), $PROTECTED, true);

    // ---- decide what this file actually needs ------------------------------

    $wholeFile = (bool) array_intersect($reasons, $WHOLE_FILE_RULES);
    $src = (string) @file_get_contents($abs);
    list($stripped, $removed) = strip_payload($src);

    // A file with nothing left once the payload is gone was only ever a
    // container for it, so remove the whole thing instead of emptying it.
    if (!$wholeFile && $removed && is_empty_residue($stripped)) {
        $wholeFile = true;
        $reasons[] = 'payload_only_file';
    }

    // Same conclusion for a file the stripper cannot cut - no closing tag, say -
    // that holds an execution signature and no real application code.
    if (!$wholeFile && file_is_all_payload($src, $reasons)) {
        $wholeFile = true;
        $reasons[] = 'payload_only_file';
    }

    $action = $wholeFile ? 'quarantine' : 'strip';

    if ($action !== $MODE) {
        echo '  skip (run --mode=' . $action . ')  ' . $rel . "\n";
        $skipped++;
        continue;
    }

    // ---- always keep a full copy before touching anything ------------------

    if ($CONFIRM) {
        $backupPath = $QDIR . '/files/' . $rel;
        @mkdir(dirname($backupPath), 0700, true);
        if (!@copy($abs, $backupPath)) {
            echo "  FAIL backup      $rel  (check permissions)\n";
            $skipped++;
            continue;
        }
    }

    // ---- whole file is malware ---------------------------------------------

    if ($action === 'quarantine') {
        echo ($CONFIRM ? '  removed          ' : '  would remove     ') . $rel
            . '  [' . implode(',', $reasons) . "]\n";
        if ($CONFIRM) {
            if (@unlink($abs)) {
                $log[] = array('action' => 'quarantine', 'path' => $rel, 'rules' => $reasons);
                $acted++;
            } else {
                echo "  FAIL delete      $rel  (check permissions)\n";
                $skipped++;
            }
        } else {
            $acted++;
        }
        continue;
    }

    // ---- your file, injected block removed ---------------------------------

    if (!$removed || $stripped === $src) {
        echo '  skip (no clean cut) ' . $rel . '  [' . implode(',', $reasons) . "]\n";
        echo "                      edit this one by hand; the scan report gives the line number\n";
        $skipped++;
        continue;
    }

    // Never write back something that no longer parses.
    $parses = true;
    if (preg_match('~\.(?:php[3-8]?|phtml|inc)$~i', $rel)) {
        $tmp = tempnam(sys_get_temp_dir(), 'clean');
        file_put_contents($tmp, $stripped);
        $o = array();
        $rc = 0;
        @exec(escapeshellcmd(PHP_BINARY) . ' -l ' . escapeshellarg($tmp) . ' 2>&1', $o, $rc);
        $parses = ($rc === 0);
        @unlink($tmp);
    }
    if (!$parses) {
        echo '  skip (would break)  ' . $rel . " - the stripped file no longer parses\n";
        $skipped++;
        continue;
    }

    echo ($CONFIRM ? '  cleaned          ' : '  would clean      ') . $rel
        . ($isProtected ? '   *** PROTECTED FILE - read the diff yourself ***' : '') . "\n";
    foreach ($removed as $r) {
        echo "                     - $r\n";
    }

    if ($CONFIRM) {
        if (@file_put_contents($abs, $stripped) !== false) {
            $log[] = array('action' => 'strip', 'path' => $rel, 'removed' => $removed, 'rules' => $reasons);
            $acted++;
        } else {
            echo "  FAIL write       $rel  (check permissions)\n";
            $skipped++;
        }
    } else {
        $acted++;
    }
}

// -----------------------------------------------------------------------------
// Manifest + restore script
// -----------------------------------------------------------------------------

if ($CONFIRM && $log) {
    @file_put_contents($QDIR . '/manifest.json', json_encode(array(
        'root' => $ROOT, 'mode' => $MODE, 'when' => date('c'), 'actions' => $log,
    ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    $restore = "#!/bin/sh\n# Undo the clean-up run of " . date('c') . "\n"
        . "# Every original file was copied to files/ before anything changed.\n"
        . "set -e\n"
        . 'ROOT=' . escapeshellarg($ROOT) . "\n"
        . 'HERE=$(cd "$(dirname "$0")" && pwd)' . "\n\n"
        . 'cp -a "$HERE/files/." "$ROOT/"' . "\n"
        . 'echo "All files restored to $ROOT"' . "\n";
    @file_put_contents($QDIR . '/restore.sh', $restore);
    @chmod($QDIR . '/restore.sh', 0700);
}

echo "\n";
echo ($CONFIRM ? "Done. " : "Dry run. ") . "$acted file(s) " . ($CONFIRM ? 'handled' : 'would be handled') . ", $skipped skipped.\n";
if ($CONFIRM && $log) {
    echo "Originals  : $QDIR/files/\n";
    echo "Undo       : sh $QDIR/restore.sh\n";
}
if (!$CONFIRM) {
    echo "Add --confirm to actually apply this.\n";
}
print_manual($manual);
echo "\n";
