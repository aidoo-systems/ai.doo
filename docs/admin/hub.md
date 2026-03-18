# Hub Admin Guide

Hub is the central management service for the ai.doo suite. It runs alongside Ollama and provides a web UI for model management, user management, license activation, and audit logging.

## What Hub Does

| Function | Description |
|---|---|
| Ollama management | Pull, delete, and inspect models through a web UI instead of the CLI |
| User management | Create accounts, assign roles, enable/disable access for PIKA and VERA |
| License management | Activate and monitor your ai.doo license key |
| Audit logging | Immutable log of admin actions — logins, user changes, license activation |

## Accessing Hub

Hub listens on port **2000** by default:

```
http://localhost:2000
```

!!! tip
    In production, place Hub behind a [reverse proxy](reverse-proxy.md) so users access it over HTTPS.

## First-Run Setup

On the first visit Hub presents a setup page:

1. **Create admin account** — enter a username and password. This becomes the first admin user.
2. **Pull a model** — Hub will prompt you to pull at least one model so the suite is functional.
3. **Activate license** (optional) — paste your license key, or skip to run in unlicensed mode.

!!! warning
    The first-run page is only shown once. After the admin account is created, Hub redirects to the login screen for all subsequent visits.

## Navigating the UI

### Models Tab

Manage Ollama models without touching the CLI.

| Action | Description |
|---|---|
| **Pull** | Enter a model tag (e.g. `llama3.2:3b`) and click Pull. Progress is streamed in real time. |
| **Delete** | Remove a model from the `ollama_models` volume to free disk space. |
| **Inspect** | View model metadata — parameter count, quantisation, template, and license. |

### Users Tab

Create and manage user accounts. See [User Management](user-management.md) for full details.

### Audit Tab

Browse the audit log. Each entry records:

- **Timestamp** (UTC)
- **Actor** — the user who performed the action
- **Action** — e.g. `user_created`, `login_success`, `license_activated`
- **Detail** — contextual data (model name, target user, etc.)

Audit entries are append-only and cannot be deleted through the UI.

## Model Management

### Pulling Models

=== "Hub UI"

    Navigate to **Models > Pull**, enter the tag, and click **Pull**.

=== "CLI"

    ```bash
    cd ollama
    ./scripts/pull-models.sh llama3.2:3b qwen2.5-coder:14b
    ```

=== "API"

    ```bash
    curl http://localhost:11434/api/pull -d '{"name": "llama3.2:3b"}'
    ```

### Deleting Models

In the Models tab, click the delete icon next to the model you want to remove. Hub calls the Ollama `/api/delete` endpoint on your behalf.

!!! danger
    Deleting a model is permanent. If PIKA or VERA is configured to use that model, requests will fail until you pull it again or update the app configuration.

## Session Configuration

Hub uses a secret key to sign session cookies. Set it via the `HUB_SECRET_KEY` environment variable in your `.env` file:

```bash
# ollama/.env
HUB_SECRET_KEY=your-random-secret-at-least-32-chars
```

!!! warning
    If `HUB_SECRET_KEY` is not set, Hub generates a random key on startup. This means all sessions are invalidated every time the container restarts. **Always set an explicit key in production.**

To generate a secure key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```
