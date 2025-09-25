# SPEC-1 — WhatsApp Bot + POS SuperApp (MVP)

Monorepo pnpm workspace yang merangkumi:

- **apps/web** – Next.js App Router frontend.
- **apps/api** – NestJS API dengan Prisma & PostgreSQL.
- **apps/worker** – BullMQ worker untuk queues operasi dan backup.
- **apps/baileys** – WhatsApp gateway berasaskan Baileys dengan token bucket Redis.
- **apps/print-server** – Jambatan ESC/POS pilihan untuk cetakan resit/tiket.
  - Sertakan worker BullMQ, endpoint REST, dan CLI ujian `pnpm --filter print-server cli`.
- **packages/ui** – Komponen React kongsi (Button, Card, dsb.).
- **packages/config** – Kongsi konfigurasi ESLint/tsconfig serta definisi queue.
- **packages/sdk** – Klien OpenAPI ringan (`openapi-fetch`).
- **deploy/** – Konfigurasi Nginx & alat infra.

## Prasyarat

- Node.js 20+
- pnpm 8+
- Docker + Docker Compose

## Persediaan

1. `cp .env.example .env` dan kemaskini nilai sebenar (DB, rahsia, domain, dsb.). Tetapkan `RECAPTCHA_SITE_KEY`/`RECAPTCHA_SECRET` untuk perlindungan login serta pastikan kata laluan mematuhi polisi (≥12 aksara, campuran huruf besar/kecil, nombor & simbol).
2. Sediakan fail rahsia Docker (untuk pengeluaran) di `deploy/secrets/` seperti `jwt_secret`, `jwt_refresh_secret`, `session_cookie_secret`, `recaptcha_secret`, dan `minio_secret_key` kemudian kemaskini rujukan `_FILE` dalam `.env` jika digunakan.
3. Jalankan `pnpm install` di akar repo.

## Skrip Akar

| Skrip                 | Perihal                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `pnpm build`          | Bina semua aplikasi & pakej.                                               |
| `pnpm dev`            | Jalankan mod pembangunan selari (web, api, worker, baileys, print-server). |
| `pnpm lint`           | Jalankan ESLint merentasi workspace.                                       |
| `pnpm test`           | Jalankan ujian Jest yang tersedia.                                         |
| `pnpm prisma:migrate` | Jalankan migrasi Prisma melalui servis API.                                |
| `pnpm prisma:seed`    | Isi data contoh Prisma.                                                    |

## Pembangunan Tempatan

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Perkhidmatan akan tersedia pada port lalai (Next.js 3000, API 3001, Baileys 4001/4002, Print Server 4010).

## Docker Compose

```bash
docker compose up -d --build
```

Komponen termasuk Nginx reverse proxy, Next.js, API, BullMQ worker, Baileys gateway, PostgreSQL, Redis, MinIO, serta profil `certbot`.

### Ujian Print Server

Gunakan CLI contoh untuk menghantar resit ujian ke pencetak rangkaian ESC/POS:

```bash
pnpm --filter print-server cli -- --host 192.168.0.50 --port 9100 --url http://localhost:4010
```

Pastikan parameter `PRINT_SERVER_URL` dan konfigurasi peranti ditetapkan sebelum mencetak dari API (`POST /api/pos/print/{saleId}`).

## Prisma

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

Pastikan Postgres tersedia sebelum menjalankan migrasi.

## Makefile Ringkas

| Perintah      | Fungsi                                              |
| ------------- | --------------------------------------------------- |
| `make up`     | `docker compose up -d --build`                      |
| `make down`   | `docker compose down`                               |
| `make logs`   | `docker compose logs -f`                            |
| `make prisma` | `docker compose exec api npx prisma migrate deploy` |
| `make seed`   | `docker compose exec api npx prisma db seed`        |

## Nota Tambahan

- Zon masa lalai: `Asia/Kuala_Lumpur`.
- Reverse proxy menguatkuasakan HSTS, gzip, dan laluan khusus (`/api`, `/ws`, `/healthz`).
- Queue BullMQ dikongsi melalui `@spec/config/queues` untuk kekonsistenan antara worker & print-server.
- Akaun ADMIN boleh mengaktifkan 2FA TOTP melalui endpoint `POST /api/auth/totp/setup` diikuti `POST /api/auth/totp/verify`; kod diperlukan semasa login selepas diaktifkan.
- Endpoint login disekat dengan reCAPTCHA (Google v2/v3) dan polisi kata laluan yang ketat; konfigurasi rahsia boleh dipasang melalui Docker secrets untuk mengelakkan nilai sensitif dalam `.env`.

## Deployment Cheatsheet — Docker Compose Only

1. **Clone & masuk repositori**
   ```bash
   git clone https://github.com/example/WhatsApp-Bot-POS-SuperApp-MVP.git
   cd WhatsApp-Bot-POS-SuperApp-MVP
   ```
2. **Sediakan konfigurasi** – salin `.env.example` kepada `.env` dan isi nilai sebenar untuk domain, e-mel Let's Encrypt, kata laluan Postgres, rahsia JWT/cookies, kunci reCAPTCHA, akses MinIO, `AI_API_KEY`, dan `PUBLIC_URL`.
   - Jika mahu menggunakan Docker secrets, letak fail dalam `deploy/secrets/` (cth. `jwt_secret`) dan biarkan nilai `_FILE` kosong di `.env`. Untuk mematikan secrets, padam atau komen blok `secrets:` pada `docker-compose.yml` serta rujukan `secrets:` pada servis berkaitan.
3. **Naikkan stack** – jalankan semua servis latar:
   ```bash
   make up
   ```
   (Atau `docker compose up -d --build` jika tidak mahu guna Makefile.)
4. **Dapatkan sijil TLS sekali** – selepas DNS siap, jalankan certbot standalone berprofil:
   ```bash
   docker compose --profile certbot run --rm certbot-once
   docker compose exec proxy nginx -s reload
   ```
5. **Aktifkan pembaharuan automatik** – hidupkan servis cron-like dalam kontena:
   ```bash
   docker compose --profile certbot up -d certbot-renew
   ```
6. **Health check** – semak semua endpoint utama:
   ```bash
   curl -f https://whatsappbot.example.com/api/health
   curl -f https://whatsappbot.example.com/healthz
   docker compose ps
   ```

### Troubleshooting

- Guna `make logs` atau `docker compose logs -f <service>` untuk menjejak isu.
- `docker compose exec api npx prisma migrate deploy` memastikan migrasi Prisma terkini.
- Semak status servis melalui `docker compose ps` dan health check `/api/health` / `/healthz`.
- Jika sijil TLS baharu tidak dimuatkan, jalankan `docker compose exec proxy nginx -s reload`.
- Untuk reset sementara, `make down` diikuti `make up` akan but semula semua kontena.

### Upgrade

1. `git pull`
2. `docker compose pull`
3. `make up`
4. Semak `curl -f https://<domain>/api/health`

### Rollback Ringkas

1. `git checkout <tag/commit-lampau>`
2. `make up`
3. Pulihkan pangkalan data/objek dari sandaran jika skema berubah.
