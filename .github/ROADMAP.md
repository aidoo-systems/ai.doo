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
- [x] Add directory-backed assignee selection and the reviewer assignment interface.
- [ ] Add group membership and team document access.
- [x] Back up and restore VERA's database and file storage as one recoverable unit (offline tooling and round-trip tests implemented, pending release).
- [ ] Complete a clean-host recovery drill covering login, permissions, document viewing/export, fresh sessions and rollback timing.
- [x] Exercise restored API login, image permissions, review/export and session isolation with disposable PostgreSQL/Redis and an HTTP Hub fixture.
- [x] Repeat recovery checks against real Hub and a packaged VERA frontend through locally trusted Caddy TLS (synthetic data; not a clean-host installer test).
- [x] Resolve and re-audit VERA frontend dependency findings, including the critical Next.js advisory reported on 11 September 2026 (patched image verified locally, pending release).
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
- [x] Configure VERA's public API origin at container startup for both source-built and reusable frontend images (verified locally; publishing remains pending).
- [x] Wire runtime frontend configuration and an image-capability guard into the installer; publishing the tested distribution remains pending.
- [x] Route VERA API paths through the installer/reference TLS proxy, with real-browser same-origin login, image/export and authenticated status-stream checks.
- [ ] Make TLS the default remote deployment path.
- [x] Persist PIKA source documents and application state in the generated deployment; retain its session-signing key.
- [x] Include VERA worker, scheduler, PostgreSQL, persistent Redis and an opt-in offline recovery helper (not scheduled online backups).
- [ ] Check every required executable, including OpenSSL, before installation.
- [ ] Pull and warm the selected LLM as part of guided setup.
- [ ] Fail installation when a required service is unhealthy.
- [x] Fail installation on HTTP readiness failure, including separate VERA API and frontend checks. Worker/model readiness remains open.
- [x] Gate generated VERA services on successful migrations and wait for declared container health, including worker-node ping. Live OCR/model readiness remains open.
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

- [x] Add a persistent document inbox with status, age, owner, assignee, confidence, and error indicators.
- [x] Add inbox search, filtering, pagination and resumable saved-document links.
- [x] Add batch uploads and failed-document retry with attempt-fenced OCR workers (implemented and tested, pending release).
- [x] Add inbox-level cancellation with confirmation and attempt-specific checks (implemented and tested, pending release).
- [x] Recover unconfirmed token review drafts in the same tab, scoped to account/page/version (implemented and tested, pending release).
- [ ] Add guided recovery for legacy failed pages with saved review data.
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
| Directory-backed assignment UI | Implemented and tested, pending release | P0 |
| Group membership and team access | Not started | P0 |
| Complete VERA backup and restore | Offline, real-Hub/API and Chromium/TLS drills passed; clean-host/live-OCR/rollback gates pending | P0 |
| VERA frontend dependency remediation | Full npm audit clean; patched image, 101 tests and real-Hub/TLS drill passed; pending release | P0 |
| Product-scoped licence enforcement | Not started | P0 |
| Canonical versioned installer | Source-build API/CORS wiring and existing Caddy configuration corrected; canonical distribution pending | P1 |
| VERA operational inbox | Inbox, batch uploads, failed-document retry and cancellation implemented and tested, pending release | P1 |
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

## VERA inbox and assignment milestone: 11 September 2026

- Added `/inbox` with permission-filtered counts and pagination, filename/ID search, status and ownership filters, age, reviewer and mean OCR confidence. Processing failure is shown as a status; confidence is not presented as an accuracy guarantee.
- Administrators can search active Hub accounts and assign or clear an owner/reviewer. Selected permanent subjects are revalidated without cache before an atomic access/audit update. Directory failures or deleted accounts do not partially change access.
- Saved-document URLs reopen server-side reviews and survive sign-in using allowlisted return destinations. Unconfirmed browser-only edits are not persisted; draft recovery remains open.
- Added `0008_document_filename`, retaining new upload basenames and using ID labels for legacy documents. Upgrade Hub's directory endpoint first, then migrate/upgrade VERA after verified backups.
- Verification passed: 279 VERA backend tests with 77.70% coverage, 74 frontend tests, 265 Hub tests, Python lint and production frontend build. SQLite and disposable PostgreSQL migration upgrade/rollback checks passed. Visual browser review, clean-host TLS and complete backup/restore checks remain release work.
- This follow-up is uncommitted. Nothing pushed, deployed or migrated against customer data. Batch upload, retry, team access and browser-draft recovery remain open.

## VERA batch upload and retry milestone: 11 September 2026

This supersedes the previous batch/retry open-work snapshot.

- The inbox accepts batches of up to 20 files, uploads sequentially and displays each file's result independently. Fresh CSRF verification applies to every upload. Authentication, rate-limit, queue and uncertain network failures pause remaining files. Unknown outcomes are never automatically resent; saved-document links are retained when broker publication fails.
- Failed documents can be retried by their owner, assigned reviewer or an administrator. Atomic claims reject duplicate retries. Attempt IDs fence stale workers at claim, token-write, completion and failure boundaries. Successfully processed pages and saved reviews remain intact. Ambiguous legacy failed pages are blocked from automated retry pending manual recovery.
- Recovery now covers lost queued jobs; cancellation cannot overwrite a replacement attempt. Existing rate limits and Beat timeout/schedule remain in force. Inbox-level cancellation, durable browser drafts and a guided legacy recovery workflow are still open.
- Upload conversion/scanning and broker publication no longer run on the async request event loop. No performance benchmark has yet been run.
- Verification: 292 backend tests (82.36% coverage), 82 frontend tests, TypeScript, Python lint and production build passed. All 13 new backend retry/worker tests also passed against disposable PostgreSQL, using mocked broker/OCR extraction and real database writes. Live broker/worker integration, concurrency/load and visual browser checks remain release gates.
- Deployment must drain existing OCR jobs and stop all old workers before coordinated API/worker replacement. Old workers do not enforce attempt IDs. No new migration beyond the pending inbox migration is needed. Nothing committed, pushed or deployed; no customer data changed.
- Next: inbox-level cancellation, then browser-draft recovery. Complete backup/restore and clean-host installation remain required before enterprise release.

