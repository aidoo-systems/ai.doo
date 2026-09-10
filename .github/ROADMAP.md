# ai.doo Enterprise Readiness Roadmap

This roadmap turns the September 2026 engineering and product audit into an ordered delivery plan for PIKA, VERA, and Hub.

The immediate objective is to make the suite safe and repeatable for founder-assisted corporate pilots. Self-service installation and broader enterprise claims come only after the release gates below pass.

## Delivery principles

- Fix security and data-loss risks before adding product features.
- Maintain one canonical, versioned suite distribution.
- Release only after a clean end-to-end installation test passes through TLS.
- Describe only behaviour that is implemented, tested, and measurable.
- Treat Hub as the suite control plane rather than a separately marketed product.

## Phase 0: Stop-ship fixes

Target: safe controlled pilots.

- [x] Replace VERA's public file mount with authenticated delivery limited to registered document files.
- [x] Add explicit role checks to PIKA administration, corpus, model, and backup operations.
- [x] Restrict Hub model installation and deletion to administrators.
- [x] Enforce VERA document ownership and reviewer assignment across backend endpoints, including images, exports, and status streams.
- [x] Bind document access to immutable Hub account identifiers.
- [x] Enforce current Hub account status, roles and security versions in VERA sessions; remove VERA outage credential login fallback.
- [x] Check current account identity, security version and role in PIKA and Hub browser sessions, including pending Hub two-factor logins.
- [x] Add durable server-side logout revocation for PIKA and Hub signed cookies.
- [x] Bind PIKA history and queued-query ownership to permanent subjects before allowing suite-wide username reuse.
- [ ] Add directory-backed assignee selection, team access, and the reviewer assignment interface.
- [ ] Back up and restore VERA's database and file storage as one recoverable unit.
- [ ] Enforce the licensed product list in PIKA and VERA.
- [ ] Remove or qualify unsupported security, audit, batch, citation, and streaming claims.

### Exit criteria

- An ordinary user cannot perform an administrative action in any product.
- A user cannot retrieve a VERA document they are not authorised to view.
- A backup restore recovers the database, original documents, generated pages, and audit history.
- Automated tests cover all affected permission boundaries.

## Phase 1: One reliable installation

Target: a repeatable installation on a clean customer host.

- [ ] Publish every image under one ai.doo registry namespace.
- [ ] Pin suite components to tested semantic versions or image digests.
- [ ] Fix VERA's build-time browser API configuration.
- [ ] Route all VERA API paths correctly through the TLS proxy.
- [ ] Make TLS the default remote deployment path.
- [ ] Persist PIKA source documents in the generated deployment.
- [ ] Include VERA worker, scheduler, backup, PostgreSQL, and Redis services.
- [ ] Check every required executable, including OpenSSL, before installation.
- [ ] Pull and warm the selected LLM as part of guided setup.
- [ ] Fail installation when a required service is unhealthy.
- [ ] Add an automated clean-host suite test covering login, upload, query, review, export, container recreation, backup, and restore.
- [ ] Publish a compatibility matrix and tested upgrade and rollback procedure.

### Exit criteria

- A supported clean host reaches a working TLS deployment without repository-specific manual steps.
- Recreating every application container preserves customer data.
- The end-to-end release test passes against the exact published images.
- A failed dependency or health check returns a failed installation, not a success message.

## Phase 2: Corporate product workflows

Target: a pilot users can evaluate without founder guidance.

### PIKA

- [ ] Preserve page, section, and source coordinates during document extraction.
- [ ] Show clickable citations with the exact supporting passage.
- [ ] Add document collections and retrieval-time access control.
- [ ] Add metadata filters, hybrid retrieval, and optional reranking.
- [ ] Unify queued execution and token streaming with user attribution and cancellation.
- [ ] Add one high-value connector, initially SharePoint or OneDrive, with incremental and permission-aware synchronisation.

### VERA

- [ ] Add a persistent document inbox with status, age, owner, assignee, confidence, and error indicators.
- [ ] Add batch upload, retry, cancellation, search, filtering, and resumable review links.
- [ ] Move PDF conversion out of the HTTP request and into background work.
- [ ] Reuse one warmed OCR engine per worker.
- [ ] Surface UBL and Factur-X outputs in the user interface.
- [ ] Add a configurable downstream handoff through API, SFTP, or an accounting integration.

### Hub

- [ ] Add Microsoft Entra ID compatible OIDC login.
- [ ] Add groups, per-product grants, role mapping, session revocation, and service credential rotation.
- [ ] Add a suite dashboard for service health, versions, queues, model capacity, backups, and updates.
- [ ] Add customer branding and a guided first-run experience.

