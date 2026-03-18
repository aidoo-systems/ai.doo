# User Management

Hub provides centralised user management for the ai.doo suite. PIKA and VERA delegate authentication to Hub, so you manage all accounts in one place.

## Roles

| Role | Permissions |
|---|---|
| **admin** | Full access — create/delete users, manage models, activate licenses, view audit log |
| **user** | Access PIKA and VERA with their own credentials; no Hub admin panel access |

## Creating Users

1. Log in to Hub as an admin.
2. Navigate to the **Users** tab.
3. Click **Create User**.
4. Fill in username, email, password, and role.
5. Click **Save**.

The new user can immediately log in to PIKA and VERA.

!!! tip
    You can also create users via the API:

    ```bash
    curl -X POST http://localhost:2000/api/users \
      -H "Authorization: Bearer <admin-token>" \
      -H "Content-Type: application/json" \
      -d '{
        "username": "alice",
        "email": "alice@example.com",
        "password": "S3cureP@ss1",
        "role": "user"
      }'
    ```

## Password Requirements

All passwords must meet these criteria:

| Rule | Requirement |
|---|---|
| Minimum length | 8 characters |
| Uppercase letter | At least one (A-Z) |
| Lowercase letter | At least one (a-z) |
| Digit | At least one (0-9) |

Passwords are hashed with bcrypt before storage. Hub never stores or logs plaintext passwords.

## Account Lockout

Hub enforces rate limiting on failed login attempts to prevent brute-force attacks.

| Parameter | Value |
|---|---|
| Failure threshold | **5** consecutive failed attempts |
| Lockout duration | **15 minutes** |

!!! note
    The lockout counter resets after a successful login. An admin can also manually unlock an account from the Users tab.

## Enabling / Disabling Users

To temporarily revoke access without deleting the account:

1. Go to the **Users** tab.
2. Click on the user.
3. Toggle the **Enabled** switch to off.
4. Click **Save**.

A disabled user cannot log in to Hub, PIKA, or VERA. Their data (documents, OCR jobs) is preserved.

## Deleting Users

1. Go to the **Users** tab.
2. Click on the user.
3. Click **Delete User** and confirm.

!!! danger
    Deleting a user is permanent. Their account is removed from Hub and they lose access to all services. Application data associated with the user (PIKA collections, VERA jobs) is **not** automatically deleted.

## Auth Delegation — PIKA and VERA

PIKA and VERA do not maintain their own user databases. Instead, they validate credentials against Hub on every login:

```
User → PIKA/VERA login form
       → POST /api/auth/verify (Hub)
       ← 200 OK + user claims
       → Session created in PIKA/VERA
```

Both apps require two environment variables to connect to Hub:

```bash
# pika/.env or vera/.env
HUB_BASE_URL=http://hub:8000
HUB_AUTH_API_KEY=<shared-api-key>
```

!!! info
    The `HUB_AUTH_API_KEY` is a service-to-service key that authorises PIKA and VERA to call Hub's auth API. It is **not** a user credential. Set the same key in Hub's `.env` and in each app's `.env`.
