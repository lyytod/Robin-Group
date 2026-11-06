# PROJECT.md — Ringkasan & Struktur Proyek

## 1. Visi Produk
Membangun sistem **Pembukuan Akuntansi dan Kasir (POS) Multi-Usaha** yang tangguh, cepat, dan berjalan sepenuhnya secara **Offline (Local Area Network)**. Sistem ini dirancang agar pemilik bisnis dengan banyak usaha/cabang dapat mengelola transaksi harian hingga laporan laba-rugi gabungan dari satu komputer utama tanpa biaya langganan bulanan dan tanpa ketergantungan internet.

---

## 2. Tumpukan Teknologi (Tech Stack)

### Database
* **MySQL (v8.0+):** Penyimpanan data relasional utama dengan dukungan penuh transaksi ACID.

### Backend (Server Lokal)
* **Runtime & Framework:** Node.js (LTS) + Express.js (dengan TypeScript).
* **ORM / Query Builder:** Prisma ORM atau Knex.js (memudahkan migrasi skema dan *type-safety*).
* **Autentikasi:** JSON Web Token (`jsonwebtoken`) + `bcryptjs`.
* **Utilitas Laporan:** `exceljs` (ekspor Excel lokal) dan `pdfmake` / `jspdf` (cetak laporan & struk offline).

### Frontend (Antarmuka Klien)
* **Framework:** React.js (Vite + TypeScript).
* **Styling:** Tailwind CSS (dibundel lokal) + komponen UI berbasis Radix UI / shadcn/ui.
* **State Management & Data Fetching:** Zustand (untuk menyimpan sesi pengguna & usaha yang aktif) + TanStack Query (React Query).
* **Ikon & Grafik:** `lucide-react` (ikon) + `recharts` (grafik pendapatan di *dashboard*).

### Opsi Pembungkus Desktop (Opsional Tahap Akhir)
* **Tauri** atau **Electron:** Untuk membungkus aplikasi menjadi file eksekusi mandiri (`.exe`) jika diperlukan.

---

## 3. Struktur Folder Proyek (Monorepo Structure)
Proyek ini menggunakan struktur direktori terpisah antara `backend` dan `frontend` untuk menjaga kerapian arsitektur:

```text
multi-usaha-accounting/
├── backend/                  # Server Express.js & Logika Akuntansi
│   ├── prisma/               # Skema database (schema.prisma) & file seeder
│   ├── src/
│   │   ├── config/           # Konfigurasi database, JWT, dan environment
│   │   ├── controllers/      # Pengendali request/response HTTP
│   │   ├── middlewares/      # Auth guard, Role check, & Tenant (business_id) extractor
│   │   ├── routes/           # Definisi endpoint API (/api/auth, /api/transactions, dll)
│   │   ├── services/         # Logika bisnis utama (kalkulasi jurnal, laba-rugi, stok)
│   │   ├── utils/            # Fungsi bantuan (format tanggal, generator nomor bukti)
│   │   └── server.ts         # Titik masuk utama aplikasi backend
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Antarmuka Pengguna (React + Vite)
│   ├── public/               # Aset statis lokal (logo, font lokal)
│   ├── src/
│   │   ├── api/              # Konfigurasi Axios & pemanggilan endpoint backend
│   │   ├── components/       # Komponen UI reusable (Tabel, Modal, Struk Print, Navbar)
│   │   ├── features/         # Modul halaman berdasarkan fitur:
│   │   │   ├── auth/         # Halaman Login
│   │   │   ├── dashboard/    # Grafik konsolidasi & ringkasan per usaha
│   │   │   ├── pos/          # Kasir & input transaksi harian
│   │   │   ├── accounting/   # Jurnal Umum, Buku Besar, & Chart of Accounts
│   │   │   ├── inventory/    # Master produk & stok
│   │   │   └── reports/      # Laba Rugi, Neraca, & Ekspor Excel/PDF
│   │   ├── store/            # State global (Zustand: user session & active business_id)
│   │   ├── utils/            # Formatter Rupiah (IDR), tanggal, dll
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── PRD.md                    # Dokumen Kebutuhan Produk
├── AGENTS.md                 # Aturan dan Panduan Kerja AI Agent
├── PROJECT.md                # Ringkasan Proyek & Struktur Folder
└── README.md                 # Panduan instalasi untuk pengguna akhir
```

---

## 4. Aturan Dasar Pengerjaan (Development Roadmap)
Agar pembangunan sistem berjalan terarah dan tidak saling tumpang tindih, kerjakan proyek dengan urutan fase berikut:

1. **Fase 1: Fondasi & Database Schema**
   * Buat skema database MySQL yang mencakup tabel: `users`, `businesses` (unit usaha), `accounts` (Chart of Accounts), `products`, `transactions`, `journals`, dan `journal_items`.
   * Buat *seeder* untuk akun Super Admin dan daftar akun akuntansi (CoA) dasar.
2. **Fase 2: Backend Auth & Multi-Tenancy Middleware**
   * Bangun sistem Login JWT dan *middleware* yang memvalidasi akses pengguna terhadap `business_id` tertentu.
   * Buat CRUD untuk mengelola Unit Usaha (`businesses`) dan Pengguna (`users`).
3. **Fase 3: Inti Akuntansi & Kasir (POS)**
   * Bangun API untuk pengelolaan CoA dan Produk/Stok.
   * Bangun API Transaksi Kasir dan Pengeluaran yang secara otomatis membentuk Jurnal Umum (*auto-posting double-entry*) dalam satu *database transaction*.
4. **Fase 4: Pelaporan, Konsolidasi & Utilitas**
   * Bangun *endpoint* agregasi untuk Laporan Buku Besar, Laba Rugi, dan Neraca (baik per `business_id` maupun gabungan seluruh usaha).
   * Tambahkan fitur cetak struk, ekspor Excel/PDF, dan *backup* database.