# Robin Group — Sistem Pembukuan & Kasir Multi-Usaha Offline (Local-First)

> **Sistem Akuntansi Double-Entry & Point of Sale (POS) Multi-Unit Usaha Terintegrasi** yang dirancang khusus untuk berjalan **100% Offline** di jaringan lokal (LAN / Wi-Fi) tanpa ketergantungan internet dan tanpa biaya langganan bulanan.

---

## 🌟 Fitur Utama & Kemampuan Sistem

### 1. Multi-Tenancy & Isolasi Data Logis
- **Single Database, Multi-Tenant:** Mengelola banyak cabang atau jenis usaha berbeda dalam satu database terpusat dengan filter isolasi data ketat berbasis `business_id`.
- **Context Switcher Instan:** Pengguna dan Super Admin dapat berpindah unit usaha secara langsung dari navigasi atas tanpa perlu *logout*.
- **Otomatisasi CoA Baru:** Setiap unit usaha baru yang dibuat akan langsung mendapatkan 58 akun standar akuntansi Indonesia secara otomatis di dalam satu transaksi database.

### 2. Dashboard Konsolidasi & Analitik Real-Time
- **Visualisasi Recharts:** Grafik interaktif tren penjualan harian (7 hari terakhir) dan perbandingan performa omset, beban, serta laba bersih antar unit usaha.
- **Kartu Ringkasan KPI:** Pendapatan bersih, total beban & HPP, laba bersih (*net profit*), total produk aktif, dan peringatan stok menipis.
- **Aksi Cepat & Widget:** Navigasi cepat ke kasir, stok, jurnal, serta daftar riwayat transaksi terkini.

### 3. Modul Kasir Cepat (Point of Sale)
- **Katalog Produk & Barcode:** Pencarian instan berdasarkan kode barcode atau nama produk dengan filter kategori.
- **Kalkulasi Otomatis:** Menghitung subtotal, diskon item, diskon transaksi, dan kembalian secara presisi.
- **Pencatatan Biaya Cepat:** Tombol catat pengeluaran operasional kasir (beli token listrik, operasional harian).
- **Cetak Struk Thermal:** Dukungan cetak struk format printer kasir (58mm / 80mm) secara offline via browser dialog.
- **Fitur Void / Pembatalan:** Membatalkan transaksi kasir dengan aman; otomatis mengembalikan stok persediaan dan membuat jurnal pembalik (*reversal entry*) tanpa merusak jejak audit.

### 4. Manajemen Inventaris & Stok
- **Kartu Stok & Mutasi:** Riwayat pergerakan stok lengkap (masuk, keluar kasir, penyesuaian stok opname, dan retur void).
- **Peringatan Stok Menipis (*Low Stock Alert*):** Indikator visual real-time ketika stok berada di bawah batas minimum.
- **Penyesuaian Stok Opname:** Modal input selisih fisik gudang/toko dengan catatan alasan penyesuaian.

### 5. Inti Akuntansi Berpasangan (Double-Entry Core)
- **Validasi Keseimbangan Akuntansi:** Setiap jurnal umum mewajibkan total $\sum \text{Debit} = \sum \text{Kredit}$.
- **Posting Otomatis Kasir:** Setiap penjualan kasir dan pencatatan biaya otomatis memotong persediaan, mencatat pendapatan/beban, dan mendebit kas tunai.
- **Bagan Akun (Chart of Accounts):** 5 kelompok akun hierarkis (Aset, Kewajiban, Ekuitas, Pendapatan, Beban).
- **Buku Besar (General Ledger):** Filter mutasi per akun dengan perhitungan saldo berjalan (*running balance*).
- **Jurnal Manual:** Modul input jurnal umum ganda untuk penyesuaian penyusutan, modal, atau biaya non-kasir.

