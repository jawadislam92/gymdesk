<?php
/**
 * =============================================================================
 *  WORDPRESS DATABASE MALWARE SCANNER  --  READ ONLY
 * =============================================================================
 *  Finds injected admin users, hijacked site URLs, poisoned wp_options,
 *  script/iframe injections in posts, malicious cron jobs and foreign tables.
 *
 *  It only runs SELECT queries. It changes nothing. When it finds something it
 *  writes the matching DELETE/UPDATE statements to a .sql file for YOU to read
 *  and run yourself - it never executes them.
 *
 *  Database credentials are read straight out of wp-config.php, so you never
 *  type a password anywhere.
 *
 *      php db-scan.php --config=/home/uXXXXXX/domains/blazerealty.ae/public_html/wp-config.php \
 *                      --out=/home/uXXXXXX/db-report \
 *                      --since=2026-06-01
 * =============================================================================
 */

@set_time_limit(0);
@ini_set('memory_limit', '512M');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

$IS_CLI = (PHP_SAPI === 'cli');
$BROWSER_TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

if (!$IS_CLI) {
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    if ($BROWSER_TOKEN === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING'
        || !hash_equals($BROWSER_TOKEN, isset($_GET['token']) ? $_GET['token'] : '')) {
        header('HTTP/1.1 404 Not Found');
        exit('Not Found');
    }
}