## VERA inbox cancellation milestone: 11 September 2026

- Queued and processing inbox rows offer per-document cancellation with explicit confirmation, a keep-processing option, pending-request protection and local error feedback. The confirmation explains that completed pages are retained and canceled documents cannot yet be retried.
- The request targets the attempt displayed in the inbox. Changed attempts reset the UI confirmation and are rejected by the API. Document permissions and fresh CSRF verification remain mandatory.
- Cancellation commits its database fence and attributed audit event before notifying the queue. Queue outages return a warning without undoing cancellation. Workers are not force-killed; running extraction may finish computing, but canceled attempts cannot save results. Completed pages, reviews and files are preserved.
- Verification passed: 301 backend tests (82.62% coverage), 91 frontend tests, TypeScript, Python lint and production build. All 22 retry/cancellation tests passed against disposable PostgreSQL. Broker/OCR calls remain mocked; live worker integration, concurrent-load tests and browser visual review remain release work.
- No new migration is required. The coordinated API/worker rollout and old-worker drain remain mandatory. Disposable test data was removed; nothing committed, pushed or deployed, and no customer data changed.
- Next: recovery of unsaved browser review drafts. Guided legacy recovery, complete backup/restore and clean-host installation remain open.

## VERA tab-local draft recovery milestone: 11 September 2026

- Unconfirmed corrections and reviewed-token selections survive reload/navigation in the same tab via session storage. The user must explicitly restore or discard them. A restored draft is not automatically submitted as a review.
- Drafts are scoped to the verified account subject, document and page version. Changed account identity remounts the workspace. Stale/closed reviews block automatic restore and submission; correction text remains available for manual inspection and discard. Status-only updates no longer silently advance the version of loaded tokens.
- Successful validation clears the draft independently of summary generation. Failed/conflicting validation retains it. Explicit sign-out clears VERA draft keys in that tab; unrelated storage is preserved.
- Recovery expires after 24 hours without a write, with expired records removed on access. Each draft is capped at 500,000 serialized characters. Storage failures are visible. Browser session storage is plaintext and may survive browser session restoration; this is not secure deletion, cross-device sync or a server autosave system. Shared/sensitive workstation policy and real browser recovery checks remain release gates.
- Verification: 302 backend tests (82.66% coverage), 101 frontend tests, TypeScript, Python lint, whitespace checks and production build passed. No new migration is required. Nothing committed, pushed or deployed; no customer data changed.
- Next: complete VERA backup and restore, a remaining enterprise release blocker. Guided legacy recovery and clean-host installation also remain open.

## VERA offline backup and restore milestone: 11 September 2026

- Added a recovery CLI and PostgreSQL 16 helper image. Bundles contain a database snapshot, the complete document file tree, explicitly selected configuration and a SHA-256 manifest. PostgreSQL and SQLite/WAL paths are supported; runtime document paths must be absolute POSIX paths within the recorded DATA_DIR.
- Restore uses a new directory and, for PostgreSQL, a new empty database with transactional import. Original records, ownership/reviewer subjects, page versions, corrections and audit history are retained. Referenced-file checks, source/target separation, corruption detection and no-overwrite guards reject unsafe or incomplete recovery attempts.
- Operators must stop all writers and provision fresh dedicated Redis before reopening. Sessions/tasks are not backed up or replayed. Hub identities, deployment secrets, matching image artifacts and external encrypted/off-host storage remain coordinated operational requirements.
- Corrected the existing database-only backup script's pipeline failure handling and Windows/Linux line-ending issue. README/environment comments now distinguish its scheduled dumps from complete recovery bundles.
- Verification: all 16 new recovery tests passed, including a real PostgreSQL restore on VERA's full migration schema, SQLite WAL/CLI round-trips and scheduled-dump success/failure checks. Tests used disposable databases/files; no running customer installation was touched. Application regression tests from the preceding milestone were not rerun because application code did not change.
- Runbook: `vera/.github/RECOVERY.md`. Full offline tooling is implemented locally, but the clean-host UI/login/permission/export drill, recovery timings and rollback evidence remain release gates. Nothing committed, pushed or deployed.
- Next: exercise restored VERA through the application on an isolated fresh installation, then finish the clean-host installer checks.

## VERA restored-API drill milestone: 11 September 2026

