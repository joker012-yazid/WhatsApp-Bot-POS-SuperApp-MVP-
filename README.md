0) Prasyarat

A‑record DNS → IP VM telah ditetapkan.

Port 80/443 dibuka ke VM (NAT/port‑forward jika perlu).

Akaun sudo pada VM.

1) Pasang Keperluan Sistem
```
sudo apt update && sudo apt -y upgrade
# Docker & Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
# Node (jika perlu untuk dev tools)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs make git unzip
```

2) Klon Repo & Struktur Deploy
```
cd /opt && sudo mkdir app && sudo chown $USER:$USER app
cd /opt/app
git clone <REPO_URL> whatsapp-pos
cd whatsapp-pos
```

3) Isi Konfigurasi .env
```
Salin .env contoh dan ubah nilai berikut (minimum):

cp .env.example .env
nano .env
# Tetapkan: POSTGRES_PASSWORD, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, JWT_SECRET,
# AI_API_KEY, PUBLIC_URL=https://whatsappbot.laptoppro.my
```

4) Jalankan Stack (tanpa TLS dahulu)
```
docker compose pull
docker compose up -d postgres redis minio api web worker baileys proxy
# Semak
docker compose ps
docker compose logs -f --tail=200 proxy
```

5) Perolehi Sijil TLS & Auto‑Renew
```
# 1‑kali: dapatkan sijil
docker compose run --rm certbot-once
# hidupkan auto‑renew
docker compose up -d certbot-renew
```

6) Buat Akaun Admin Pertama & Pautkan WhatsApp

Buka https://whatsappbot.laptoppro.my → daftar pengguna pertama (role ADMIN auto).

Settings → WhatsApp Session → imbas QR (Baileys) → hantar mesej ujian.

7) Ujian Kesihatan
```
# API health
curl -k https://whatsappbot.laptoppro.my/api/health
# Semak servis
docker compose ps
```

8) Firewall & Keselamatan Ringkas
```
# Contoh ufw
sudo ufw allow 80,443/tcp
sudo ufw enable
# Pastikan port DB/Redis/MinIO tidak dibuka ke luar
```

9) Backup & Retensi

Backup harian DB: BACKUP_DAILY job aktif (lihat Pelaksanaan → Backup).

Simpanan MinIO berada pada volume deploy/letsencrypt & minio-data (mount ke NAS jika ada).

10) Naik Taraf (Zero/minimal downtime)
```
git pull
# rebuild imej jika perlu
docker compose pull && docker compose up -d
# semak migrasi prisma
docker compose exec api pnpm prisma migrate deploy
```

11) Rollback Pantas
```
# lihat imej terdahulu
docker images | head
# jalankan semula menggunakan tag sebelumnya
# contoh: docker compose up -d api:web@<TAG_LAMA>
```

12) Troubleshooting Ringkas
```
# Log ikut servis
docker compose logs -f --tail=200 api
# Status Baileys
docker compose logs -f baileys | grep -i connection
# Proxy/Nginx
docker compose logs -f proxy
```

13) Penyelenggaraan Berkala

Semak auto‑renew TLS (fail log letsencrypt/ & reload nginx).

Jalankan QR re‑login drill mingguan (Isnin 09:30 MYT) seperti Playbook.

Uji pemulihan backup sekurang‑kurangnya sebulan sekali.
