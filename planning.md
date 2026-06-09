# Project Planning: Telegram-to-Docs Automated Pipeline

## 1. Project Overview
Aplikasi ini adalah *middleware* (Next.js) yang bertindak sebagai jembatan antara Telegram Bot (input pengguna), Supabase (database), Gemini API (pemrosesan NLP), dan Google Apps Script (generator dokumen). [cite_start]Sistem menerima log harian berupa teks via Telegram, mengklasifikasikannya menggunakan Gemini API sesuai Rencana Hasil Kerja (SKP), menyimpannya di Supabase, dan mengirimkan rekap bulanan ke GAS untuk dicetak ke Google Docs[cite: 6, 9].

## 2. Tech Stack & Environment
- **Framework:** Next.js (App Router).
- **Styling:** Tailwind CSS **v3**. (Strict rule: Do NOT use Tailwind v4).
- **Database:** Supabase (PostgreSQL).
- **AI Integration:** `@google/generative-ai` (Gemini API).
- **Telegram Bot API:** `telegraf` atau `node-telegram-bot-api`.
- **Deployment:** Vercel.
- **Environment:** Berjalan di atas WSL2 (Ubuntu) dengan Docker support untuk local development.

## 3. Database Schema (Supabase)
Tabel: `daily_logs`
- `id` (uuid, primary key)
- `created_at` (timestamp, default now)
- `log_date` (date) -> Tanggal log kegiatan dilaporkan.
- `raw_input` (text) -> Pesan asli dari Telegram.
- [cite_start]`is_skp` (boolean) -> True jika masuk Rencana Hasil Kerja, False jika Kegiatan Di Luar SKP[cite: 9].
- `skp_category` (text, nullable) -> Kategori baku sesuai SKP 2026.
- [cite_start]`short_description` (text) -> Uraian kegiatan, maksimal 10 kata[cite: 9].

## 4. AI Prompting Rules (Gemini API Context)
Agent harus membuat sebuah *helper function* untuk Gemini API dengan *system prompt* yang memetakan kegiatan berdasarkan 9 Rencana Hasil Kerja berikut:
1. [cite_start]Perawatan dan Pengembangan Aplikasi layanan [cite: 19]
2. [cite_start]Dokumen Pengajuan Clearance TIK [cite: 19]
3. [cite_start]Dokumen Katalog Sistem Informasi [cite: 21]
4. [cite_start]Dokumen Hasil Analisis Spesifikasi Teknis Pengembangan Aplikasi Web Prioritas [cite: 21]
5. [cite_start]Perawatan Infrastruktur Layanan Manajemen [cite: 21]
6. [cite_start]Terlaksananya Migrasi Aplikasi ke PDN dan Integrasi ke Pusaka [cite: 21]
7. [cite_start]Dokumen Implementasi dan Pengujian Keamanan Sistem [cite: 22]
8. [cite_start]Dokumen Penetapan Konteks Risiko & Keamanan SPBE [cite: 22]
9. [cite_start]Obyek Multimedia Kompleks [cite: 22]

**Output AI harus berbentuk JSON:**
`{ "is_skp": boolean, "skp_category": "string/null", "short_description": "string (max 10 words)" }`

## 5. API Routes Required
1. `POST /api/telegram-webhook`
   - Menerima pesan dari bot Telegram.
   - Mengambil teks, mengirim ke Gemini API.
   - Menyimpan hasil JSON dan tanggal ke Supabase.
   - Membalas chat Telegram dengan konfirmasi (misal: "✅ Log disimpan: [kategori]").

2. `GET /api/cron/monthly-export`
   - Triggered by Vercel Cron.
   - Mengambil semua baris dari tabel `daily_logs` untuk bulan dan tahun berjalan.
   - Mengirimkan *payload* JSON ke webhook Google Apps Script (URL via *environment variable*).

## 6. Logic Integration Note for GAS (Google Apps Script)
*Note untuk developer/agent: Next.js hanya bertugas mengirim payload data. Pengisian tabel dokumen (seperti mengisi jam "07.30 - 12.00" dan "13.30 - 16.30" pada semua hari Jumat di bulan tersebut [cite: 4]) akan ditangani di sisi script GAS.*

## 7. Execution Steps for Antigravity IDE
1. Setup proyek Next.js dengan Tailwind v3.
2. Buat folder `src/lib/supabase` dan inisialisasi client.
3. Buat folder `src/lib/gemini` untuk helper prompt AI.
4. Buat route handler `/api/telegram-webhook` dan integrasikan Telegraf.
5. Sediakan skema SQL (DDL) di dalam file `supabase/migrations/00001_create_logs_table.sql`.