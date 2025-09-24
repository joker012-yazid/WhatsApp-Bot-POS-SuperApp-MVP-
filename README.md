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
| Skrip | Perihal |
| --- | --- |
| `pnpm build` | Bina semua aplikasi & pakej. |
| `pnpm dev` | Jalankan mod pembangunan selari (web, api, worker, baileys, print-server). |
| `pnpm lint` | Jalankan ESLint merentasi workspace. |
| `pnpm test` | Jalankan ujian Jest yang tersedia. |
| `pnpm prisma:migrate` | Jalankan migrasi Prisma melalui servis API. |
| `pnpm prisma:seed` | Isi data contoh Prisma. |

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
Komponen termasuk Nginx reverse proxy, Next.js, API, worker, Baileys, print-server, PostgreSQL, Redis, MinIO, serta profil certbot.

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
| Perintah | Fungsi |
| --- | --- |
| `make install` | `pnpm install` |
| `make build` | `pnpm build` |
| `make dev` | `pnpm dev` |
| `make lint` | `pnpm lint` |
| `make test` | `pnpm test` |
| `make migrate` | `pnpm prisma:migrate` |
| `make seed` | `pnpm prisma:seed` |
| `make docker-up` | `docker compose up -d --build` |
| `make docker-down` | `docker compose down` |
| `make logs` | `docker compose logs -f` |

## Nota Tambahan
- Zon masa lalai: `Asia/Kuala_Lumpur`.
- Reverse proxy menguatkuasakan HSTS, gzip, dan laluan khusus (`/api`, `/ws`, `/print`).
- Queue BullMQ dikongsi melalui `@spec/config/queues` untuk kekonsistenan antara worker & print-server.
- Akaun ADMIN boleh mengaktifkan 2FA TOTP melalui endpoint `POST /api/auth/totp/setup` diikuti `POST /api/auth/totp/verify`; kod diperlukan semasa login selepas diaktifkan.
- Endpoint login disekat dengan reCAPTCHA (Google v2/v3) dan polisi kata laluan yang ketat; konfigurasi rahsia boleh dipasang melalui Docker secrets untuk mengelakkan nilai sensitif dalam `.env`.

## Panduan Deploy (Ubuntu LTS)

Dokumen ini menerangkan langkah minimum untuk menyediakan persekitaran produksi di VM Ubuntu 22.04 LTS (atau versi LTS semasa).

### 1. Prasyarat
- VM Ubuntu LTS dengan akses sudo dan DNS `whatsappbot.laptoppro.my` yang menunjuk ke IP VM.
- Rekod DNS tambahan untuk `*.whatsappbot.laptoppro.my` jika ingin melayan subdomain tambahan.
- Port `80` dan `443` dibuka kepada umum.
- Akaun e-mel untuk pemberitahuan Let's Encrypt (cth. `ops@domain`).
- Storan sekurang-kurangnya 50GB untuk Postgres dump & objek MinIO.

### 2. Pasang Docker & Docker Compose
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# log keluar & masuk semula untuk kumpulan docker berkuat kuasa
```

### 3. Klon Repo & Konfigurasi
```bash
git clone https://github.com/example/WhatsApp-Bot-POS-SuperApp-MVP.git
cd WhatsApp-Bot-POS-SuperApp-MVP
cp .env.example .env
```

Kemas kini `.env` dengan kredensial produksi:
- Tetapkan kata laluan rawak untuk Postgres, Redis, JWT, cookies.
- Tetapkan domain sebenar, kunci reCAPTCHA, rahsia MinIO.
- Jika menggunakan Docker secrets, letak fail rahsia di `deploy/secrets/` dan rujuk `_FILE` dalam `.env`.

### 4. Jalankan Stack
```bash
docker compose pull
docker compose up -d --build
```

Periksa status:
```bash
docker compose ps
docker compose logs proxy
```

### 5. Certbot Once & Renew
```bash
docker compose run --rm certbot-once
docker compose run --rm certbot-renew --dry-run
```

Selepas sijil diperoleh, reload Nginx:
```bash
docker compose exec proxy nginx -s reload
```
Tambahkan cron host untuk pembaharuan automatik bulanan:
```bash
(crontab -l; echo "0 3 1 * * cd /opt/WhatsApp-Bot-POS-SuperApp-MVP && docker compose run --rm certbot-renew && docker compose exec proxy nginx -s reload") | crontab -
```

### 6. Health Check
- API: `curl -k https://whatsappbot.laptoppro.my/api/health` (patut kembalikan `{"status":"ok","gitSha":"..."}`).
- Web: semak `https://whatsappbot.laptoppro.my` dalam pelayar.
- Worker/Baileys: `docker compose logs worker`, `docker compose logs baileys` untuk pastikan tiada ralat sambungan Redis/Postgres.

### 7. Firewall
Gunakan `ufw` untuk hadkan akses SSH dan buka port web:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 8. Backup & Restore
- **Database**: Worker `BACKUP_DAILY` akan menjalankan stub `pg_dump`. Untuk produksi, gantikan dengan arahan sebenar `pg_dump` ke direktori yang dipasang ke MinIO/S3.
- **Objek**: Konfigurasikan lifecycle MinIO atau replikasi ke S3 sekunder.
- Uji restore bulanan: muat turun dump terkini, pulihkan ke instans Postgres staging, dan jalankan `pnpm prisma:migrate deploy` untuk sahkan.

### 9. Naik Taraf
- Untuk kemas kini aplikasi: `git pull`, `docker compose build --pull`, `docker compose up -d`.
- Untuk patch OS: `sudo apt update && sudo apt upgrade -y`, reboot jika perlu (`sudo reboot`).
- Semak `CHANGELOG.md` (jika ada) sebelum naik taraf.

### 10. Troubleshooting
- `docker compose logs <service>` untuk jejak ralat.
- Pastikan `DATABASE_URL` dan `REDIS_URL` betul; worker/Baileys memerlukan Redis untuk token bucket dan queue.
- Jika API gagal boot, semak migrasi Prisma (`docker compose exec api pnpm prisma migrate deploy`).
- TLS gagal? Pastikan port 80/443 terbuka dan rekod DNS tepat.
- Prestasi lambat: semak `docker stats`, pantau Postgres (`docker compose exec postgres psql -c "SELECT now();"`).
