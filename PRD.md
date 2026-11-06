# Product Requirements Document (PRD)
**Nama Proyek:** Robin Group - Sistem Pembukuan & Kasir Multi-Usaha Offline (Multi-Business Offline Accounting & POS)
**Arsitektur:** Local Web Server (On-Premise / Intranet LAN)

---

## 1. Latar Belakang Masalah
Pemilik bisnis yang memiliki beberapa unit usaha (cabang atau jenis usaha berbeda dalam satu lokasi/area) sering kesulitan menggabungkan laporan keuangan mereka. Menggunakan aplikasi berbasis *cloud* (SaaS) memerlukan biaya langganan bulanan per cabang yang mahal dan sangat bergantung pada kestabilan koneksi internet. Di sisi lain, pencatatan manual atau menggunakan spreadsheet terpisah rentan terhadap kesalahan input, manipulasi data, dan lambat saat proses konsolidasi laporan laba-rugi.

## 2. Tujuan Produk (Objectives)
1. Menyediakan sistem pencatatan transaksi (kasir) dan pembukuan akuntansi yang berjalan **100% offline** melalui jaringan lokal (LAN/Wi-Fi).
2. Mengintegrasikan beberapa entitas usaha dalam satu basis data terpusat (*Single Database, Multi-Tenant*).
3. Memungkinkan pemilik usaha memantau performa keuangan per unit usaha maupun secara gabungan (konsolidasi) secara *real-time*.
4. Menghilangkan ketergantungan pada koneksi internet dan biaya langganan bulanan.

## 3. Target Pengguna & Peran (User Roles)
1. **Super Admin (Pemilik Usaha):** Memiliki akses penuh ke seluruh unit usaha, manajemen pengguna, pengaturan master data, dan laporan keuangan konsolidasi.
2. **Manajer / Admin Usaha:** Memiliki akses ke satu unit usaha spesifik untuk mengelola inventaris, melihat laporan unit tersebut, dan memvalidasi jurnal harian.
3. **Kasir / Staf Operasional:** Hanya memiliki akses ke modul transaksi harian (pemasukan/penjualan dan pengeluaran kas operasional) pada unit usaha tempatnya ditugaskan.

## 4. User Stories
| ID | Sebagai... | Saya ingin... | Sehingga... |
| :--- | :--- | :--- | :--- |
| **US-01** | Super Admin | Menambahkan dan mengelola beberapa profil unit usaha | Setiap transaksi dapat dikelompokkan berdasarkan unit usaha masing-masing. |
| **US-02** | Super Admin | Melihat *dashboard* keuangan gabungan (konsolidasi) dan per unit | Saya tahu total keuntungan seluruh bisnis saya dan bisnis mana yang paling menguntungkan. |
| **US-03** | Admin Usaha | Mengelola daftar akun akuntansi (Chart of Accounts) dan produk | Transaksi yang diinput kasir otomatis masuk ke pos akuntansi yang benar. |
| **US-04** | Kasir | Menginput transaksi penjualan dan pengeluaran dengan cepat | Antrean pelanggan tidak menumpuk dan kas harian tercatat rapi. |
| **US-05** | Kasir | Mencetak struk transaksi dan laporan tutup kasir (*closing* harian) | Ada bukti fisik untuk pelanggan dan pertanggungjawaban uang fisik saat pergantian *shift*. |
| **US-06** | Super Admin | Melakukan *backup* dan *restore* database dengan satu klik | Data keuangan tetap aman jika komputer server mengalami kerusakan. |

## 5. Kebutuhan Fungsional (Functional Requirements)

### 5.1. Manajemen Multi-Usaha & Pengguna (Multi-Tenancy & Auth)
* Sistem autentikasi lokal menggunakan *username*, *password*, dan JWT (JSON Web Token).
* Pemisahan data logis menggunakan atribut `business_id` pada setiap tabel transaksi, produk, dan akun.
* Super Admin dapat berpindah tampilan antar usaha (*Context Switcher*) tanpa harus *logout*.

### 5.2. Modul Kasir & Transaksi Harian (POS & Cashflow)
* Input transaksi penjualan (mendukung pencarian barang via nama/kode *barcode*).
* Input pemasukan lain-lain dan pengeluaran operasional harian (biaya listrik, beli bahan, dll).
* Kalkulasi otomatis kembalian, diskon, dan pajak (opsional).
* Cetak struk ke printer *thermal* (58mm/80mm) via browser print atau raw printing.

### 5.3. Modul Pembukuan & Akuntansi (Accounting Core)
* **Chart of Accounts (CoA):** Pengelolaan kode akun (Aset, Kewajiban, Ekuitas, Pendapatan, Beban).
* **Jurnal Umum (General Journal):** Pencatatan otomatis (*auto-posting*) dari transaksi kasir ke jurnal akuntansi (sistem *double-entry*: Debit & Kredit harus seimbang).
* **Input Jurnal Manual:** Untuk penyesuaian stok, penyusutan aset, atau transfer modal antar unit usaha.
* **Buku Besar (General Ledger):** Riwayat mutasi per akun.

### 5.4. Modul Inventaris Dasar (Basic Inventory)
* Pencatatan stok masuk, stok keluar (otomatis berkurang saat kasir melakukan penjualan), dan *stock opname* (penyesuaian stok).
* Peringatan stok menipis (*low stock alert*).

### 5.5. Pelaporan & Ekspor Data (Reporting)
* Laporan Laba Rugi (*Profit & Loss*) per usaha dan konsolidasi.
* Laporan Neraca (*Balance Sheet*) dan Arus Kas (*Cash Flow*).
* Ekspor seluruh laporan ke format Excel (`.xlsx`) atau CSV dan PDF secara lokal.
* Fitur *Backup Database* (unduh file `.sql` / `.dump`) langsung dari antarmuka pengaturan.

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)
* **Offline-First:** Aplikasi **dilarang** memuat aset eksternal dari internet (seperti CDN untuk font, ikon, atau script). Semua *library* dan *font* harus dibundel secara lokal.
* **Kecepatan & Performa:** Waktu respon API di jaringan lokal harus di bawah $100\text{ ms}$.
* **Integritas Data:** Database wajib menerapkan *ACID compliance* (menggunakan fitur *Database Transaction* saat menyimpan jurnal dan memotong stok secara bersamaan).
* **Responsivitas UI:** Antarmuka harus nyaman digunakan di layar PC Kasir (1366x768), Laptop (1920x1080), maupun Tablet (untuk mode kasir/pemilik).
* **Kemudahan Deployment:** Sistem harus dapat dijalankan di komputer utama sebagai *service* latar belakang dan diakses oleh klien via IP Lokal (contoh: `http://192.168.1.10:3000`) atau aplikasi desktop Tauri/Electron.

## 7. Batasan Sistem (Scope & Limitations)
### Termasuk dalam Ruang Lingkup (In-Scope):
* Arsitektur jaringan lokal (LAN/Wi-Fi).
* Multi-usaha dalam satu server lokal yang sama.
* Akuntansi dasar hingga laporan keuangan utama (Laba Rugi, Neraca, Arus Kas).

### Di Luar Ruang Lingkup (Out-of-Scope):
* Sinkronisasi *cloud* antar gedung yang berbeda kota/lokasi tanpa jaringan LAN/VPN.
* Integrasi pembayaran *online* otomatis (QRIS dinamis/Payment Gateway yang membutuhkan internet). Pencatatan pembayaran non-tunai dilakukan secara manual (pilih metode bayar: Transfer/QRIS Statis).
* Modul penggajian karyawan (Payroll/HRIS) yang kompleks dan perpajakan korporat tingkat lanjut.