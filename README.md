# ai.doo

Static marketing site for [aidoo.biz](https://aidoo.biz), served from an Ubuntu VPS with Caddy.

## Hosting overview

- **Stack**: Static HTML/CSS/JS — no build step
- **Server**: Ubuntu VPS running [Caddy](https://caddyserver.com/) as a file server
- **Web root**: `/var/www/aidoo.biz`
- **TLS**: Automatic via Caddy (provisions and renews certificates)
- **Deploy**: Pushes to `main` auto-deploy via GitHub Actions (rsync over SSH)

## Auto-deploy workflow

The workflow at `.github/workflows/deploy.yml` runs on every push to `main`:

1. Checks out the repo
2. Connects to the VPS over SSH using a deploy key
3. Rsyncs site files to `/var/www/aidoo.biz/`, excluding `.git`, `.github`, `README.md`, and `logo_designs.png`
4. Caddy serves the updated files immediately (no restart needed)

### Required GitHub secrets

Stored under the **VPS** environment in Settings > Secrets and variables > Actions:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Server IP or hostname |
| `VPS_USER` | SSH username on the VPS |
| `VPS_SSH_KEY` | Private ed25519 key for SSH auth |

The matching public key must be in `~/.ssh/authorized_keys` on the VPS for the deploy user.

## VPS setup

### 1) Install Caddy

```
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 2) Configure Caddy

```
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
aidoo.biz, www.aidoo.biz {
    root * /var/www/aidoo.biz
    file_server
}
EOF

sudo systemctl reload caddy
```

### 3) Prepare the web root

```
sudo mkdir -p /var/www/aidoo.biz
sudo chown -R <deploy-user>:<deploy-user> /var/www/aidoo.biz
```

The deploy user must own the directory so rsync can write to it.

### 4) Set up the deploy key

```
ssh-keygen -t ed25519 -f ~/deploy_key -C "github-actions-deploy" -N ""
cat ~/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Copy the contents of `~/deploy_key` into the `VPS_SSH_KEY` GitHub secret, then delete both key files from the VPS.

## Manual deploy

If needed, you can bypass the workflow and deploy manually:

```
cd /var/www/aidoo.biz
sudo git pull origin main
```
