# Getting Started

**Subject:** Getting started with ai.doo

---

Hi {{customer_name}},

Here's a quick checklist to get your team up and running.

**1. Verify your installation**

Check that all services are healthy:

```bash
curl http://localhost:2000/health   # Hub
curl http://localhost:8000/health   # PIKA
curl http://localhost:4000/health   # VERA
```

**2. Pull an AI model**

Open Hub at `http://localhost:2000` and pull a model from the Models tab. We recommend starting with `llama3.2:3b` for general use.

**3. Create user accounts**

Go to Hub > Users and create accounts for your team. Each user gets access to the products included in your license.

**4. Start using your products**

{{#if pika}}
- **PIKA** (`http://localhost:8000`) — Upload documents and start asking questions. [Usage guide](https://docs.aidoo.biz/pika/usage/)
{{/if}}
{{#if vera}}
- **VERA** (`http://localhost:3000`) — Upload scanned documents for OCR validation. [Usage guide](https://docs.aidoo.biz/vera/usage/)
{{/if}}

**Useful links:**

- [Full documentation](https://docs.aidoo.biz/)
- [Configuration reference — PIKA](https://docs.aidoo.biz/pika/configuration/)
- [Configuration reference — VERA](https://docs.aidoo.biz/vera/configuration/)
- [Troubleshooting](https://docs.aidoo.biz/troubleshooting/)
- [Backup & restore](https://docs.aidoo.biz/admin/backup-restore/)

**Need help?**

Reply to this email or contact **hello@aidoo.biz**. We're here to help.

The ai.doo team
