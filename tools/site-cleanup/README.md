# Hacked site cleanup toolkit

Teen scripts jo Hostinger (ya kisi bhi cPanel/PHP hosting) par chal kar injected
malware dhoondte aur nikaalte hain.

| Script | Kaam | Kuch badalta hai? |
|---|---|---|
| `scan.php` | Files mein backdoor, webshell, `.htaccess` redirect, WordPress core tampering dhoondta hai | Nahi, sirf report likhta hai |
| `db-scan.php` | Database mein fake admin users, hijacked URL, injected options aur posts dhoondta hai | Nahi, sirf `SELECT` chalata hai |
| `clean.php` | Confirm hui files ko quarantine karta hai, ya sirf injected block nikaalta hai | Haan, lekin `--confirm` ke baghair nahi, aur har file ka backup pehle |

Teeno PHP 7.0+ par chalte hain, koi library ya composer nahi chahiye.

---

## Zaroori: shuru karne se pehle

1. **Poora backup lein.** hPanel > Files > Backups > "Generate new backup".
   Files aur database dono. Hack hui site ka backup bhi qeemti hai, kyunke agar
   cleanup mein kuch toot jaye to wapas laya ja sake.
2. Site ko `Maintenance mode` par daal dein agar mumkin ho.
3. Ye scripts padh lein. Ye aapki site par chalenge, andhadhund mat chalayein.

---

## Chalane ka tareeqa A: SSH (behtar)

Hostinger Business plan aur upar SSH deta hai. hPanel > Advanced > SSH Access
se host, port, username milega.

```sh
# apne computer se login
ssh -p 65002 u123456789@203.0.113.10

# site ka path dhoond lein
ls ~/domains/blazerealty.ae/public_html

# teeno script server par le aayein
cd ~
BASE=https://raw.githubusercontent.com/jawadislam92/gymdesk/claude/festive-dijkstra-1avdi6/tools/site-cleanup
curl -fsSL -O $BASE/scan.php -O $BASE/db-scan.php -O $BASE/clean.php
```

### Step 1: files scan karein

```sh
php scan.php \
  --root=$HOME/domains/blazerealty.ae/public_html \
  --out=$HOME/scan-report \
  --since=2026-06-01
```

`--since` woh tareekh hai jab se aapko lagta hai site theek thi. Uske baad badli
hui har file report mein `low` ke tor par aa jayegi, jisse timeline samajh aata hai.

Do report banti hain: `scan-report.json` aur `scan-report.html`.
HTML file ko download kar ke browser mein kholein, padhne mein asaan hai.

### Step 2: database scan karein

```sh
php db-scan.php \
  --config=$HOME/domains/blazerealty.ae/public_html/wp-config.php \
  --domain=blazerealty.ae \
  --out=$HOME/db-report \
  --since=2026-06-01
```

Password kahin type nahi karna, script `wp-config.php` se khud utha leti hai.

`--domain` zaroori hai. Isi se script pehchanti hai ke konsa URL aapka hai aur
konsa hacker ka. Ye na dein to site URL sirf dikhaya jayega, judge nahi hoga.

Ye check hote hain:

- Har administrator account, aur kaun sa naya ya mashkook hai
- Admin capability jo kisi anjaan meta key mein chhupayi gayi ho
- `siteurl` aur `home` hijack hue ya nahi
- Public registration khuli hai, aur naye user ko konsa role milta hai
- `wp_options` mein `eval`, `base64_decode`, `<script` waghera
- Posts aur pages mein injected script ya spam
- Cron jobs jo WordPress ke apne nahi (malware yahin se dobara install hota hai)
- Anjaan ya random naam waale database tables
- `wp-content/plugins/` mein folder jis mein `Plugin Name:` header hi nahi
- Active theme jo disk par maujood hi nahi
- `wp-config.php` ke security keys purane ya default to nahi
- Jin accounts par password reset pending hai

Ye `db-report.txt`, `db-report.json` aur agar kuch mila to `db-report.sql` banati hai.
Woh `.sql` file **chalti nahi**, sirf likhi jati hai. Aap khud padh kar chalayein:

```sh
less $HOME/db-report.sql          # pehle poori padhein
mysql -u DBUSER -p DBNAME < $HOME/db-report.sql   # phir chalayein
```

### Step 3: report padhein, phir saaf karein

Pehle dry run, taake pata chale kya hoga:

```sh
php clean.php \
  --root=$HOME/domains/blazerealty.ae/public_html \
  --report=$HOME/scan-report.json \
  --mode=quarantine
```

Theek lage to `--confirm` laga dein:

```sh
php clean.php --root=... --report=... --mode=quarantine --confirm
```

Phir un files ke liye jo aapki apni hain lekin un mein code ghusaya gaya hai:

```sh
php clean.php --root=... --report=... --mode=strip            # dry run
php clean.php --root=... --report=... --mode=strip --confirm  # asli
```

Default sirf `critical` findings par chalta hai. Report padhne ke baad `high`
bhi shamil karna ho to `--severity=critical,high` laga dein.

### Agar kuch toot jaye

Har file ka original quarantine folder mein mehfooz hai. Sab kuch wapas:

```sh
sh ~/.quarantine-YYYYMMDD-HHMMSS/restore.sh
```

---

## Chalane ka tareeqa B: SSH nahi hai

1. Har script kholein aur `$BROWSER_TOKEN` mein ek lamba random string daal dein
   (misal `k9Xm2Qp7Lw4Rt8Yv3Nb6Hc1Zs5Fd`).
2. hPanel > Files > File Manager se `scan.php` aur `db-scan.php` ko `public_html`
   mein upload karein.
3. Browser mein kholein:
   `https://blazerealty.ae/scan.php?token=k9Xm2Qp7Lw4Rt8Yv3Nb6Hc1Zs5Fd`
4. Report screen par aa jayegi.
5. **Kaam khatam hone par dono files server se delete kar dein.**

`clean.php` sirf SSH se chalta hai. Browser se delete karna khatarnak hai, is liye
jaan boojh kar band rakha hai. SSH na ho to report padh kar File Manager se khud
files delete karein.

---

## Scripts jo nahi kar sakte (ye aapko khud karna hai)

Files saaf karna aadha kaam hai. Agar ye steps nahi kiye to site dobara hack ho jayegi.

**1. Sab passwords badlein**
- hPanel account password
- FTP accounts ka password (hPanel > Files > FTP Accounts)
- Database user password (hPanel > Databases, phir `wp-config.php` mein bhi update karein)
- Har WordPress admin ka password
- Email accounts

**2. WordPress ke salts naye karein**
https://api.wordpress.org/secret-key/1.1/salt/ kholein, jo aaye woh `wp-config.php`
mein purani `AUTH_KEY` waali lines ki jagah paste kar dein. Isse har banda logout
ho jata hai, hacker bhi.

**3. Hostinger ke andar ye cheezen check karein**
- hPanel > Advanced > Cron Jobs. Jo cron aapne nahi banaya woh delete karein.
  Malware yahin chhup kar dobara install hota hai.
- hPanel > Files > FTP Accounts. Anjaan account delete karein.
- hPanel > Emails > Email Accounts aur Forwarders. Anjaan forwarder delete karein,
  spam usi se bhejte hain.

**4. WordPress side**
- Users > All Users. Har administrator dekhein. Jo aapka nahi, delete karein.
- Settings > General. Site Address aur WordPress Address sahi hain?
- Settings > General. "Anyone can register" band karein agar zarurat nahi.
- Core, plugins aur themes sab update karein.
- Jo plugin/theme use nahi ho raha, deactivate nahi, **delete** karein.
- Baqi plugins ko delete kar ke fresh install karein. Purani files par bharosa na karein.
- Nulled ya pirated plugin/theme ho to nikaal dein. Zyadatar hack wahin se aata hai.

**5. File permissions**
```sh
cd ~/domains/blazerealty.ae/public_html
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod 600 wp-config.php
```

**6. Google**
Search Console kholein > Security & Manual Actions. Warning ho to saaf karne ke
baad review request bhejein, warna Chrome par red screen aati rahegi.

---

## Report ke severity levels ka matlab

| Level | Matlab |
|---|---|
| `critical` | Taqreeban yaqeeni malware. Nikaal dein. |
| `high` | Mazboot ishara. File kholein, dekhein, phir faisla karein. |
| `medium` | Mashkook. Insani nazar chahiye. |
| `low` | Sirf maloomat ke liye, misal "ye file is tareekh ke baad badli". |

## clean.php ke do modes

- `--mode=quarantine` poori file malware hai (dropped shell, uploads folder mein
  PHP file, wp-admin ke andar anjaan file). File quarantine folder mein **move**
  hoti hai, delete nahi.
- `--mode=strip` file aapki hai lekin us mein code ghusaya gaya hai (theme ki
  `functions.php`, `index.php`). Pehla poora backup banta hai, phir sirf injected
  block nikalta hai, phir `php -l` se check hota hai ke file ab bhi valid hai.
  Agar valid na ho to file ko haath nahi lagaya jata.

`.htaccess` aur `wp-content/mu-plugins/` ko script khud nahi chhedti. `.htaccess`
delete karne se permalinks toot jate hain, aur mu-plugins kabhi hosting ke apne
bhi hote hain. Script in ko alag list mein dikhati hai, saath hidayat ke.