- Added a repeatable PowerShell runner and test-only Hub fixture. Docker services/storage are uniquely labelled, internal-network-only and disposable, without host ports or customer installations. Cleanup checks resource labels and names.
- After actual database-plus-files restore, six HTTP assertion groups passed through real VERA middleware and PostgreSQL/Redis: old-session/queue-state separation, owner/reviewer access and outsider denial, fresh CSRF with review/export, version/audit persistence across API process restart, Hub-outage rejection/recovery, and copied-cookie logout revocation.
- Uses synthetic accounts/documents, read-only working-tree source and a non-root API process. Hub is an HTTP fixture, not real-Hub compatibility evidence. No browser/TLS or OCR worker runs; process restart is not container recreation.
- Corrected a Windows PowerShell cleanup quoting issue found on the first run. The subsequent drill and automatic cleanup succeeded. Roughly 10 seconds for HTTP assertions on synthetic data is not a recovery-time benchmark.
- Instructions: `vera/scripts/RECOVERY_DRILL.md`. Application code was unchanged; earlier broad unit suites were not rerun. Nothing committed, pushed or deployed; temporary test storage was removed.
- Next: real-Hub and packaged clean-host integration, including browser/TLS, live upload/OCR, container recreation and measured rollback/recovery evidence.

## VERA real-Hub and browser/TLS milestone: 11 September 2026

- Extended the disposable recovery runner with real-Hub and optional Chromium/TLS modes. Hub creates three synthetic accounts using its actual schema, bcrypt and permanent UUIDs. Its normal fresh-install trial remains unmodified. No customer credentials, databases or host certificate stores are used.
- Eight API assertion groups passed, including the service-key-protected directory, restored ownership and review/export, old-session separation, actual Hub process outage/recovery, copied-cookie logout rejection and disable/re-enable revocation after a warmed 30-second account cache expires naturally.
- Four browser assertion groups passed with certificate validation enabled: protected-route redirect and real-Hub login, Secure/HttpOnly/SameSite host-only cookies, saved-document navigation with both page thumbnails, downloaded text export and authenticated reload, with no unexpected JavaScript/network failures. A private Caddy CA is trusted only inside the disposable browser container.
- Found and fixed four deployment defects: the frontend API URL was passed only at runtime instead of build time; Compose omitted backend CORS configuration; the Caddy log filename contained an unsupported request-host placeholder that prevented startup; and VERA's CSP did not permit images from its separate API origin. The test uses the actual `ollama/Caddyfile`, not a simplified replacement proxy.
- Verification: eight real-Hub/API groups, four Chromium/TLS groups, 101 frontend tests, frontend production build, Python lint, PowerShell parsing and Caddy/Compose validation passed. The final API phase took about 44 seconds, including deliberate cache expiry; browser assertions took about five seconds. These are not performance or disaster-recovery benchmarks. Automatic cleanup passed; no customer service was changed.
- New release blocker: `npm audit --omit=dev` reports four production-package findings: Next.js (critical), nanoid, postcss and sharp (high). This is dependency-audit evidence, not proof of exploitability. Do not claim the built image is security-cleared. No automatic dependency upgrade was applied during the integration milestone.
- Still open: dependency remediation, public API configuration for published images, installer/reference-proxy convergence, public ACME and full clean-host installation, browser draft recovery, live upload/OCR/summaries, container recreation and measured recovery/rollback. Nothing committed, pushed or deployed. Next: triage and patch the production dependency findings before proceeding toward release.

## VERA frontend dependency milestone: 15 September 2026

- Patched Next.js to 15.5.25, sharp to 0.35.4 and PostCSS to 8.5.28, with compatible transitive fixes including nanoid 3.3.19. Next.js remains on major 15 and React on 18.3.1. No advisory suppression was added.
- Updated test tooling to Vitest/mocker 4.1.11 and Vite 6.4.3. The initial Vitest 3 update still carried a moderate mocker advisory, so the maintained patched version was selected instead. Full and production-only npm audits now report zero known vulnerabilities.
- Moved the frontend Docker build/runtime and CI to Node.js 24 LTS. CI configuration now requires the dependency audit, TypeScript checks and a production build as well as tests; high/critical advisories fail the frontend test job. No remote workflow was triggered.
- Verification: all 101 frontend tests, type checking, CI YAML validation and the production image build passed. Fixed four test-only ES2020 `Array.at` type errors using `mock.lastCall`, without changing application behaviour or widening the browser target.
- The Node.js 24.21.0 runtime runs as UID 1001 and passed a native sharp PNG smoke check. Trivy 0.72.0 reported no high/critical image findings using a fresh vulnerability database and no exclusions. It warned that Alpine 3.24 was absent from its EOL list; lower-severity image findings and lifecycle attestation are not covered by this result.
- The patched image passed all eight real-Hub/API and four Chromium/TLS recovery groups. Test resources and the temporary scan archive were removed; no running customer installation was changed. These synthetic checks are not benchmarks or the full clean-host release gate.
- Evidence and tested image ID: `vera/.github/FRONTEND_SECURITY.md`. Nothing committed, pushed or deployed. Published-image API configuration, canonical installer/proxy convergence, live upload/OCR, public ACME, container recreation and measured rollback remain open. Next: make published frontend images configurable at installation time before the clean-host installer drill.

## VERA frontend runtime configuration milestone: 15 September 2026

