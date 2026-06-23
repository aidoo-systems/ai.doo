# Running a Pilot

A pilot is a fixed-scope deployment of the ai.doo suite in your infrastructure, designed to prove value before committing to a full rollout.

## What's Included

Every pilot includes:

- **Product deployment** on your server or VM (PIKA, VERA, or both)
- **Hub setup** with admin account, license activation, and user provisioning
- **TLS and reverse proxy** configuration (Caddy recommended; your existing proxy also supported)
- **Model selection** and initial pull for your use case
- **Handover documentation** covering your specific deployment

## Timeline

| Phase | Duration | What happens |
|---|---|---|
| **Discovery** | 1 call (30-60 min) | We learn your environment, constraints, and goals. Free, no obligation |
| **Deployment** | 1-3 days | We install, configure, and verify the suite on your infrastructure |
| **Evaluation** | 2-4 weeks | Your team uses the system with real data. We're available for questions |
| **Review** | 1 call | Review against success criteria. Decide on next steps |

Total elapsed time: **3-5 weeks** from first call to decision.

## Success Criteria

Before the pilot starts, we agree on measurable success criteria together. Examples:

- **PIKA:** "5 users can query the employee handbook and get accurate, cited answers within 10 seconds"
- **VERA:** "The team processes 50 invoices through OCR with <5% manual correction rate"
- **Both:** "The suite runs for 2 weeks with no unplanned downtime and all users can log in via Hub"

If the pilot doesn't meet the criteria, you walk away with no further obligation.

## Pricing

| Item | Cost |
|---|---|
| **Product license** | From £50/seat/year (PIKA or VERA individually) |
| **Pilot deployment assistance** | From £3,000 (fixed scope, agreed upfront) |
| **14-day evaluation** | Included free with every license — no deployment assistance required |

!!! tip "Self-service evaluation"
    You can run a 14-day evaluation yourself using the [installer](../installation/installer.md) with no cost and no sales call. The evaluation includes full features for up to 3 users. Paid deployment assistance is for teams who want hands-on setup help.

## What Happens After the Pilot

| Outcome | Next step |
|---|---|
| **Success** | Convert to annual license. Same deployment, no reinstall. We continue support |
| **Needs adjustment** | Extend the pilot or adjust scope. No pressure |
| **Not a fit** | You keep the deployment. License enters soft enforcement (read-only) after 14 days. No data is deleted |

## Hardware Requirements

The ai.doo suite runs on a single Linux server. Minimum specs for a pilot:

| Component | Minimum | Recommended |
|---|---|---|
| CPU | 4 cores | 8 cores |
| RAM | 16 GB | 32 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| GPU | Not required | NVIDIA GPU (8 GB+ VRAM) for faster inference |
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |
| Network | Outbound HTTPS (for image pull only) | Same |

See [Requirements](../installation/requirements.md) for full details.

## Get Started

Email **hello@aidoo.biz** with:

1. Which products you're interested in (PIKA, VERA, or both)
2. How many users will participate in the pilot
3. What you'd like to achieve (even a rough idea is fine)

We'll schedule a discovery call within 2 business days.
