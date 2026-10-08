# Installer Script

The installer generates a single-host ai.doo stack. The unreleased working tree includes image-digest release locks, OCR and model preparation checks. Publishing a verified release and completing clean-host testing remain release gates. There is no verified installation-time guarantee.

This is a fresh-install tool, not an upgrade tool. It refuses a non-empty installation directory rather than replacing existing secrets or data. Use a reviewed, tested revision for a pilot; do not rerun it over a customer installation.

## Download and Run

Use a reviewed checkout and its matching release lock. No verified release lock has been published by this work. The following command is for a future supplied release, not a claim that its artifacts are available:

```bash
./scripts/install.sh --release-lock /path/to/verified-release.lock
```

For development only, `--development-images` explicitly permits mutable image tags and image override flags. It does not certify compatibility. With neither option, the installer stops before writing deployment files. Do not pipe the moving `master` installer into a customer deployment.

## What It Does

- Checks prerequisites (Docker, Docker Compose, curl and OpenSSL)
- GPU detection (NVIDIA via `nvidia-smi`)
- Interactive product selection (PIKA, VERA, or both)
- Secret generation and directory setup
- Docker image pull and service startup
- Health checks and readiness verification

## Options

| Flag | Description |
|------|-------------|
| `--release-lock <file>` | Require exact SHA-256 image references for the complete suite and record them in the installation |
| `--development-images` | Explicitly allow unverified development images; cannot be combined with a release lock |
| `--no-gpu` | Skip GPU detection, use CPU mode |
| `--model <name>` | Select the Ollama model for both products; default `llama3.2:3b` |
| `--products pika,vera` | Skip product selection prompt |
| `--password <pass>` | Set admin password (skip interactive prompt) |
| `--with-caddy` | Add Caddy reverse proxy with automatic HTTPS |
| `--vera-frontend-image <image>` | Select a tested runtime-capable VERA frontend image; older images are rejected before startup |
| `--vera-backend-image <image>` | Use one matching image for VERA initialization, OCR preparation, migrations, API, worker and scheduler |
| `--vera-recovery-image <image>` | Select the offline recovery helper; it is not pulled or started by normal installation |
| `--domain example.com` | Base domain for Caddy subdomains (requires `--with-caddy`) |
| `--acme-email admin@example.com` | Email for Let's Encrypt notifications |
| `--yes` | Reserved compatibility flag; currently does not suppress prompts |

### HTTPS with Caddy

To deploy with automatic TLS and hostname routing:

```bash
./scripts/install.sh --release-lock /path/to/verified-release.lock --with-caddy --domain example.com --acme-email admin@example.com
```

This generates a Caddyfile with `hub.example.com`, `pika.example.com`, and `vera.example.com` subdomains, binds all service ports to `127.0.0.1` (so only Caddy is publicly reachable), and configures VERA's CORS and API URLs for HTTPS.

VERA uses `VERA_PUBLIC_API_URL=/` so browser requests share its HTTPS origin. The proxy routes authentication, documents (including page status, streaming and exports), directory, files, LLM and health paths to the backend. `/internal` and `/metrics` are not public. The frontend bootstrap is allowed by its CSP; `unsafe-eval` is not required in this configuration. The reference Caddyfile is checked against the installer output to prevent drift.

The runtime-capable frontend is not yet published by this work. The release lock must select a verified matching image; do not assume the development default `latest` supports it. Individual image override flags are available only in development mode. The installer checks the selected frontend's runtime capability before starting services.

### Release locks

A release lock is a plain `KEY=value` file, not executable shell. It requires `SUITE_RELEASE` plus `OLLAMA_IMAGE`, `HUB_IMAGE`, `PIKA_IMAGE`, `VERA_BACKEND_IMAGE`, `VERA_FRONTEND_IMAGE`, `VERA_RECOVERY_IMAGE`, `POSTGRES_IMAGE`, `REDIS_IMAGE` and `CADDY_IMAGE`. Every image must contain a repository followed by `@sha256:` and its full 64-character lowercase digest. Blank lines and comments beginning with `#` are accepted; unknown, duplicate and missing keys are rejected.

The complete suite must be pinned even for a single-product installation. All VERA backend roles use the same digest. The recovery image is recorded but remains opt-in, not pulled or started automatically. The lock takes precedence over inherited image environment variables and cannot be combined with CLI image overrides. Validated values are saved as `release.lock` beside the generated Compose file.

Pinning image content does not authenticate the publisher, prove compatibility, freeze model downloads or establish architecture support. Preserve the reviewed installer revision and verify the lock's provenance separately. LLM/OCR model artifacts, signed release evidence, architecture certification and clean-host acceptance remain release work. There are deliberately no invented production digests in the repository.