- A single frontend image now accepts `VERA_PUBLIC_API_URL` at container startup, with `NEXT_PUBLIC_API_BASE_URL` retained as a compatibility fallback. Changing customer origins requires container recreation and a browser reload, not another build. Old images must first be upgraded to this revision.
- Only the public API origin is embedded in dynamically rendered, no-store HTML. Sign-in, authentication/CSRF, shared API requests and document image/export/stream URLs use the same runtime value. Environment files are excluded from the image build context.
- Production container startup rejects missing, empty and malformed settings. Credentials, paths, queries and fragments are rejected without echoing the supplied value. Explicit `/` supports same-origin requests; HTTPS pages refuse HTTP API configuration. Same-origin proxy correctness remains a separate release gate.
- Verification: 127 frontend tests, TypeScript, production Docker build without API build arguments, dependency audit (zero known findings), Python lint and PowerShell/Compose validation passed. One draft-recovery test initially timed out under unrestricted parallel load, then passed alone and in the full suite with two workers; no application workaround was introduced.
- The exact local image passed three startup-rejection checks, eight real-Hub/API groups and five Chromium/TLS groups. Two containers using that image served distinct runtime origins, including the legacy variable, with no-store HTML. Browser login, secure cookies, restored images, export and authenticated reload passed. API/browser phases took about 46/8 seconds on synthetic data, not a benchmark.
- Local image: `vera-frontend-runtime:local`, image ID `sha256:eda95cf0651c6d1c3bee07d33fd5402095b211017fd1c9926062d06b82f8d967`. Runbook: `vera/.github/FRONTEND_RUNTIME.md`. The prior image scan is historical evidence, not a scan of this rebuilt artifact.
- Automatic cleanup passed. No customer installation or data changed; nothing committed, pushed, published or deployed. Next: converge the canonical installer and proxy around a versioned suite, then exercise clean-host TLS installation, live upload/OCR and authenticated status streaming, container recreation and measured recovery/rollback.

## Installer proxy and safety milestone: 16 September 2026

- Corrected the generated same-origin VERA proxy to route authentication, documents and nested pages/exports/streams, account directory, registered files, LLM and health paths to the backend. Whole-segment matching keeps lookalike frontend paths out of the API. Internal and metrics paths are denied, including their bare roots.
- VERA's generated CSP now allows its inline runtime/Next.js bootstrap without `unsafe-eval`. Runtime configuration uses explicit same-origin routing and the backend uses secure cookies under Caddy. The reference Caddyfile is an exact generated-output fixture, checked for drift; its Compose overlay now explicitly supplies domain/email variables. The repo-root separate-origin proxy remains a compatibility configuration, not another canonical installer template.
- Added a selectable frontend image and a runtime-capability check before stack startup. Older images fail rather than silently ignoring the new setting. This is not yet an immutable, compatibility-certified suite: default `latest` references and registry publication remain open.
- HTTP service ports bind to loopback even without Caddy. OpenSSL is checked before secret generation. HTTP checks have bounded requests, cover both VERA API and frontend, and fail the installation instead of reporting success. They do not verify workers or model readiness and do not roll back a failed installation.
- Fresh-install safety: a non-empty or symlink target is refused before configuration/secrets are written. Restrictive file creation permissions apply to installation. This is not an upgrade workflow. Documentation now removes the unverified ten-minute claim and explains the remaining release gates and currently ineffective `--yes` flag.
- Verification: all 50 installer BATS tests passed, including actual Compose parsing across six product/TLS combinations and the reference overlay. The other 22 shell/static checks also passed. An initial test container lacked the Compose CLI; rerunning with it installed passed. Bash syntax, Python lint, PowerShell parsing and whitespace checks passed. No remote CI was triggered.
- Extended the disposable recovery runner with `-InstallerProxy`: it executes only the actual installer's Caddyfile generator, then uses those routes/headers under a privately trusted CA. All eight real-Hub/API and six Chromium/TLS groups passed, including authenticated EventSource delivery and private endpoint denial. An initial helper-client certificate failure was corrected by issuing route checks within trusted Chromium, with no TLS bypass. Final API/browser phases took about 57/8 seconds on synthetic data, not a benchmark.
- Both drill runs cleaned up their labelled resources. The generated Compose stack itself, public ACME, Hub/PIKA browser pages, live upload/OCR, model warm-up, container recreation and timed rollback remain unverified. Application source was unchanged in this milestone, so broad application unit suites were not rerun.
- Nothing committed, pushed, published or deployed; no customer installation was changed. Next: complete and validate generated service/storage wiring, including VERA database driver/migrations, workers/scheduler/recovery and persistent PIKA source documents, before the full clean-host suite drill.

## Generated storage and background-services milestone: 16 September 2026