### 6. Laporan Keuangan & Utilitas Data
- **Laporan Laba Rugi (Income Statement):** Pendapatan kotor, retur/diskon, pendapatan bersih, HPP, laba kotor, beban operasional, dan laba bersih.
- **Laporan Neraca (Balance Sheet):** Komponen Aset Lancar & Tetap, Kewajiban Lancar & Jangka Panjang, serta Ekuitas Pemilik dilengkapi status keseimbangan ($Aset = Kewajiban + Ekuitas$).
- **Laporan Arus Kas (Cash Flow):** Rincian penerimaan dan pengeluaran kas tunai & bank.
- **Cakupan Laporan Fleksibel:** Pilihan melihat data per unit usaha aktif atau konsolidasi gabungan seluruh grup usaha.
- **Ekspor Excel (.xlsx) Offline:** Mengunduh lembar kerja spreadsheet profesional menggunakan `exceljs`.
- **Cadangan Basis Data (Database Backup):** Pembuatan dan pengunduhan berkas dump SQL (`.sql`) langsung dari aplikasi untuk mencegah kehilangan data server.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

| Lapisan | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Database** | MySQL / MariaDB (Port 3306) | Penyimpanan data relasional dengan transaksi ACID & `DECIMAL(15,2)` |
| **Backend** | Node.js (v24 LTS) + Express.js + TypeScript | Server REST API modular dan cepat |
| **ORM** | Prisma ORM | Pemetaan skema, migrasi aman, dan type-safe database queries |
| **Frontend** | React 19 + Vite + TypeScript | Antarmuka pengguna modern dengan performa tinggi |
| **Styling** | Tailwind CSS (Local Build) | Sistem desain terpadu tanpa CDN eksternal |
| **Tipografi** | `@fontsource/inter` & `@fontsource/jetbrains-mono` | Font lokal offline tanpa Google Fonts CDN |
| **Visualisasi** | Recharts & Lucide React | Grafik keuangan dan pustaka ikon vektor lokal |
| **Ekspor** | ExcelJS | Pembangkit file spreadsheet lokal |

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js** v20+ atau v24 LTS terpasang.
- **MySQL / MariaDB** berjalan (contoh: via XAMPP di `localhost:3306`).
- Buat database MySQL dengan nama: `robin_group_db`.

### 2. Konfigurasi Backend
Buka terminal di folder `/backend`:
```bash
cd backend
npm install
```

Pastikan berkas `.env` telah sesuai:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="mysql://root:@localhost:3306/robin_group_db"
JWT_SECRET="robin_group_super_secret_jwt_key_2026_offline"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="*"
```

Jalankan migrasi database dan isi data awal (seed):
```bash
npx prisma migrate dev --name init
npm run db:seed
```

Jalankan server backend (dapat diakses di `http://0.0.0.0:4000`):
```bash
npm run dev
```

### 3. Konfigurasi Frontend
Buka terminal baru di folder `/frontend`:
```bash
cd frontend
npm install
```

Jalankan server pengembangan frontend (dengan flag `--host` agar dapat diakses komputer kasir lain via IP LAN):
```bash
npm run dev -- --host
```

Aplikasi web dapat dibuka di browser:
- **Komputer Server:** `http://localhost:3000`
- **Komputer Kasir / Tablet via Wi-Fi LAN:** `http://<IP-SERVER-LOKAL>:3000` (contoh: `http://192.168.1.10:3000`)

---

## 🔑 Kredensial Masuk Awal (Default)

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | `admin123` | Akses seluruh unit usaha, pengguna, dan laporan konsolidasi |

---

## 🔒 Kebijakan Keamanan & Audit Keuangan
1. **100% Offline Enforced:** Nol aset eksternal via CDN internet.
2. **Double-Entry Enforced:** Seluruh pencatatan akuntansi divalidasi seimbang sebelum disimpan ke database.
3. **No Hard Deletes:** Data transaksi dan inventaris dilindungi dengan mekanisme *soft delete* (`deleted_at`) dan jurnal pembalik (*reversal entry*).
4. **Enkripsi Kata Sandi:** Menggunakan hashing `bcryptjs` satu arah.
