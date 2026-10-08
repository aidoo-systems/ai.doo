# Reverse Proxy Setup

A reverse proxy terminates TLS and routes traffic to the ai.doo services. **Caddy** is recommended for its automatic HTTPS, but an nginx configuration is also provided.

!!! tip "Quick start"
    If you used the installer with `--with-caddy`, the Caddyfile and compose overlay are already generated. You only need to ensure DNS records and firewall rules are in place.

## Service Ports

| Service | Internal Port | Container Name | Suggested Public Path |
|---|---|---|---|
| Hub | 8000 | `hub` | `hub.example.com` |
| PIKA | 8000 | `pika` / `pika-app` | `pika.example.com` |
| VERA frontend | 3000 | `vera-frontend` | `vera.example.com` |
| VERA backend | 8000 | `vera-backend` | VERA's `/api`, `/documents`, `/directory`, `/files`, `/llm` paths and `/health` |

!!! danger
    **Never expose Ollama (port 11434) to the public internet.** It has no authentication. Only the Docker bridge network (`ollama_network`) should be able to reach it. See the [firewall guide](https://github.com/aidoo-biz/ollama/blob/master/deploy/reference/firewall.md) for details.

## Prerequisites

1. **DNS A records** — point `hub.example.com`, `pika.example.com`, and `vera.example.com` to your server's public IP
2. **Ports 80 and 443 open** — Caddy needs port 80 for the ACME HTTP-01 challenge and HTTP→HTTPS redirect
3. **Docker network** — the proxy must be on the `ollama_network` bridge to reach the services

## Caddy (Recommended)

Caddy obtains and renews TLS certificates automatically via Let's Encrypt.

For this same-origin VERA layout, use a runtime-capable frontend image with `VERA_PUBLIC_API_URL=/`, set backend `SECURE_COOKIES=true`, and set `CORS_ORIGINS=https://vera.example.com`. The installer/reference routes have been tested with a privately trusted certificate; public ACME and the full generated installation remain release checks. The repo-root proxy in the Ollama repository uses a different, separate-API-host layout.

### Caddyfile

```caddyfile
{
    email admin@example.com
    servers {
        protocols h1 h2 h3
    }
}

# Shared security headers
(security_headers) {
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options    "nosniff"
        X-Frame-Options           "DENY"
        Referrer-Policy           "strict-origin-when-cross-origin"
        Permissions-Policy        "camera=(), microphone=(), geolocation=()"
        -Server
    }
}

hub.example.com {
    import security_headers
    header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"

    reverse_proxy hub:8000 {
        flush_interval -1        # required for SSE model-pull streaming
        header_up X-Forwarded-Proto {scheme}
    }
}

pika.example.com {
    import security_headers
    header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"

    reverse_proxy pika:8000 {
        flush_interval -1        # required for SSE query streaming
        header_up X-Forwarded-Proto {scheme}
    }

    request_body {
        max_size 100MB           # document uploads
    }
}

vera.example.com {
    import security_headers
    header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"

    @vera_api path /api /api/* /documents /documents/* /directory /directory/* /files /files/* /llm /llm/* /health
    handle @vera_api {
        reverse_proxy vera-backend:8000 {
            flush_interval -1    # required for SSE status streaming
            header_up X-Forwarded-Proto {scheme}
        }
    }

    @private path /internal /internal/* /metrics /metrics/*
    handle @private {
        respond "Not Found" 404  # block internal endpoints
    }

    handle {
        reverse_proxy vera-frontend:3000
    }

    request_body {
        max_size 25MB            # matches VERA's MAX_UPLOAD_MB default
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
      - "443:443/udp"   # HTTP/3
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
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d
```

!!! note
    Caddy must be on the same Docker network as the services it proxies. The `ollama_network` bridge is shared by all ai.doo services.

## Using Your Existing Reverse Proxy

If you already run nginx, Traefik, HAProxy, or a cloud load balancer, you don't need Caddy. Configure your proxy with these requirements:

### X-Forwarded Headers

All ai.doo services check `X-Forwarded-Proto` to determine whether the original request was HTTPS. This is critical because:

- **Secure cookies** — Hub, PIKA, and VERA set `secure=true` on session cookies. If `X-Forwarded-Proto: https` is missing, the cookie won't be sent on subsequent requests and users can't log in
- **CSRF validation** — VERA's CSRF middleware checks the origin against the forwarded scheme

Your proxy **must** set:

```
X-Forwarded-Proto: https
X-Forwarded-For: <client-ip>
X-Real-IP: <client-ip>
Host: <original-host>
```

### SSE Streaming

PIKA, VERA, and Hub use Server-Sent Events (SSE) for real-time updates:

| Service | SSE Endpoint | Purpose |
|---|---|---|
| Hub | `GET /api/models/pull/stream` | Model download progress |
| PIKA | `GET /api/v1/query/stream` | Streaming query responses |
| VERA | `GET /documents/{id}/status/stream` | Document processing status |

SSE requires:

- **No response buffering** — the proxy must flush each chunk immediately. In nginx: `proxy_buffering off;`. In Caddy: `flush_interval -1`
- **Long timeouts** — SSE connections stay open. Set `proxy_read_timeout 300s` or higher in nginx
- **No gzip on `text/event-stream`** — some proxies compress SSE responses, breaking the streaming protocol. Exclude `text/event-stream` from compression

### Upload Body Size

| Service | Default Max Upload | Config Variable |
|---|---|---|
| PIKA | 100 MB | `MAX_UPLOAD_SIZE` |
| VERA | 25 MB | `MAX_UPLOAD_MB` |

Your proxy's `client_max_body_size` (nginx) or `request_body max_size` (Caddy) must match or exceed these values, or uploads will fail with a `413 Request Entity Too Large` before reaching the application.

### CORS

VERA's frontend (`vera.example.com`) makes API calls to the backend, which is routed through the same hostname at `/api/*`. If your proxy separates them onto different origins, you must configure VERA's `CORS_ORIGINS` environment variable to include the frontend's origin.

### Health Check Endpoints

For load balancer health probes:

| Service | Health Endpoint |
|---|---|
| Hub | `GET /health` |
| PIKA | `GET /health` (lightweight) or `GET /api/v1/health` (detailed) |
| VERA | `GET /health` |

## nginx

If you prefer nginx, here is an equivalent configuration:

```nginx
upstream hub {
    server hub:8000;
}

upstream pika {
    server pika:8000;
}

upstream vera_api {
    server vera-backend:8000;
}

upstream vera_frontend {
    server vera-frontend:3000;
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

        # SSE streaming support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}

server {
    listen 443 ssl http2;
    server_name pika.example.com;

    ssl_certificate     /etc/letsencrypt/live/pika.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pika.example.com/privkey.pem;

    client_max_body_size 100M;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://pika;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE streaming support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}

server {
    listen 443 ssl http2;
    server_name vera.example.com;

    ssl_certificate     /etc/letsencrypt/live/vera.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vera.example.com/privkey.pem;

    client_max_body_size 25M;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location /api/ {
        proxy_pass http://vera_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE streaming support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # Block internal endpoints
    location /internal/ {
        return 404;
    }

    location / {
        proxy_pass http://vera_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
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
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unnecessary browser APIs |

!!! note
    VERA uses `SAMEORIGIN` for `X-Frame-Options` and a more permissive CSP because the Next.js frontend requires `unsafe-eval` for the standalone build.

## Troubleshooting

### "Can't log in" / session cookie not persisting

Your proxy is not sending `X-Forwarded-Proto: https`. The application sets `secure=true` on cookies, so the browser will only send them over HTTPS. Verify the header reaches the backend:

```bash
curl -v https://hub.example.com/health 2>&1 | grep -i forwarded
```

### SSE streaming not working / responses arrive all at once

Your proxy is buffering the response. Disable buffering for SSE endpoints (see the SSE section above).

### "413 Request Entity Too Large" on uploads

Your proxy's body size limit is smaller than the file being uploaded. Increase `client_max_body_size` (nginx) or `request_body max_size` (Caddy).

### VERA API calls fail with CORS errors

The frontend origin doesn't match the CORS allowlist. Set `CORS_ORIGINS` in VERA's environment to include the frontend URL (e.g., `https://vera.example.com`).