- The generated suite now uses persistent named volumes for Hub identities, PIKA application data and source documents, VERA PostgreSQL/files/Redis, and Beat state. PIKA's signing key is generated once and retained in `.env`. These changes are for fresh installations, not automatic migration from older bind mounts.
- Corrected VERA's PostgreSQL URL to use the installed psycopg driver. A network-isolated one-shot initializer sets ownership on application volume roots only; a one-shot migration must finish successfully before API, worker and scheduler startup. One selectable backend image supplies all four application roles. The API command does not race another migration.
- Removed VERA's unsafe migration-error fallback that stamped the schema as current. The standalone entrypoint now fails without launching the API. Unknown legacy schemas require verified backups and explicit operator review, not blind stamping.
- Added the missing Beat scheduler and persistent schedule path. Worker health targets its own Celery node. Redis uses AOF storage for ordinary container recreation; disaster recovery still requires fresh Redis. Corrected PIKA's health endpoint and removed unavailable curl assumptions from Hub/Ollama checks. Installer startup waits for declared container health before HTTP acceptance checks.
- Added an opt-in `vera-recovery` service with read-only source files and separate backup/restore volumes. It does not run automatically or attest that writers are stopped. Configuration/secrets, Hub recovery, protected off-host copies and restore into a new empty database remain operator requirements. No claim of scheduled online or complete suite backups is made.
- Verification: all 53 installer BATS tests passed, including resolved Compose service/storage contracts and six product/TLS combinations. Both new entrypoint tests passed, proving failed migration prevents stamping/API launch. Python lint and whitespace checks passed.
- A new disposable generated-stack drill passed real PostgreSQL migration, UID-1001 shared-file access, an actual broker/worker maintenance task, Beat schedule-file creation, PIKA/Hub short-lived container file persistence, PostgreSQL/Redis/worker recreation, and creation/verification of a database-plus-files recovery bundle. An injected migration failure prevented worker and scheduler startup. Both runs cleaned up their uniquely labelled containers, volumes and internal network, including synthetic backups.
- The drill uses local dependency images with current VERA backend source mounted read-only and no host ports. PIKA/Hub file checks use their image user/entrypoint settings, not running application UIs. No live OCR, LLM inference, public ACME, fresh full-suite installation or production performance/recovery benchmark was performed. Broad application suites were not rerun; application logic was unchanged apart from the tested startup safety fix.
- Runbook: `ollama/.github/GENERATED_STORAGE.md`. Nothing committed, pushed, published or deployed; no customer data changed. Next: exercise live upload/OCR and model readiness, then finish the version-pinned clean-host suite installation and upgrade/rollback gates.

## Live OCR and model-readiness milestone: 16 September 2026

- The generated installer now starts Hub/Ollama first, prepares the selected `--model` and requires a short completed, non-empty generation before continuing. Missing weights are downloaded with bounded requests; model listings alone no longer establish readiness. PIKA and VERA receive the same selection, defaulting to `llama3.2:3b`.
- VERA has a persistent OCR-model volume and a one-shot synthetic recognition check. API/worker startup depends on successful preparation; workers receive read-only weights and reuse a process-local engine instead of reconstructing it for every page. Blank OCR result pages are handled without a parsing exception. A matching rebuilt backend image is required; no registry artifacts were published.
- Extended the real-Hub, installer-proxy HTTPS drill with a fresh two-page PDF upload through Chromium, actual Redis/Celery OCR, page-specific recognised-text assertions, saved reviews, reload and UI text download. Review saves use authenticated browser API calls with fresh CSRF/version checks; token-selection UI coverage and LLM summaries are not claimed. Only synthetic OCR preparation has outbound access; the worker/application network remains private.
- Verification passed: all eight real-Hub/API and seven Chromium/TLS groups, 310 backend tests, 55 installer BATS tests and five model-readiness failure-path unit tests. Initial drill import-path and read-only SQLite test-storage issues were corrected before the passing reruns. Frontend source was unchanged, so its unit suite was not rerun.
- The installer's actual generation check also passed in an isolated CPU Ollama container using explicitly selected cached `tinyllama:latest` weights mounted read-only. No downloads or prompts were sent to the existing Ollama service, and its cache was retained. This does not validate the default 3B model, GPU sizing, answer quality, PIKA embeddings or sustained performance.
- The API/browser phases took about 60/41 seconds on synthetic fixtures, excluding provisioning/downloads. These are test timings, not an installation-time or performance promise. Disposable test resources and synthetic backups/documents were removed. No customer data changed; nothing committed, pushed, published or deployed.
- Runbooks: `vera/scripts/RECOVERY_DRILL.md`, `ollama/.github/GENERATED_STORAGE.md` and `docs/installation/installer.md`. Next: version-pinned suite packaging and clean-host acceptance, including real PIKA ingestion/query and VERA summaries, followed by measured upgrade/rollback and recovery gates. Keep these release blockers open.

## Suite image release-lock support: 22 September 2026

- Normal installer execution now requires `--release-lock <file>`, with exact SHA-256 image references for Hub, PIKA, VERA frontend/backend/recovery, Ollama, PostgreSQL, Redis and Caddy. Moving defaults require an explicit `--development-images` opt-in and are labelled unverified. No deployable lock or fabricated production digests were added.
- The allowlisted data parser rejects unknown, duplicate, missing and malformed entries without executing shell content. Validation precedes prerequisites, prompts, deployment files and startup. A normalized snapshot is saved beside Compose from the validated values. Release locks override inherited image variables and reject conflicting CLI image choices.
- All generated service roles and normal pulls use the selected pins; VERA backend roles share one digest. Recovery remains opt-in. Existing-directory protection is unchanged. This is fresh-install packaging, not an upgrade or rollback mechanism.
- Verification: 89 shell/configuration tests passed and one Unix-permission test was explicitly skipped on the Windows filesystem. This includes the existing 22 shell/static checks and 67 passing installer tests, with real Compose parsing of locked configurations across six product/TLS combinations. Five model-readiness unit tests, Bash syntax, Python lint and whitespace checks passed. The first portable test run exposed the filesystem permission limitation; snapshot-content validation now runs independently of the Linux-only permission assertion.
- Docker Desktop's Linux engine was unavailable. No container integration, clean-host installation, image publication or production-registry validation was performed. Checks ran through Git Bash/BATS and the daemon-free Compose parser, using synthetic digests and mocked pulls. Product application code did not change, so broad product suites were not rerun.
- Image pins do not authenticate a publisher or freeze independently downloaded LLM/OCR weights. Matching published artifacts, model identities, supported architectures, security/provenance evidence and real clean-host acceptance remain release blockers. The operator runbook is `ollama/.github/RELEASE_LOCKS.md`; installation docs were updated to remove the moving-master customer install command.
- No existing services or customer data changed; nothing committed, pushed, published or deployed. Next: restore Docker availability, verify Linux permissions and exercise exact rebuilt release candidates on a disposable clean host before publishing a verified suite lock. PIKA ingestion/query, VERA summaries and measured upgrade/rollback/recovery remain acceptance gates.

