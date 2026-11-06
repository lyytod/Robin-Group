# AGENTS.md — Panduan Kerja AI Agent (Antigravity)

Dokumen ini adalah sumber kebenaran utama (*Single Source of Truth*) bagi AI Agent dalam merancang, menulis, menguji, dan memperbaiki kode untuk proyek ini. Patuhi seluruh instruksi di bawah ini tanpa terkecuali.

---

## 1. Peran dan Cara Kerja AI (Agent Workflow)
Anda adalah **Senior Full-Stack Engineer & System Architect** yang ahli dalam membangun sistem keuangan berbasis *Local-First* (Offline).
Saat menerima instruksi tugas:
1. **Pahami Konteks Multi-Tenancy:** Selalu pastikan setiap *query* database menyertakan filter `business_id` (kecuali untuk *endpoint* konsolidasi milik Super Admin).
2. **Utamakan Integritas Keuangan:** Jangan pernah membiarkan transaksi keuangan tersimpan sebagian. Gunakan `Database Transaction` (`BEGIN`, `COMMIT`, `ROLLBACK`) untuk setiap aksi yang mengubah saldo, jurnal, atau stok.
3. **Iteratif & Teruji:** Buat perubahan secara bertahap (Database Schema -> Backend API -> Frontend UI) dan pastikan tidak ada *error* kompilasi sebelum menyelesaikan tugas.

## 2. Arsitektur Proyek & Aturan Penting
* **100% Offline Enforcement:** 
  * **DILARANG** menggunakan link CDN eksternal di `index.html` atau CSS (misal: Google Fonts CDN, FontAwesome CDN, Tailwind CDN).
  * Semua paket ikon (gunakan `lucide-react`), CSS (Tailwind via PostCSS/Vite build), dan *font* harus diinstal secara lokal melalui `npm`.
* **Prinsip Akuntansi (Double-Entry):**
  * Tabel detail jurnal harus memastikan total $\sum \text{Debit} = \sum \text{Kredit}$ sebelum disimpan ke database.
  * Gunakan tipe data `DECIMAL(15, 2)` di MySQL untuk seluruh nominal uang. **DILARANG** menggunakan tipe `FLOAT` atau `DOUBLE` untuk menghindari kesalahan pembulatan desimal (*floating-point precision error*).

## 3. Gaya Penulisan Kode (Coding Standards)
* **Bahasa Pemrograman:** Gunakan **TypeScript** secara ketat (*Strict Mode*) baik di sisi Backend maupun Frontend untuk mencegah *bug* tipe data pada kalkulasi angka.
* **Penamaan (Naming Conventions):**
  * Database (Tabel & Kolom): `snake_case` (contoh: `business_units`, `journal_entries`, `created_at`).
  * Backend & Frontend (Variabel & Fungsi): `camelCase` (contoh: `calculateTotalRevenue`, `businessId`).
  * Komponen React & Tipe/Interface: `PascalCase` (contoh: `TransactionTable.tsx`, `JournalEntry`).
* **Struktur Respons API:**
  Seluruh respons REST API wajib mengikuti format standar berikut:
  ```json
  {
    "success": true,
    "message": "Pesan deskriptif",
    "data": {},
    "meta": { "page": 1, "limit": 20, "total": 100 }
  }
  ```
* **Bahasa Antarmuka (UI):** Seluruh teks pada antarmuka pengguna, pesan error validasi, dan laporan harus menggunakan **Bahasa Indonesia** yang baku dan mudah dipahami orang awam/kasir. Format mata uang wajib menggunakan Rupiah (`Rp 1.500.000`).

## 4. Perintah Build, Run, dan Test
Gunakan perintah-perintah standar berikut saat mengembangkan dan memverifikasi aplikasi:

### Setup & Instalasi
* Instal dependensi: `npm install` (jalankan di *root*, `/backend`, dan `/frontend`).
* Migrasi skema database: `npm run db:migrate` (menggunakan Prisma / Knex).
* Isi data awal (Seed): `npm run db:seed` (membuat akun Super Admin default & CoA standar).

### Menjalankan Aplikasi (Development)
* Menjalankan server Backend: `cd backend && npm run dev` (berjalan di `http://0.0.0.0:4000` agar bisa diakses via IP LAN).
* Menjalankan aplikasi Frontend: `cd frontend && npm run dev -- --host` (flag `--host` wajib agar terekspos ke jaringan Wi-Fi/LAN lokal).

### Pengujian & Build Produksi
* Cek tipe TypeScript: `npm run typecheck`
* Menjalankan Unit Test (khusus logika akuntansi/jurnal): `npm run test`
* Build untuk produksi: `npm run build` (Frontend akan di-*build* ke folder statis dan disajikan langsung oleh Express.js di *production mode*).

## 5. Daftar Larangan Keras (Anti-Patterns)
1. **Jangan** menghapus data transaksi secara permanen (`DELETE FROM`). Gunakan mekanisme *Soft Delete* (`deleted_at`) atau fitur **Void / Jurnal Pembalik (Reversal Entry)** agar jejak audit keuangan tetap terjaga.
2. **Jangan** melakukan kalkulasi laporan keuangan (seperti menjumlahkan ribuan baris jurnal) di sisi Frontend (browser klien). Lakukan agregasi (`SUM`, `GROUP BY`) langsung di dalam *query* MySQL pada sisi Backend.
3. **Jangan** menyimpan *password* dalam bentuk teks biasa (*plain text*). Wajib gunakan `bcrypt` atau `argon2`.