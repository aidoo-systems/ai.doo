# License Key Activation

The ai.doo license system uses **offline-validated signed JWTs**. Once activated, the license is verified locally — no phone-home, no telemetry, no external network calls.

## How It Works

1. You receive a license key (a signed JWT) from ai.doo.
2. You paste it into Hub's admin panel.
3. Hub validates the signature against the bundled public key and stores the token.
4. All subsequent checks are local — the JWT is decoded and its claims are verified on the server.

!!! info
    ai.doo licenses are designed for air-gapped environments. The license key contains everything needed for validation.

## Activating a License

=== "Hub UI"

    1. Log in to Hub as an admin.
    2. Open the admin panel and navigate to the **License** section.
    3. Paste your license key into the input field.
    4. Click **Activate**.

=== "API"

    ```bash
    curl -X POST http://localhost:2000/api/license/activate \
      -H "Authorization: Bearer <admin-token>" \
      -H "Content-Type: application/json" \
      -d '{"key": "<your-license-jwt>"}'
    ```

    A successful response returns:

    ```json
    {
      "valid": true,
      "customer": "Acme Corp",
      "tier": "professional",
      "seats": 10,
      "products": ["pika", "vera"],
      "expires_at": 1742256000,
      "error": ""
    }
    ```

## Checking License Status

PIKA and VERA query this endpoint on startup and cache the result for 1 hour.

```bash
curl http://localhost:2000/api/license/status \
  -H "Authorization: Bearer <hub-auth-api-key>"
```

Response:

```json
{
  "valid": true,
  "customer": "Acme Corp",
  "tier": "professional",
  "seats": 10,
  "products": ["pika", "vera"],
  "expires_at": 1742256000,
  "error": ""
}
```

## License Claims

Each JWT contains these claims:

| Claim | Type | Description |
|---|---|---|
| `products` | `string[]` | Licensed products — e.g. `["pika", "vera"]` |
| `seats` | `int` | Maximum number of enabled user accounts |
| `customer` | `string` | Customer name |
| `tier` | `string` | License tier — `professional` or `enterprise` |
| `exp` | `datetime` | Expiry timestamp (standard JWT `exp` claim) |
| `iss` | `string` | Issuer — always `aidoo.biz` |
| `sub` | `string` | Customer identifier |

## Graduated Enforcement

ai.doo uses **graduated enforcement** — restrictions increase over time, giving you ample notice to renew. Data is never deleted.

| Stage | Trigger | Behaviour |
|---|---|---|
| **Grace period** | No license key, first 14 days | Full features, maximum 3 users |
| **Licensed** | Valid key, > 30 days to expiry | Full features, seat-enforced |
| **Warning** | Valid key, ≤ 30 days to expiry | Full features + countdown banners in Hub, PIKA, and VERA |
| **Soft lockdown** | Expired < 30 days, or grace ended | Read-only — uploads and new queries return `402` |
| **Hard lockdown** | Expired ≥ 30 days | Admin-only access — all endpoints blocked except `/health`, auth, and the license page |

!!! tip
    The 14-day grace period lets you evaluate the full suite before purchasing. After that, graduated enforcement gives you at least 30 additional days of read-only access before hard lockdown — and your data is always preserved.

## Revoking a License

If a license key needs to be invalidated — for example, after a refund, a leaked key, or a misissued license — Hub supports immediate revocation by `jti` (the unique license ID).

=== "Hub UI (Admin)"

    Currently available via API only. A UI option is planned for a future release.

=== "API"

    ```bash
    curl -X POST http://localhost:2000/api/license/revoke \
      -H "Content-Type: application/json" \
      -b <session-cookie> \
      -d '{"jti": "<license-jti>", "reason": "customer refunded"}'
    ```

    A successful response returns the updated license status with `"revoked_jti"` confirming the action. An already-revoked jti returns `409`.

=== "CLI (Operator)"

    The `generate-license.py` script records revocations locally:

    ```bash
    python generate-license.py --revoke <jti> --reason "customer refunded"
    ```

    This writes to `~/.aidoo/revocations.json` and prints instructions for applying the revocation to Hub (either by copying the file to Hub's `data/` directory or by calling the API).

**What happens after revocation:**

- The revoked license receives **hard enforcement** immediately — the system is locked.
- PIKA and VERA will pick up the change on their next license poll (up to 1 hour, or immediately via `POST /internal/license/refresh` on each service).
- The revocation is recorded in Hub's audit log.
- Revocations are stored in `data/license-revocations.json` and survive restarts.
- To restore access, activate a new license key.

!!! warning
    Revocation is irreversible for a given jti. If the same JWT is re-pasted into Hub, it will still be rejected. Issue a new license instead.

## Seat Enforcement

Seats are counted as the number of **enabled** user accounts in Hub (both admin and user roles). Disabled accounts do not count against the seat limit.

If you reach the seat limit:

- Attempting to create a new user returns a `402` error.
- Existing users are unaffected.
- Disable or delete unused accounts to free seats, or upgrade your license.