## Linux verification follow-up: 22 September 2026

- Docker became available and the Linux run passed all 90 shell/configuration tests without skips, including the release-lock mode-0600 check. All five model-readiness unit tests also passed. The initial broad run found CRLF shell files and an older test harness that changed the checkout; affected shell files were normalized to LF under the existing attributes, and model-pull tests now use per-test disposable script, mock, log and `.env` fixtures. The checkout stays read-only throughout testing.
- The generated-storage integration drill passed again: real PostgreSQL migration, non-root shared files, a queued worker task, scheduler state, PIKA/Hub file persistence, PostgreSQL/Redis/worker recreation, offline database-plus-files backup verification, and worker/scheduler startup rejection after an injected migration failure. Its uniquely labelled resources and synthetic backup were removed; cleanup was independently checked.
- This remains working-tree integration, not a clean-host release test. Inspection without a source mount confirmed that the existing `vera-backend:local` image lacks `app.services.ocr_readiness`. Rebuild matching candidate artifacts before testing the packaged suite; a source-mounted pass does not establish that the shipping image contains the changes.
- No existing services, customer data or released images were modified. No commit, push, publication or deployment was performed. Next: build coordinated candidate images, verify them without application-source mounts, then complete exact-digest clean-host acceptance and the remaining PIKA/VERA workflow and recovery gates.

## Packaged VERA backend candidate: 22 September 2026

- Built a separate local candidate, `vera-backend-candidate:20260922-adb968a2`, from the current working tree. Tested image identity: `sha256:97f0a76f0bb6411368713cff96d9493c7a0233bfcf42464ec4676badd07a5b9e`, Linux amd64. Existing image tags, running services and customer data were not replaced or changed.
- Added `-PackagedBackend` to the recovery runner. It resolves the backend image identity once and mounts only test helpers; application code, migrations and startup scripts come from the image for API, migration, OCR preparation and worker execution. An offline UID-1001 preflight rejects missing capabilities, invalid import locations and a non-executable/CRLF entrypoint. The older local backend image was correctly rejected before service provisioning.
- All 310 backend tests passed against packaged application code and migrations. Dependency consistency passed with `pip check`; a 127-package inventory is recorded in `vera/.github/backend-candidate-20260922-packages.json`. It is not an installation lock, SBOM or vulnerability-clearance claim. The build resolved fresh base/transitive dependencies without changing the Dockerfile, so reproducible inputs remain open.
- The candidate passed all eight real-Hub/API and seven Chromium/TLS groups, including backup/restore, session/account enforcement, actual PDF upload, live worker OCR, saved reviews, reload and UI text download. Review submission remains API-driven inside Chromium. The API/browser phases took about 42/12 seconds on synthetic data, excluding build/provisioning/downloads, not a performance benchmark.
- The original source-mounted baseline mode also passed its six groups after the runner changes. PowerShell parsing, changed-helper Python lint and whitespace checks passed. Both drills cleaned up their labelled resources, including synthetic backups/documents and downloaded OCR weights; the candidate image was retained locally.
- No commit, push, publication or deployment occurred. This proves packaged VERA backend behaviour, not an immutable full-suite release: Hub still uses source mounts, and PIKA/Hub candidates, exact-artifact security scans, full clean-host installation, summaries/query acceptance and measured recovery/rollback remain open. Next: apply the packaged-artifact checks to matching Hub and PIKA candidates before suite-wide acceptance.

## Packaged Hub and PIKA candidates: 22 September 2026

- Built separate Linux-amd64 candidates: Hub `hub-candidate:20260922-31c07019` (`sha256:30310783afab50f1afe146c73968bbb7c080af05e5f54b631ee37579f43efb1a`) and PIKA `pika-candidate:20260922-a6d40420` (`sha256:a558a54b4861a15ec7a13a66b83a2ef418904c2a534a5d1725541759f25df691`). Retained them locally without replacing existing image tags or running services.
- Corrected Hub's missing two-factor runtime dependencies and project/Docker dependency drift; a manifest-parity test prevents recurrence. Excluded local secrets, test data and caches from its build context. Hub passed all 265 tests against packaged code and a non-root application/account/two-factor import and QR-generation preflight.
- Added `-PackagedHub` to VERA's drill. Both backends now ran from their images for eight real-Hub/API and six HTTPS browser groups, including recovery, session/account revocation, saved document access and status streaming. This paired run used restored fixtures, not live OCR or LLM generation. All uniquely labelled resources were cleaned up.
- PIKA dependency-install retries now fail the build when exhausted. Removed Git history from build context/image layers and made version injection explicit; the candidate uses `0.0.0.dev20260922`. Existing historical images were not deleted or security-cleared. New tests execute both actual Dockerfile retry blocks with success/failure mocks.
- PIKA's real non-root entrypoint passed an offline HTTP startup/login-page/access-denial/404 probe. Packaged regression passed 380 tests and six build-test subcases. The first offline attempt lacked embedding weights and failed/errored on 15 cases; preparing the public MiniLM test model in disposable storage and then rerunning with offline model flags passed. This is not a real Hub/PIKA/Ollama answer-flow test; relevant generation calls remain mocked.
- Both candidates passed dependency consistency. Observed Python inventories are stored in their repos (45 Hub packages, 112 PIKA packages). All 90 installer shell/configuration tests, five readiness tests, the new Hub manifest-parity test, changed-helper lint, PowerShell parsing and whitespace checks passed. No remote CI was triggered.
- Runbook: `ollama/.github/PACKAGED_CANDIDATES.md`. Candidate images remain local; test containers, synthetic data and test model cache were removed. No customer data changed and nothing was committed, pushed, published or deployed. Next: real packaged PIKA ingestion/query with Hub/Ollama, VERA summaries, exact-image security review and full-suite clean-host/recovery/rollback acceptance before a verified release lock.