Without Caddy, HTTP ports also bind only to loopback. Use that mode for local evaluation, or configure a reviewed TLS proxy separately. It is not a public plaintext deployment option. Startup waits for declared container health, including the VERA worker, before the HTTP checks. Failed preparation, startup or endpoint checks return a nonzero result; they do not roll back or delete the generated files or containers. Inspect the deployment and logs before recovery.

### Model and OCR preparation

The installer starts Hub and Ollama first, downloads the selected model if absent, and requires a completed, non-empty synthetic text generation. PIKA and VERA receive the same model selection. Downloads can be several GB. Download and generation requests have 15-minute and three-minute timeouts respectively; this is not a performance or answer-quality benchmark. PIKA's embedding/indexing workflow and VERA summaries still need end-to-end acceptance checks.

When VERA is selected, `vera-ocr-prepare` downloads English OCR weights into a persistent cache and must recognize synthetic text before the API and worker start. Workers mount that cache read-only and reuse an engine within each worker process. Preparation has a 15-minute limit; complete application startup also has a 15-minute wait. Internet access is needed for missing weights. This is not an offline-install package.

Select a rebuilt, matching backend image containing `app.services.ocr_readiness`. These source changes have not been published; an older `latest` image is not sufficient. Failed preparation blocks startup instead of deferring the failure to a user's first upload.

**Prerequisites:** DNS A records for all three subdomains must point to the server, and ports 80/443 must be open.

## Directory Structure

After installation, your `~/aidoo/` directory will contain:

```
~/aidoo/
├── .env                 # Environment variables
├── docker-compose.yml   # Stack definition
├── release.lock         # Validated image pins, absent in development mode
├── Caddyfile            # Reverse proxy config (if --with-caddy)
├── secrets/             # Local secret copies; Compose currently reads .env
│   ├── hub_admin_password
│   ├── hub_auth_api_key
│   ├── hub_secret_key
│   └── pika_session_secret
└── data/                # Reserved legacy directories, not the live volumes
```

Live storage uses Docker named volumes scoped to the Compose project. Keep the same project name and deployment directory when recreating containers. Never use `docker compose down --volumes` on an installation you intend to retain.

| Volume | Contents |
|---|---|
| `hub_data` | Hub database and permanent account identities |
| `pika_data`, `pika_documents` | PIKA state/indexes and original source documents |
| `vera_pgdata`, `vera_files` | VERA database and original/rendered document files |
| `vera_redis_data` | Live queue/session state, not disaster-recovery material |
| `vera_beat_data` | Scheduler state |
| `vera_ocr_models` | OCR weights prepared before accepting uploads |
| `vera_backups`, `vera_restore` | Offline recovery bundles and a separate restore destination |
| `ollama_models` | Downloaded models |

PIKA's signing key is generated once and retained in `.env`. Preserve deployment secrets as well as volumes. A one-shot VERA storage initializer sets ownership on the document, scheduler and OCR-cache volume roots, without recursive ownership changes. A one-shot migration service uses the installed psycopg driver and must succeed before the API, worker or scheduler can start. Migration failure never automatically stamps the database. This layout is for new installations; it does not move data out of older bind mounts.

## Offline VERA backup

The `vera-recovery` service is opt-in under the `recovery` profile, not an automatic backup job. Use a matching recovery image and the VERA recovery runbook. Before creating a bundle, block access, drain OCR and stop all API, worker, scheduler and other writers. Keep PostgreSQL running. Then run the helper with a new bundle name, for example:

```bash
docker compose run --rm --no-deps vera-recovery create \
  --kind postgres --data-dir /data --runtime-data-dir /data \
  --release '<recorded application revision and image digests>' \
  --bundle /backups/<new-bundle-name> --writers-stopped
docker compose run --rm --no-deps vera-recovery verify --bundle /backups/<new-bundle-name>
```

The source file volume is read-only in the helper. Save selected configuration/secrets separately or explicitly mount them read-only and pass `--config-file` for each. Hub identities and other products need their own coordinated backups. Local Docker backup volumes are not off-host or encrypted backups; export verified bundles to protected storage. Restore into a new empty database and a new destination under `/restore`, with fresh dedicated Redis before reopening access. Never replay backed-up Redis state as part of disaster recovery.

## Next Steps

After installation:

1. Open Hub locally at `http://localhost:2000` (or `https://hub.example.com` with Caddy) and log in with your admin credentials
2. Confirm the selected model in Hub; the installer has already run a short generation check
3. Activate your license key in the License tab
4. Open PIKA at `:8000` or VERA at `:3000` and log in with your Hub credentials

For production deployments with TLS and hostname routing, see the [Reverse Proxy](../admin/reverse-proxy.md) guide.