## Phase 3: Performance, assurance, and evidence

Target: evidence that supports corporate procurement.

- [ ] Benchmark supported hardware profiles and recommend models automatically.
- [ ] Report P50 and P95 time to first token, total latency, queue wait, tokens per second, OCR seconds per page, and supported concurrency.
- [ ] Keep production models warm and separate or schedule competing PIKA and VERA workloads.
- [ ] Add retrieval and citation evaluation datasets for PIKA.
- [ ] Add field accuracy and manual correction measurements for VERA.
- [ ] Publish an enterprise assurance pack covering architecture, data flow, threat model, ports, encryption guidance, RBAC, SBOMs, patching, RPO, RTO, offline updates, support, and SLA.
- [ ] Complete an independent penetration test before claiming enterprise readiness.

## Commercial validation

- [ ] Interview at least five stalled or lost prospects and record the actual buying blockers.
- [ ] Select one initial customer profile and workflow for each product.
- [ ] Position PIKA around private, verifiable policy and operations answers.
- [ ] Position VERA around human-verified processing for one document type and downstream system.
- [ ] Replace the 14-day DIY evaluation with a four-to-six-week, outcome-based paid pilot.
- [ ] Define one baseline and one target KPI before every pilot.
- [ ] Produce a 90-second product video, synthetic-data demonstration, one-page architecture, security overview, and benchmark sheet.
- [ ] Replace low per-seat anchoring with an annual platform and support package, using seats for expansion.
- [ ] Publish the first measured customer case study before expanding into additional verticals.

## Recommended first pilot success measures

### PIKA

- Users can verify every material answer against an exact page and passage.
- The authorised test set meets an agreed answer and citation accuracy threshold.
- Warm P95 time to first token and total response time meet the agreed hardware target.
- Access tests prove that restricted documents never appear in another group's retrieval results.

### VERA

- Average review time per document improves against the customer's current process.
- Field accuracy and manual correction rate meet the agreed threshold.
- Every document is attributable to an owner and reviewer.
- Export completes successfully into the agreed downstream workflow.

## Current status

| Workstream | Status | Priority |
| --- | --- | --- |
| VERA authenticated document delivery | Complete, pending release | P0 |
| PIKA and Hub administration boundaries | Complete, pending release | P0 |
| VERA ownership and reviewer access API | Implemented and tested, pending release | P0 |
| Hub account subjects and VERA identity-bound access | Implemented and tested, pending release | P0 |
| VERA session lifecycle and verification-outage UI | Implemented and tested, pending release | P0 |
| PIKA/Hub account-change enforcement | Implemented and tested, pending release | P0 |
| PIKA/Hub logout revocation and PIKA historical-data identity | Implemented and tested, pending release | P0 |
| Assignment UI and team access | Not started | P0 |
| Complete VERA backup and restore | Not started | P0 |
| Product-scoped licence enforcement | Not started | P0 |
| Canonical versioned installer | Not started | P1 |
| VERA operational inbox | Not started | P1 |
| PIKA verifiable citations and ACLs | Not started | P1 |
| OIDC and suite control plane | Not started | P1 |
| Benchmarks and assurance pack | Not started | P2 |
| Commercial pilot package | Not started | P2 |

## Delivery notes: 10 September 2026

- New VERA uploads belong to the authenticated uploader. Administrators can assign or clear an owner and reviewer using `PATCH /documents/{document_id}/access`.
- Existing unowned documents remain administrator-only after migration `0006_document_access`.
- Document permissions cover viewing, review, summaries, exports, audit history, status streams, and registered file delivery. Page validation now rejects a page belonging to a different document. Streams stop when reviewer access is revoked.
- Access changes record the administrator in the audit log. This does not yet attribute every other review/export event.
- Added migration regression coverage for legacy-data preservation, rollback, and repeat upgrades on SQLite and PostgreSQL. Fixed historical migration defects blocking clean installs on both database engines.
- Assignment is API-only for now. Hub now supplies permanent UUID account subjects, and VERA uses these for document access. Non-null assignments require an active account verified through Hub. Unknown or disabled accounts and unavailable directory responses leave all access unchanged.
- Migration `0007_account_subjects` preserves existing username labels but does not infer account identity from them. Older username-only documents become administrator-only until explicitly reassigned. Upgrade Hub first, then VERA, and require users to sign in again. No live database has been migrated.
- Keep the suite-wide restriction on username reuse until PIKA history and queued-query ownership move to permanent subjects. VERA and PIKA check current account status with a non-sliding 30-second cache and no longer use cached passwords to log in during Hub outages. Hub checks the local account database on each browser request. Durable logout revocation, group membership, a directory-backed picker and the assignment UI remain open work.
- Identity verification passed locally: 244 Hub tests, 236 VERA backend tests with 75.14% coverage, SQLite and PostgreSQL upgrade/rollback checks, and lint in both products. Tests used disposable databases; the PostgreSQL container was removed afterwards. Nothing has been committed, pushed or deployed.

