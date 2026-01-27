# ai.doo

Deployment notes for installing the site on an Ubuntu VPS with Caddy.

## Prerequisites

- Ubuntu 22.04 or 24.04
- A domain pointing to the VPS (A/AAAA records)
- SSH access with sudo

## 1) Install dependencies

Update packages and install git and Caddy:

```
sudo apt update
sudo apt install -y git
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## 2) Deploy the site

Clone the repository into the web root:

```
sudo mkdir -p /var/www
sudo git clone https://github.com/ForceSensitiveSaiyan/ai.doo.git /var/www/aidoo.biz
```

If you need a specific branch:

```
cd /var/www/aidoo.biz
sudo git checkout <branch>
```

## 3) Configure Caddy

Create a site config for your domain:

```
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
aidoo.biz, www.aidoo.biz {
    root * /var/www/aidoo.biz
    file_server
}
EOF
```

Reload Caddy:

```
sudo systemctl reload caddy
```

## 4) Set permissions (if needed)

Ensure Caddy can read the files:

```
sudo chown -R caddy:caddy /var/www/aidoo.biz
sudo find /var/www/aidoo.biz -type d -exec chmod 755 {} \;
sudo find /var/www/aidoo.biz -type f -exec chmod 644 {} \;
```

## 5) Update the live site

Pull new changes on the VPS:

```
cd /var/www/aidoo.biz
sudo git pull
```

If you use a non-default branch:

```
sudo git pull origin <branch>
```

## Notes

- Caddy automatically provisions and renews TLS certificates.
- If you see a permission error, re-check ownership and file mode.
- If the repo includes build steps (e.g. npm, bun), add them after the clone and after each pull.
