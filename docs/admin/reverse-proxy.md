# Reverse Proxy Setup

A reverse proxy terminates TLS and routes traffic to the ai.doo services. **Caddy** is recommended for its automatic HTTPS, but an nginx configuration is also provided.

## Service Ports

| Service | Internal Port | Suggested Public Path |
|---|---|---|
| Hub | 8000 | `hub.example.com` |
| PIKA | 8000 | `pika.example.com` |
| VERA frontend | 3000 | `vera.example.com` |
| VERA backend | 8000 | `vera.example.com/api/*` |

!!! warning
    Never expose Ollama (port 11434) to the public internet. It has no authentication. Only the Docker bridge network (`ollama_network`) should be able to reach it.

## Caddy (Recommended)

Caddy obtains and renews TLS certificates automatically via Let's Encrypt.

### Caddyfile

```caddyfile
{
    email admin@example.com
}

hub.example.com {
    reverse_proxy hub:8000

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

pika.example.com {
    reverse_proxy pika:8000

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

vera.example.com {
    handle /api/* {
        reverse_proxy backend:8000
    }

    handle {
        reverse_proxy frontend:3000
    }

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### Docker Compose Overlay

Create a `docker-compose.caddy.yml` alongside your main compose files:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - ollama_network

networks:
  ollama_network:
    external: true
    name: ollama_network

volumes:
  caddy_data:
  caddy_config:
```

Start it with:

```bash
docker compose -f docker-compose.caddy.yml up -d
```

!!! note
    Caddy must be on the same Docker network as the services it proxies. The `ollama_network` bridge is shared by all ai.doo services.

## nginx

If you prefer nginx, here is an equivalent configuration.

```nginx
upstream hub {
    server hub:8000;
}

upstream pika {
    server pika:8000;
}

upstream vera_api {
    server backend:8000;
}

upstream vera_frontend {
    server frontend:3000;
}

server {
    listen 443 ssl http2;
    server_name hub.example.com;

    ssl_certificate     /etc/letsencrypt/live/hub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.example.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://hub;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name pika.example.com;

    ssl_certificate     /etc/letsencrypt/live/pika.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pika.example.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://pika;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name vera.example.com;

    ssl_certificate     /etc/letsencrypt/live/vera.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vera.example.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location /api/ {
        proxy_pass http://vera_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://vera_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name hub.example.com pika.example.com vera.example.com;
    return 301 https://$host$request_uri;
}
```

!!! tip
    With nginx you must manage TLS certificates yourself. Consider [certbot](https://certbot.eff.org/) for automated Let's Encrypt renewals.

## Security Headers

Both configurations above include these recommended headers:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` / `SAMEORIGIN` | Prevent clickjacking |
| `Content-Security-Policy` | App-specific | Restrict script/style sources |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer information |

!!! note
    VERA uses `SAMEORIGIN` for `X-Frame-Options` and a more permissive CSP because the Next.js frontend may require `unsafe-eval` for certain features. The production Docker image uses a standalone build, but some Next.js runtime features still need `unsafe-eval`.