## Session lifecycle follow-up

- Hub increments `auth_version` atomically when an account's password, role or enabled state changes. The API-key-protected account-status endpoint resolves permanent subjects and exposes no credential or MFA material.
- VERA checks current status before protected requests and each stream event. Missing, disabled and obsolete-version sessions are denied; a failed Hub check after cache expiry returns 503 instead of using stale access. Confirmed invalid sessions are removed from Redis.
- A successful login always requires Hub. Existing credential-cache entries are no longer read or written and expire under their original TTL. Sessions without `auth_version` must sign in again after upgrade.
- The browser rechecks sessions every 30 seconds, redirects revoked sessions to sign-in, and hides the workspace behind a retry screen when verification is unavailable. This is a bounded check, not instantaneous revocation, and does not retract downloaded content or cancel already-authorized work.
- Follow-up verification passed locally: 264 VERA backend tests with 77.30% coverage, 55 frontend tests, 246 Hub tests, TypeScript checks and Python lint. Hub migration tests cover legacy databases and repeated execution. Nothing committed, pushed, or deployed; PIKA and Hub browser-session enforcement remain the next security work.
- Deployment notes and the permission matrix are in `vera/.github/DOCUMENT_ACCESS.md`. No running customer database has been migrated by this work.

## PIKA and Hub account-change enforcement

- PIKA permissions now use a verified request principal. Account changes take effect after at most 30 seconds of cached facts; expired-cache verification failures deny access. Valid automation keys remain independent of stale browser cookies.
- PIKA query and generation streams recheck each chunk. The direct generation endpoint now requires authentication.
- Hub checks signed browser and pending two-factor sessions against its local database on each request. Model-pull streams recheck each event. Missing, disabled or changed accounts cannot continue with old cookie roles.
- Signed-cookie logout replay protection is still open in both products. PIKA also retains username-based history and queued-query ownership. Keep both issues in the release gate rather than claiming full session lifecycle coverage.
- Verification: all 254 Hub tests and 96 focused PIKA authentication/API tests passed. Lint passed for Hub and all changed PIKA files. PIKA's broad suite was interrupted after 121 passes and four outdated administrator-fixture failures; those fixtures were corrected and passed in the focused rerun. The entire PIKA suite has not been reverified.
- HTTP test startup no longer downloads/loads an embedding model on each test. Disposable test containers have been removed. No production deployment, commit or push was performed.

## Durable logout and PIKA ownership milestone

This section supersedes the earlier open-work and verification snapshots above.

- Hub and PIKA now require durable per-login session grants. Logout revokes a copied cookie on subsequent requests and stream events without relying on account-cache expiry. Independent logins remain valid. Missing grants deny access; logout storage failures report 503 and allow a retry.
- Hub rotates pending grants when two-factor authentication completes. Both products enforce absolute grant expiry. Old cookies require a fresh login after upgrade. This is application-local logout, not global suite sign-out.
- PIKA history, queue submission, status, cancellation and clearing use verified immutable subjects. Streamed and queued answers retain usernames only as display labels. API-key automation has its own identity and no all-users history mode. Feedback updates are isolated by subject.
- Legacy history is preserved under existing retention limits but is not reassigned or exposed based on a username. Back it up and review ownership before any separate reassignment. Queues remain process-local; distributed work and multi-worker JSON-history coordination are not included.
- Final regression passed: 378 PIKA tests, 260 Hub tests, 264 VERA backend tests with 77.30% coverage, and 55 VERA frontend tests. VERA TypeScript, Hub/VERA lint, all changed PIKA-file lint and whitespace checks passed. Three PIKA query fixtures were updated to provide a real automation identity rather than a bare mocked authentication boolean.
- Upgrade Hub first, then the matching PIKA and VERA revisions. Persist the session databases and signing secrets. Do not restore stale session grants during recovery; invalidate them or rotate signing secrets before reopening access. Keep username reuse restricted until the coordinated deployment is complete.
- No push, deployment, live migration or customer-data change was performed. The clean-host TLS installation and complete backup/restore gates remain open.
- Next implementation milestone: VERA's persistent inbox and directory-backed reviewer assignment interface.
- Local product commits: PIKA `f70309e`, Hub (`ollama`) `490939d`, VERA `43bce2e`. These form the coordinated security milestone; they have not been pushed or deployed.