function opt($name, $default = null)
{
    if (PHP_SAPI === 'cli') {
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

// -----------------------------------------------------------------------------
// Locate and parse wp-config.php
// -----------------------------------------------------------------------------

$cfgPath = (string) opt('config', '');
if ($cfgPath === '') {
    foreach (array('wp-config.php', '../wp-config.php', './wp-config.php') as $guess) {
        $try = (PHP_SAPI === 'cli' ? getcwd() : dirname(__FILE__)) . '/' . $guess;
        if (is_file($try)) {
            $cfgPath = realpath($try);
            break;
        }
    }
}
if (!$cfgPath || !is_file($cfgPath)) {
    exit("wp-config.php not found. Pass it with --config=/full/path/wp-config.php\n");
}

$cfgSrc = (string) file_get_contents($cfgPath);
$conf = array();
foreach (array('DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_CHARSET') as $k) {
    if (preg_match('~define\s*\(\s*[\'"]' . $k . '[\'"]\s*,\s*[\'"]((?:[^\'"\\\\]|\\\\.)*)[\'"]~', $cfgSrc, $m)) {
        $conf[$k] = stripcslashes($m[1]);
    }
}
$prefix = 'wp_';
if (preg_match('~\$table_prefix\s*=\s*[\'"]([^\'"]+)[\'"]~', $cfgSrc, $m)) {
    $prefix = $m[1];
}
if (!isset($conf['DB_NAME'], $conf['DB_USER'], $conf['DB_HOST'])) {
    exit("Could not read DB credentials from $cfgPath\n");
}

$OUT   = (string) opt('out', dirname($cfgPath) . '/db-report');
$SINCE = opt('since', null);
$SINCE_DATE = $SINCE ? date('Y-m-d H:i:s', strtotime($SINCE)) : null;

// -----------------------------------------------------------------------------
// Connect
// -----------------------------------------------------------------------------

$host = $conf['DB_HOST'];
$port = 3306;
$socket = null;
if (strpos($host, ':') !== false) {
    list($host, $tail) = explode(':', $host, 2);
    if (ctype_digit($tail)) {
        $port = (int) $tail;
    } else {
        $socket = $tail;
    }
}

$db = @new mysqli($host, $conf['DB_USER'], isset($conf['DB_PASSWORD']) ? $conf['DB_PASSWORD'] : '', $conf['DB_NAME'], $port, $socket);
if ($db->connect_errno) {
    exit('Database connection failed: ' . $db->connect_error . "\n");
}
@$db->set_charset(isset($conf['DB_CHARSET']) && $conf['DB_CHARSET'] ? $conf['DB_CHARSET'] : 'utf8mb4');

$findings = array();
$fixes    = array();

function note($sev, $rule, $what, $detail, $evidence = '')
{
    $GLOBALS['findings'][] = array(
        'severity' => $sev, 'rule' => $rule, 'what' => $what,
        'detail' => $detail, 'evidence' => $evidence,
    );
}

function fix($comment, $sql)
{
    $GLOBALS['fixes'][] = "-- $comment\n$sql";
}

function q($sql)
{
    $r = $GLOBALS['db']->query($sql);
    if (!$r) {
        return array();
    }
    $rows = array();
    while ($row = $r->fetch_assoc()) {
        $rows[] = $row;
    }
    $r->free();
    return $rows;
}

function trim_val($v, $n = 160)
{
    $v = preg_replace('~\s+~', ' ', (string) $v);
    return strlen($v) > $n ? substr($v, 0, $n) . ' ...' : $v;
}

$T = function ($name) use ($prefix) {
    return '`' . str_replace('`', '', $prefix . $name) . '`';
};

// -----------------------------------------------------------------------------
// 1. Foreign tables
// -----------------------------------------------------------------------------

$coreTables = array('posts','postmeta','comments','commentmeta','terms','termmeta','term_taxonomy',
    'term_relationships','users','usermeta','options','links','blogs','blog_versions','site',
    'sitemeta','registration_log','signups','blogmeta');
$allTables = array();
foreach (q('SHOW TABLES') as $row) {
    $allTables[] = array_values($row)[0];
}
foreach ($allTables as $t) {
    if (strpos($t, $prefix) !== 0) {
        note('medium', 'foreign_table', $t,
            'Table does not use the site prefix "' . $prefix . '". It may belong to another app, or an attacker may have created it.');
        continue;
    }
    $bare = substr($t, strlen($prefix));
    // multisite tables look like 2_posts
    $bare = preg_replace('~^\d+_~', '', $bare);
    if (!in_array($bare, $coreTables, true) && preg_match('~^[a-z0-9]{6,}$~', $bare)) {
        note('high', 'suspicious_table', $t,
            'Randomly named table using the site prefix - attackers often stage data in one of these.');
    }
}

// -----------------------------------------------------------------------------
// 2. Administrator accounts
// -----------------------------------------------------------------------------

$capsKey = $prefix . 'capabilities';
$admins = q("SELECT u.ID, u.user_login, u.user_email, u.user_registered, u.user_url, u.user_status, m.meta_value AS caps
             FROM " . $T('users') . " u
             JOIN " . $T('usermeta') . " m ON m.user_id = u.ID AND m.meta_key = '" . $db->real_escape_string($capsKey) . "'
             WHERE m.meta_value LIKE '%administrator%'
             ORDER BY u.user_registered DESC");

foreach ($admins as $a) {
    $flags = array();
    if ($SINCE_DATE && $a['user_registered'] >= $SINCE_DATE) {
        $flags[] = 'registered after ' . substr($SINCE_DATE, 0, 10);
    }
    if (preg_match('~^[a-z0-9]{8,}$~', $a['user_login']) && !preg_match('~admin|blaze|realty~i', $a['user_login'])) {
        $flags[] = 'random-looking username';
    }
    if (preg_match('~@(?:mail\.ru|yandex|bk\.ru|list\.ru|inbox\.ru|rambler|protonmail|tempmail|guerrillamail|10minutemail)~i', $a['user_email'])) {
        $flags[] = 'throwaway or foreign mail provider';
    }
    if ($a['user_url'] && !preg_match('~blazerealty~i', $a['user_url'])) {
        $flags[] = 'external website URL set';
    }
    $sev = $flags ? 'critical' : 'low';
    note($sev, 'admin_user', $a['user_login'],
        'Administrator account (ID ' . $a['ID'] . ', registered ' . $a['user_registered'] . ')'
        . ($flags ? ' -- ' . implode('; ', $flags) : ' -- confirm you recognise this person'),
        $a['user_email']);
    if ($flags) {
        fix('Remove administrator "' . $a['user_login'] . '" (ID ' . $a['ID'] . ', ' . $a['user_email'] . ')',
            'DELETE FROM ' . $T('usermeta') . ' WHERE user_id = ' . (int) $a['ID'] . ";\n"
            . 'DELETE FROM ' . $T('users') . ' WHERE ID = ' . (int) $a['ID'] . ';');
    }
}
note('low', 'admin_count', 'total', count($admins) . ' administrator account(s) exist. Anyone you do not recognise must go.');

// Users holding admin capability through a second, non-standard meta key
$oddCaps = q("SELECT user_id, meta_key FROM " . $T('usermeta') . "
              WHERE meta_value LIKE '%administrator%' AND meta_key <> '" . $db->real_escape_string($capsKey) . "'");
foreach ($oddCaps as $o) {
    note('high', 'odd_caps_key', 'user ' . $o['user_id'],
        'Administrator capability stored under an unexpected meta key "' . $o['meta_key'] . '" - a way to hide a privileged account.');
}

// -----------------------------------------------------------------------------
// 3. Site URL hijack
// -----------------------------------------------------------------------------

$urls = q("SELECT option_name, option_value FROM " . $T('options') . " WHERE option_name IN ('siteurl','home')");
foreach ($urls as $u) {
    note(preg_match('~blazerealty~i', $u['option_value']) ? 'low' : 'critical', 'site_url', $u['option_name'],
        'Value is ' . $u['option_value'] . ' -- if this is not your own domain the site has been hijacked.',
        $u['option_value']);
}

// Open registration + default role
$reg = q("SELECT option_name, option_value FROM " . $T('options') . " WHERE option_name IN ('users_can_register','default_role')");
$regMap = array();
foreach ($reg as $r) {
    $regMap[$r['option_name']] = $r['option_value'];
}
if (isset($regMap['users_can_register']) && $regMap['users_can_register'] === '1') {
    note('high', 'open_registration', 'users_can_register',
        'Anyone can register on the site. Turn this off unless you need it.', '1');
    fix('Close public registration',
        "UPDATE " . $T('options') . " SET option_value = '0' WHERE option_name = 'users_can_register';");
}
if (isset($regMap['default_role']) && $regMap['default_role'] !== 'subscriber') {
    note('critical', 'default_role', 'default_role',
        'New registrations are given the "' . $regMap['default_role'] . '" role instead of subscriber.', $regMap['default_role']);
    fix('Reset the default role for new users',
        "UPDATE " . $T('options') . " SET option_value = 'subscriber' WHERE option_name = 'default_role';");
}

// -----------------------------------------------------------------------------
// 4. Poisoned options
// -----------------------------------------------------------------------------

$optPatterns = array(
    'eval('            => 'critical',
    'base64_decode'    => 'critical',
    'gzinflate'        => 'critical',
    'str_rot13'        => 'high',
    '<script'          => 'high',
    '<iframe'          => 'high',
    'shell_exec'       => 'critical',
    'create_function'  => 'high',
    'document.write'   => 'high',
    'String.fromCharCode' => 'high',
);
foreach ($optPatterns as $needle => $sev) {
    $rows = q("SELECT option_id, option_name, autoload, option_value FROM " . $T('options') . "
               WHERE option_value LIKE '%" . $db->real_escape_string($needle) . "%' LIMIT 40");
    foreach ($rows as $r) {
        note($sev, 'option_payload', $r['option_name'],
            'wp_options row contains "' . $needle . '"' . ($r['autoload'] === 'yes' ? ' and loads on every page request' : ''),
            trim_val($r['option_value']));
        fix('Review then remove option "' . $r['option_name'] . '" (contains ' . $needle . ')',
            'DELETE FROM ' . $T('options') . " WHERE option_id = " . (int) $r['option_id'] . ';');
    }
}

// Oversized autoloaded options
foreach (q("SELECT option_name, LENGTH(option_value) AS len FROM " . $T('options') . "
            WHERE autoload = 'yes' AND LENGTH(option_value) > 200000 ORDER BY len DESC LIMIT 10") as $r) {
    note('medium', 'huge_autoload', $r['option_name'],
        'Autoloaded option is ' . number_format($r['len'] / 1024, 1) . ' KB - slows every page and can hide a payload.',
        $r['len'] . ' bytes');
}

// -----------------------------------------------------------------------------
// 5. Cron
// -----------------------------------------------------------------------------

$cronRow = q("SELECT option_value FROM " . $T('options') . " WHERE option_name = 'cron' LIMIT 1");
if ($cronRow) {
    $cron = @unserialize($cronRow[0]['option_value']);
    if (is_array($cron)) {
        $knownPrefixes = array('wp_', 'do_pings', 'publish_future_post', 'akismet', 'delete_expired',
            'recovery_mode', 'wpseo', 'woocommerce', 'action_scheduler', 'jetpack', 'elementor', 'rank_math');
        foreach ($cron as $ts => $hooks) {
            if (!is_array($hooks)) {
                continue;
            }
            foreach (array_keys($hooks) as $hook) {
                $known = false;
                foreach ($knownPrefixes as $p) {
                    if (stripos($hook, $p) === 0) {
                        $known = true;
                        break;
                    }
                }
                if (!$known && preg_match('~^[a-z0-9_]{6,}$~i', $hook)) {
                    note('medium', 'cron_hook', $hook,
                        'Scheduled task with an unrecognised hook name - malware uses cron to reinfect after a cleanup.',
                        is_numeric($ts) ? date('Y-m-d H:i', $ts) : (string) $ts);
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// 6. Injected content in posts
// -----------------------------------------------------------------------------

$postPatterns = array(
    '<script'   => 'high',
    '<iframe'   => 'high',
    'eval('     => 'critical',
    'base64_decode' => 'critical',
    'display:none' => 'medium',
    'viagra'    => 'high',
    'casino'    => 'high',
    'cialis'    => 'high',
    'payday loan' => 'high',
);
foreach ($postPatterns as $needle => $sev) {
    $rows = q("SELECT ID, post_title, post_type, post_status, post_modified, post_author
               FROM " . $T('posts') . "
               WHERE post_content LIKE '%" . $db->real_escape_string($needle) . "%'
               ORDER BY post_modified DESC LIMIT 25");
    foreach ($rows as $r) {
        note($sev, 'post_payload', '#' . $r['ID'] . ' ' . trim_val($r['post_title'], 60),
            ucfirst($r['post_type']) . ' (' . $r['post_status'] . ') contains "' . $needle . '", last modified ' . $r['post_modified'],
            'author ' . $r['post_author']);
    }
}

// Spam posts created in bulk
if ($SINCE_DATE) {
    $bulk = q("SELECT DATE(post_date) d, post_type, COUNT(*) c FROM " . $T('posts') . "
               WHERE post_date >= '" . $db->real_escape_string($SINCE_DATE) . "'
               GROUP BY d, post_type HAVING c > 30 ORDER BY c DESC LIMIT 15");
    foreach ($bulk as $b) {
        note('high', 'bulk_posts', $b['d'],
            $b['c'] . ' ' . $b['post_type'] . ' entries created on one day - that pattern means automated spam injection.',
            $b['c'] . ' rows');
    }
}

// -----------------------------------------------------------------------------
// 7. Meta tables
// -----------------------------------------------------------------------------

foreach (array('postmeta' => 'meta_id', 'usermeta' => 'umeta_id', 'commentmeta' => 'meta_id') as $tbl => $pk) {
    if (!in_array($prefix . $tbl, $allTables, true)) {
        continue;
    }
    foreach (array('eval(', 'base64_decode', 'gzinflate', '<script') as $needle) {
        $rows = q("SELECT $pk, meta_key FROM " . $T($tbl) . "
                   WHERE meta_value LIKE '%" . $db->real_escape_string($needle) . "%' LIMIT 15");
        foreach ($rows as $r) {
            note('high', 'meta_payload', $prefix . $tbl . '.' . $r['meta_key'],
                'Row ' . $r[$pk] . ' in ' . $prefix . $tbl . ' contains "' . $needle . '"', $needle);
        }
    }
}

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------

$order = array('critical' => 0, 'high' => 1, 'medium' => 2, 'low' => 3);
usort($findings, function ($a, $b) use ($order) {
    return $order[$a['severity']] - $order[$b['severity']];
});

$counts = array('critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0);
foreach ($findings as $f) {
    $counts[$f['severity']]++;
}

@file_put_contents($OUT . '.json', json_encode(array(
    'database'  => $conf['DB_NAME'],
    'prefix'    => $prefix,
    'generated' => date('c'),
    'counts'    => $counts,
    'findings'  => $findings,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

if ($fixes) {
    $sqlFile = "-- Suggested clean-up statements for " . $conf['DB_NAME'] . "\n"
        . "-- Generated " . date('c') . "\n"
        . "-- READ EVERY LINE BEFORE RUNNING. Take a database backup first.\n"
        . "-- Nothing here has been executed.\n\n"
        . implode("\n\n", $fixes) . "\n";
    @file_put_contents($OUT . '.sql', $sqlFile);
}

$out = "\n";
$out .= "Database   : " . $conf['DB_NAME'] . "  (prefix " . $prefix . ")\n";
$out .= "Findings   : {$counts['critical']} critical, {$counts['high']} high, {$counts['medium']} medium, {$counts['low']} low\n";
$out .= "Report     : " . $OUT . ".json\n";
if ($fixes) {
    $out .= "Fix script : " . $OUT . ".sql   (review it, nothing was executed)\n";
}
$out .= "\n";
foreach ($findings as $f) {
    $out .= sprintf("  [%-8s] %s\n             %s\n", strtoupper($f['severity']), $f['what'], $f['detail']);
    if ($f['evidence'] !== '') {
        $out .= "             evidence: " . $f['evidence'] . "\n";
    }
}
$out .= "\nNo rows were changed by this scan.\n\n";

echo $out;
@file_put_contents($OUT . '.txt', $out);
$db->close();