## Real packaged PIKA answer-flow milestone: 23 September 2026

- Added a repeatable disposable Hub/PIKA/Ollama drill using the exact packaged Hub and PIKA candidates above, without application-source mounts or generation mocks. Synthetic accounts use real Hub authentication and its normal new-install licence grace period. Administrator upload, MiniLM embedding, Chroma indexing, queued retrieval and actual Ollama generation all passed.
- Two differently worded questions returned the expected synthetic fact and correct source content. Anonymous queries and ordinary-user uploads/indexing were refused; the reader's query status/history remained private from another user and the administrator. This does not add document-level permissions to PIKA's shared library.
- Stopped, removed and recreated PIKA from the same image and volumes. Source document, index and private history persisted without another upload/reindex, and the second question generated a fresh correct answer. Two successful Ollama generation requests were independently checked in the isolated server's logs.
- Selected cached `qwen2.5-coder:1.5b`, model digest `d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668`, using only the existing model-cache subdirectory read-only. Ollama image: `sha256:0ff452f6a4c3c5bb4ab063a1db190b261d5834741a519189ed5301d50e4434d1`. No existing service received requests or model changes. Only public embedding preparation had outbound access; application containers used an internal network without host ports.
- One small text document/chunk indexed in about 0.13 seconds after preparation. Cold-model and warm-model queries took about 22/6 seconds respectively with two CPUs and 3 GiB limits on each PIKA/Ollama container. These are synthetic timings, not performance or model-quality promises. Mixed formats, large libraries and concurrency remain untested here.
- The first attempt exposed a test-client lifecycle error, corrected in the helper. The integration flow, six cleanup/opt-in safety tests, lint and whitespace checks passed. No product code changed or images were rebuilt; broad application regression was not repeated. HTTP-only PIKA debug cookies were explicitly enabled in the drill, so production TLS/browser behaviour remains a separate gate.
- Disposable accounts, documents, history, index, downloaded embeddings, containers and network were removed. Existing weights and candidate images were retained. Runbook: `pika/.github/PACKAGED_RAG_DRILL.md`. No customer data changed; nothing committed, pushed, published or deployed. Next: real VERA summaries, production-mode PIKA browser acceptance and exact-image security review, followed by full clean-host suite and measured recovery/upgrade/rollback gates.

## VERA summary workflow follow-up: 23 September 2026

- Fixed a confirmed workflow bug: exporting a reviewed document or page changed its status to `exported`, which summary generation incorrectly rejected as unvalidated. Both new export/regenerate regression cases failed with HTTP 409 against the previous candidate. Exported, reviewed text is now eligible for summaries; incomplete-review and access checks remain in place.
- Built a separate local backend candidate, `vera-backend-candidate:20260923-summary-export`, image ID `sha256:45f4802a1bb255ea2f5b5d169de288b25d67b8ae4cc4449d3907c86de71639d2`. All 317 packaged backend tests passed, including the two workflow regressions and five live-test fallback checks. Dependency consistency, changed-helper lint and PowerShell syntax passed. Existing image tags and services were not replaced.
- Added opt-in `-LiveSummary` to the packaged real-Hub/HTTPS/OCR drill. It uses cached Ollama weights read-only in a separate internal-network container, synthetic page-specific facts, real OCR and browser-authenticated summary/export requests. All eight real-Hub/API and eight Chromium/TLS groups passed with the rebuilt candidate: correct source facts, persisted results, anonymous/unrelated-user denial, zero final LLM fallback failures and exactly two successful real generation requests. Review/summary requests are API-driven inside trusted Chromium; summary-button/model-selection UI coverage is not claimed.
- Selected `qwen2.5-coder:1.5b`, digest `d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668`, in isolated Ollama image `sha256:0ff452f6a4c3c5bb4ab063a1db190b261d5834741a519189ed5301d50e4434d1`, limited to two CPUs/3 GiB. A cold request hit the normal 60-second timeout before the existing retry succeeded. Page/document summaries took 67.30/28.10 seconds; API/browser phases took 46.95/138.91 seconds, excluding provisioning/downloads. This functional pass is not a performance sign-off, broad answer-quality evaluation or model recommendation.
- Prioritised follow-ups from inspection: label offline fallbacks truthfully in the UI (it currently infers AI provenance from the requested mode); investigate repeated aborted status-stream requests (the subscription effect depends on the document object it updates). Neither issue is fixed or performance-certified by the export-state change.
- The first old-candidate live attempt failed; the passing run uses the rebuilt candidate. An approval-system usage limit delayed the rerun until the task resumed. Cleanup was independently verified: disposable accounts, documents, backups, OCR weights, containers, network and volume were removed; existing model weights and services were untouched. Frontend code was unchanged, so its broad unit suite was not rerun.
- Runbook: `vera/scripts/RECOVERY_DRILL.md`. No commit, push, publication or customer deployment. Next: truthful fallback labelling and status-stream reconnection fixes, then latency/quality checks. Exact-artifact security review, production PIKA browser coverage and clean-host/recovery/upgrade/rollback acceptance remain open.

