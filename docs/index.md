# ai.doo Documentation

Welcome to the documentation for the **ai.doo** self-hosted AI suite. ai.doo provides privacy-first, locally-hosted AI tools for small and medium businesses. All AI inference runs on your hardware — no data leaves your network.

## Products

| Product | Description |
|---------|-------------|
| **[PIKA](pika/overview.md)** | Document Q&A powered by RAG. Upload documents, ask questions, get answers grounded in your data. |
| **[VERA](vera/overview.md)** | OCR validation platform. Upload scanned documents, review AI-extracted text, correct errors, and export. |
| **[Hub](admin/hub.md)** | Centralised management UI for Ollama models, user accounts, and licensing. |

## Architecture

All products connect to a shared **Ollama** instance for local AI inference. Hub provides centralised user management — PIKA and VERA delegate authentication to Hub.

```
                ┌──────────────┐
                │   Ollama     │
                │   :11434     │
                └──────┬───────┘
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼───┐   ┌─────▼────┐  ┌────▼───┐
    │  PIKA  │   │   VERA   │  │  Hub   │
    │  :8000 │   │   :4000  │  │  :2000 │
    └────────┘   └──────────┘  └────────┘
```

## Quick Links

- [Hardware Requirements](installation/requirements.md)
- [Quick Start Guide](installation/quick-start.md)
- [License Activation](admin/licensing.md)
- [Troubleshooting](troubleshooting.md)

## Support

For support, contact us at **hello@aidoo.biz**.
