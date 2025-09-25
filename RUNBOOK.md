# SPEC-1 Operational Runbook

## 1. Weekly QR Re-Login Drill
1. **Schedule** — Every Monday 09:00 MYT.
2. **Objective** — Ensure agents can re-establish WhatsApp Web sessions and QR broadcast path from the Baileys gateway works.
3. **Steps**
   - Notify operations group 15 minutes beforehand.
   - Pause outbound automation via worker dashboard.
   - For each active WhatsApp session:
     1. Run `curl -X POST http://localhost:4001/sessions/<SESSION_ID>/connect`.
     2. Confirm QR appears on WebSocket stream (`ws://localhost:4002`).
     3. Scan QR using the dedicated device; verify status update to `open`.
   - Resume outbound automation.
4. **Verification** — Send a test message using `/sessions/<id>/messages` endpoint and ensure it reaches chat console.
5. **Escalation** — If QR is not generated after 3 attempts, escalate to Lead Engineer and capture Baileys logs.

## 2. Monthly Backup Restore Test
1. **Schedule** — First Wednesday of each month 22:00 MYT.
2. **Objective** — Validate `BACKUP_DAILY` BullMQ job artifacts can be restored.
3. **Steps**
   - Identify latest backup object in MinIO bucket `backups/spec-1`.
   - Spin up a disposable Postgres container: `docker run --rm -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:16`.
   - Download backup file and run `pg_restore`/`psql` (depending on dump type) into temporary database.
   - Execute smoke SQL (users count, recent sales, tickets by status).
   - Destroy disposable container and clean downloaded dump.
4. **Verification** — Document results in ops log and attach SQL output.
5. **Escalation** — If restore fails, keep the container running for debugging and engage database administrator.

## 3. Docker Image Rollback Procedure
1. **Pre-checks**
   - Confirm the previous stable tag (e.g., `registry/app-api:20240418`).
   - Ensure compose file references tags (not `latest`).
2. **Rollback Steps**
   - Update `.env` or deployment manifest with stable image tags for `web`, `api`, `worker`, `baileys`.
   - Run `docker compose pull web api worker baileys` to fetch the stable images.
   - Execute `docker compose up -d web api worker baileys` to recreate containers.
3. **Validation**
   - Hit `https://whatsappbot.laptoppro.my/api/health` and ensure `{ status: 'ok' }`.
   - Confirm web console loads and Baileys `/metrics` reports healthy send rate.
   - Review worker logs for queue draining.
4. **Post-Rollback**
   - Notify stakeholders, tag incident in tracking tool, and schedule post-mortem.

## Contacts
- **Lead Engineer** — lead.engineer@laptoppro.my
- **Infra On-call** — oncall@laptoppro.my
- **Security** — security@laptoppro.my
