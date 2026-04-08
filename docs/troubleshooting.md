# Troubleshooting

## Common Issues

### Services won't start

**Symptom:** `docker compose up` fails or containers keep restarting.

1. Check that Ollama is running first — all other services depend on `ollama_network`:
   ```bash
   cd ollama && make up
   docker network ls | grep ollama_network
   ```

2. Check container logs:
   ```bash
   docker compose logs --tail=50
   ```

3. Verify all required environment variables are set:
   ```bash
   docker compose config  # shows resolved config
   ```

### Cannot connect to Ollama

**Symptom:** PIKA or VERA shows "Ollama unavailable" errors.

- Ensure `OLLAMA_BASE_URL` is set to `http://ollama:11434` (not `localhost`).
- Ensure the service is on `ollama_network`:
  ```yaml
  networks:
    ollama_network:
      external: true
      name: ollama_network
  ```
- Test connectivity from inside the container:
  ```bash
  docker compose exec backend curl http://ollama:11434/api/tags
  ```

### Authentication not working

**Symptom:** Login fails or PIKA/VERA returns 503.

Hub is required for authentication. Check:

- Hub is running: `curl http://localhost:2000/health`
- `HUB_BASE_URL` and `HUB_AUTH_API_KEY` are set in the app's `.env` file.
- The API key matches between Hub's `.env` and the app's `.env`.
- Hub logs for errors: `docker compose logs hub`

### Account locked out

**Symptom:** "Invalid credentials" after multiple failed attempts.

Hub locks accounts after 5 failed login attempts for 15 minutes. Wait 15 minutes or ask an admin to check the user status in Hub.

### Sessions lost on Hub restart

**Symptom:** All users logged out after restarting Hub.

Set `HUB_SECRET_KEY` to a persistent value:
```bash
export HUB_SECRET_KEY=$(openssl rand -hex 32)
```

Without this, Hub generates a random session key on each start.

### VERA: "Background worker is not available"

**Symptom:** Upload fails with 503 error.

The Celery worker isn't running. Check:
```bash
docker compose ps          # worker should be "running"
docker compose logs worker  # check for errors
```

### VERA: Stuck documents

**Symptom:** Documents stay in "processing" status indefinitely.

If the worker crashed mid-OCR, the Beat task should recover stuck documents. If not:
```bash
docker compose restart worker
```

### PIKA: Slow document indexing

**Symptom:** Documents take a long time to index.

- Embedding model downloads on first use (~90 MB). Check logs for download progress.
- Large documents are chunked — indexing time scales with document size.
- Check `MAX_CONCURRENT_QUERIES` — default is 1 to prevent GPU memory issues.

### GPU not detected

**Symptom:** Ollama falls back to CPU mode.

1. Check NVIDIA driver: `nvidia-smi`
2. Check NVIDIA Container Toolkit: `docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi`
3. Ensure `docker-compose.yml` has GPU reservation:
   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: all
             capabilities: [gpu]
   ```

### License issues

**Symptom:** "Unlicensed" banner or license check failures.

- License validation is offline (no phone-home) — network issues don't affect it.
- Check Hub logs for license validation errors.
- Verify the license key file exists: `data/license.key`
- Check expiry: the license status API shows the expiry date.
- Re-activate via Hub admin panel if needed.

## Getting Help

- **Email:** hello@aidoo.biz
- **Docs:** https://docs.aidoo.biz
- **Health endpoints:** Every service exposes `/health` for quick status checks.
- **Metrics:** Every service exposes `/metrics` for Prometheus scraping.

## Collecting Diagnostics

When contacting support, include:

```bash
# Service status
docker compose ps

# Recent logs (last 200 lines)
docker compose logs --tail=200 > diagnostics.log

# System info
uname -a
docker --version
nvidia-smi 2>/dev/null || echo "No GPU"
```