## VERA status stability and honest summary provenance: 23 September 2026

- Fixed the repeated status connection loop. The frontend subscribes by document ID and processing state rather than the changing document object, uses the latest page handler without rebuilding the connection, sends credentials across origins and ignores foreign/stale messages. Terminal documents do not subscribe; failures close the stream and use existing polling. Review versions remain tied to loaded tokens.
- Backend-generated summaries now persist `summary_source` (`ai`, `offline`, `offline_fallback`) and the requested `summary_model` in their exported structured fields. Blank/null/non-text LLM output cannot masquerade as successful AI. Page/document badges use actual provenance; fallback results explain what happened and offer explicit regeneration. Older responses without metadata display Unverified source. No historical-data backfill or migration was needed.
- Automatic page summary attempts are bounded per document/page/model for the workspace lifecycle, so a fallback or error cannot cause an automatic retry loop. Manual Generate/Regenerate remains available. This is not a persistent queue, cancellation feature or latency guarantee.
- Verification: 137 frontend tests passed, then TypeScript and ten focused cases passed after a final stale-page guard and test-fixture corrections. All 323 backend tests passed against source and the rebuilt package. Dependency consistency, helper lint, production frontend build and whitespace checks passed. An existing CSS alignment warning remains; no unrelated stylesheet changes were made.
- New local candidates: backend `vera-backend-candidate:20260923-provenance`, ID `sha256:9cdb0b761c775120cc64d23b777c30fd9e55253de7918d7ac496db690a4a7659`; frontend `vera-frontend-candidate:20260923-status`, ID `sha256:040c4f7b372b0abc1eb3b4028d9bb1451bb28214fa8b11569fe245606f499cde`. Both passed eight real-Hub/API and nine Chromium/TLS groups with actual PDF OCR and two Ollama summaries. The live document used one processing connection and zero terminal reconnects; completed restored documents opened none. Provenance, saved exports and access denial passed. Live outage-to-fallback UI coverage remains separate from its passing unit tests.
- API/browser phases took 47.06/75.99 seconds; page/document summaries took 26.37/11.20 seconds. These are uncontrolled synthetic observations, not proof of a causal speedup or production performance. The small coding model retained the fixture facts but added an unsupported interpretation of a test identifier as a facility. Functional fact-presence checks do not establish general factual accuracy.
- Runbook: `vera/.github/WORKSPACE_RELIABILITY.md`. Ownership-checked cleanup and an independent inventory confirmed removal of disposable containers, network, volume, synthetic documents/accounts/backups and downloaded OCR weights. Existing services/LLM weights were untouched; candidates remain local. No commit, push, publication or deployment.
- Next: representative summary-quality evaluation and explicit cold/warm latency targets, including grounded prompts/model choice and startup/idle warm-up behaviour. Production PIKA browser acceptance, exact-image security review, full clean-host installation and measured recovery/upgrade/rollback remain release gates.

## VERA grounded summaries and quality regression: 24 September 2026

- Added separate Ollama grounding instructions: explicit facts only, no invented meanings for identifiers, preserve negation/uncertainty, and treat embedded document instructions as content. Existing fallback/provenance behaviour is unchanged. This is a prompt mitigation, not an accuracy verifier or security boundary.
- Added a repeatable isolated summary-service evaluator with four synthetic fixtures and a repeated cold/warm identifier case. It uses the actual packaged service, a fresh internal-only Ollama server, explicit image/model identities, existing model weights mounted read-only and ownership-checked cleanup. Raw outputs and Ollama timing counters are retained for human review.
- The preceding prompt reproduced the identifier hallucination. Manual review also caught invented security incidents/advice that its keyword checks missed. The grounded prompt passed all five generation checks, and manual review found no unsupported factual additions in those outputs. These are small unseeded samples, not representative customer-document accuracy or arbitrary prompt-injection resistance.
- All 332 packaged backend tests passed, including 15 focused cases. Dependency consistency, helper lint and scoped whitespace checks passed. New local backend: `vera-backend-candidate:20260924-grounding`, ID `sha256:0d77dd58d1e38f34359ac2399f290a8a2077f17197021867d530dd906d49cd04`. Frontend unchanged; full browser/OCR acceptance was not rerun for this prompt-only change.
- Same cached `qwen2.5-coder:1.5b` model, two CPU/3 GiB, context 2048. Candidate identifier cold/warm requests took 22.514/15.009 seconds; remaining warm requests took 10.244-28.553 seconds. Baseline timings were mixed, and other host work overlapped the runs. No speedup, production-model recommendation or latency target is claimed.
- Evidence and commands: `vera/.github/SUMMARY_QUALITY.md`, with both raw JSON reports. Disposable test containers/networks were removed; existing services and weights were untouched. No commit, push, publication or deployment.
- Next: broaden human-reviewed quality fixtures and repeat model comparisons; establish controlled latency/concurrency acceptance. Existing exact-artifact security, production PIKA HTTPS/browser, clean-host installation and recovery/upgrade/rollback gates remain open.
