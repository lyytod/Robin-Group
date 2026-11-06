import { PrismaClient, UserRole, AccountType, NormalBalance } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// CHART OF ACCOUNTS STANDAR (CoA)
// Mengikuti standar akuntansi Indonesia (PSAK)
// Kode format: X-XXXX (Tipe-Nomor)
// ============================================================
const standardCoA = [
  // ---- ASET (1) ----
  { code: '1-0000', name: 'ASET', type: 'ASET', normalBalance: 'DEBIT', parentCode: null, description: 'Akun induk: Seluruh kekayaan usaha' },
  // Aset Lancar
  { code: '1-1000', name: 'Aset Lancar', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-0000', description: 'Aset yang dapat dicairkan dalam satu tahun' },
  { code: '1-1001', name: 'Kas', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Uang tunai di tangan kasir' },
  { code: '1-1002', name: 'Kas Kecil (Petty Cash)', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Dana kas kecil untuk pengeluaran rutin kecil' },
  { code: '1-1003', name: 'Bank', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Saldo rekening bank usaha' },
  { code: '1-1004', name: 'Piutang Usaha', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Tagihan kepada pelanggan yang belum dibayar' },
  { code: '1-1005', name: 'Persediaan Barang', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Stok barang dagangan' },
  { code: '1-1006', name: 'Perlengkapan / Supplies', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Perlengkapan operasional yang belum habis dipakai' },
  { code: '1-1007', name: 'Biaya Dibayar di Muka', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-1000', description: 'Pembayaran yang dilakukan sebelum manfaatnya diterima (mis: sewa dibayar dimuka)' },
  // Aset Tidak Lancar
  { code: '1-2000', name: 'Aset Tidak Lancar', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-0000', description: 'Aset jangka panjang' },
  { code: '1-2001', name: 'Tanah', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-2000', description: 'Nilai tanah yang dimiliki' },
  { code: '1-2002', name: 'Bangunan', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-2000', description: 'Nilai bangunan/gedung' },
  { code: '1-2003', name: 'Akumulasi Penyusutan Bangunan', type: 'ASET', normalBalance: 'KREDIT', parentCode: '1-2000', description: 'Akumulasi pengurangan nilai bangunan' },
  { code: '1-2004', name: 'Peralatan', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-2000', description: 'Peralatan usaha (mesin, elektronik, dll)' },
  { code: '1-2005', name: 'Akumulasi Penyusutan Peralatan', type: 'ASET', normalBalance: 'KREDIT', parentCode: '1-2000', description: 'Akumulasi pengurangan nilai peralatan' },
  { code: '1-2006', name: 'Kendaraan', type: 'ASET', normalBalance: 'DEBIT', parentCode: '1-2000', description: 'Nilai kendaraan operasional' },
  { code: '1-2007', name: 'Akumulasi Penyusutan Kendaraan', type: 'ASET', normalBalance: 'KREDIT', parentCode: '1-2000', description: 'Akumulasi pengurangan nilai kendaraan' },

  // ---- KEWAJIBAN (2) ----
  { code: '2-0000', name: 'KEWAJIBAN', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: null, description: 'Akun induk: Seluruh hutang/kewajiban usaha' },
  // Kewajiban Lancar
  { code: '2-1000', name: 'Kewajiban Lancar', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-0000', description: 'Kewajiban yang jatuh tempo dalam satu tahun' },
  { code: '2-1001', name: 'Hutang Usaha', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-1000', description: 'Hutang kepada pemasok/vendor' },
  { code: '2-1002', name: 'Hutang Gaji', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-1000', description: 'Gaji karyawan yang belum dibayarkan' },
  { code: '2-1003', name: 'Hutang Pajak', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-1000', description: 'Kewajiban pajak yang belum disetor' },
  { code: '2-1004', name: 'Pendapatan Diterima di Muka', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-1000', description: 'Pembayaran dari pelanggan sebelum barang/jasa diserahkan' },
  { code: '2-1005', name: 'Biaya Akrual', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-1000', description: 'Biaya yang sudah terjadi tapi belum dibayar' },
  // Kewajiban Jangka Panjang
  { code: '2-2000', name: 'Kewajiban Jangka Panjang', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-0000', description: 'Kewajiban yang jatuh tempo lebih dari satu tahun' },
  { code: '2-2001', name: 'Hutang Bank Jangka Panjang', type: 'KEWAJIBAN', normalBalance: 'KREDIT', parentCode: '2-2000', description: 'Pinjaman bank jangka panjang' },

  // ---- EKUITAS (3) ----
  { code: '3-0000', name: 'EKUITAS', type: 'EKUITAS', normalBalance: 'KREDIT', parentCode: null, description: 'Akun induk: Modal pemilik' },
  { code: '3-1001', name: 'Modal Awal', type: 'EKUITAS', normalBalance: 'KREDIT', parentCode: '3-0000', description: 'Modal yang disetor oleh pemilik usaha' },
  { code: '3-1002', name: 'Prive / Penarikan Pemilik', type: 'EKUITAS', normalBalance: 'DEBIT', parentCode: '3-0000', description: 'Penarikan uang/aset oleh pemilik untuk keperluan pribadi' },
  { code: '3-1003', name: 'Laba / Rugi Ditahan', type: 'EKUITAS', normalBalance: 'KREDIT', parentCode: '3-0000', description: 'Akumulasi laba/rugi tahun-tahun sebelumnya' },
  { code: '3-1004', name: 'Laba / Rugi Periode Berjalan', type: 'EKUITAS', normalBalance: 'KREDIT', parentCode: '3-0000', description: 'Laba/rugi periode akuntansi saat ini' },

  // ---- PENDAPATAN (4) ----
  { code: '4-0000', name: 'PENDAPATAN', type: 'PENDAPATAN', normalBalance: 'KREDIT', parentCode: null, description: 'Akun induk: Seluruh pendapatan usaha' },
  { code: '4-1001', name: 'Pendapatan Penjualan', type: 'PENDAPATAN', normalBalance: 'KREDIT', parentCode: '4-0000', description: 'Pendapatan dari penjualan barang/jasa' },
  { code: '4-1002', name: 'Pendapatan Jasa', type: 'PENDAPATAN', normalBalance: 'KREDIT', parentCode: '4-0000', description: 'Pendapatan dari penyediaan jasa' },
  { code: '4-1003', name: 'Pendapatan Lain-lain', type: 'PENDAPATAN', normalBalance: 'KREDIT', parentCode: '4-0000', description: 'Pendapatan di luar kegiatan usaha utama' },
  { code: '4-1004', name: 'Diskon Penjualan (Kontra)', type: 'PENDAPATAN', normalBalance: 'DEBIT', parentCode: '4-0000', description: 'Pengurangan pendapatan akibat diskon yang diberikan' },
  { code: '4-1005', name: 'Retur Penjualan (Kontra)', type: 'PENDAPATAN', normalBalance: 'DEBIT', parentCode: '4-0000', description: 'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan' },

  // ---- BEBAN (5) ----
  { code: '5-0000', name: 'BEBAN', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: null, description: 'Akun induk: Seluruh beban/pengeluaran usaha' },
  // Beban Pokok Penjualan
  { code: '5-1000', name: 'Beban Pokok Penjualan (HPP)', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-0000', description: 'Biaya langsung terkait produksi atau pembelian barang yang dijual' },
  { code: '5-1001', name: 'Harga Pokok Penjualan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-1000', description: 'HPP barang dagangan yang terjual' },
  { code: '5-1002', name: 'Pembelian Bahan Baku', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-1000', description: 'Pembelian bahan baku untuk produksi' },
  // Beban Operasional
  { code: '5-2000', name: 'Beban Operasional', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-0000', description: 'Biaya operasional rutin usaha' },
  { code: '5-2001', name: 'Beban Gaji & Upah', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Gaji dan upah karyawan' },
  { code: '5-2002', name: 'Beban Sewa', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Biaya sewa tempat usaha' },
  { code: '5-2003', name: 'Beban Listrik & Air', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Tagihan listrik dan air' },
  { code: '5-2004', name: 'Beban Telepon & Internet', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Tagihan telepon dan internet' },
  { code: '5-2005', name: 'Beban Transportasi', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Biaya transportasi operasional' },
  { code: '5-2006', name: 'Beban Perlengkapan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Biaya perlengkapan operasional yang habis pakai' },
  { code: '5-2007', name: 'Beban Pemeliharaan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Biaya perawatan dan perbaikan peralatan/gedung' },
  { code: '5-2008', name: 'Beban Iklan & Promosi', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-2000', description: 'Biaya pemasaran dan promosi' },
  // Beban Penyusutan
  { code: '5-3000', name: 'Beban Penyusutan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-0000', description: 'Beban penyusutan aset tetap' },
  { code: '5-3001', name: 'Beban Penyusutan Bangunan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-3000', description: 'Penyusutan nilai bangunan per periode' },
  { code: '5-3002', name: 'Beban Penyusutan Peralatan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-3000', description: 'Penyusutan nilai peralatan per periode' },
  { code: '5-3003', name: 'Beban Penyusutan Kendaraan', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-3000', description: 'Penyusutan nilai kendaraan per periode' },
  // Beban Lain-lain
  { code: '5-4000', name: 'Beban Lain-lain', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-0000', description: 'Pengeluaran di luar operasional utama' },
  { code: '5-4001', name: 'Beban Bunga', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-4000', description: 'Biaya bunga pinjaman' },
  { code: '5-4002', name: 'Beban Pajak', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-4000', description: 'Beban pajak usaha' },
  { code: '5-4003', name: 'Beban Administrasi & Umum', type: 'BEBAN', normalBalance: 'DEBIT', parentCode: '5-4000', description: 'Biaya administrasi umum yang tidak terklasifikasi' },
] as const;

async function main() {
  console.log('🌱 Memulai proses seeding database...\n');

  // ============================================================
  // 1. BUAT SUPER ADMIN
  // ============================================================
  console.log('👤 Membuat akun Super Admin...');
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('admin123', saltRounds);

  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash,
      fullName: 'Super Administrator',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`   ✅ Super Admin dibuat: ${superAdmin.username} (ID: ${superAdmin.id})`);
  console.log(`   📝 Username: superadmin | Password: admin123`);

  // ============================================================
  // 2. BUAT CONTOH UNIT USAHA
  // ============================================================
  console.log('\n🏢 Membuat contoh unit usaha...');
  const business1 = await prisma.business.upsert({
    where: { code: 'USAHA01' },
    update: {},
    create: {
      name: 'Usaha Pertama',
      code: 'USAHA01',
      address: 'Jl. Contoh No. 1, Jakarta',
      phone: '021-12345678',
      description: 'Unit usaha pertama Robin Group',
      isActive: true,
    },
  });
  console.log(`   ✅ Unit usaha dibuat: ${business1.name} (Kode: ${business1.code})`);

  // Hubungkan Super Admin ke unit usaha (akses penuh)
  await prisma.userBusinessAccess.upsert({
    where: { userId_businessId: { userId: superAdmin.id, businessId: business1.id } },
    update: {},
    create: {
      userId: superAdmin.id,
      businessId: business1.id,
    },
  });
  console.log(`   ✅ Super Admin diberikan akses ke: ${business1.name}`);

  // ============================================================
  // 3. BUAT CHART OF ACCOUNTS (CoA) STANDAR
  // ============================================================
  console.log('\n📊 Membuat Chart of Accounts (CoA) standar...');

  // Buat map untuk memetakan code ke ID setelah dibuat
  const codeToId = new Map<string, number>();

  // Pass 1: Buat semua akun induk (parentCode = null) dulu
  for (const account of standardCoA) {
    if (account.parentCode === null) {
      const created = await prisma.account.upsert({
        where: { businessId_code: { businessId: business1.id, code: account.code } },
        update: { name: account.name },
        create: {
          businessId: business1.id,
          code: account.code,
          name: account.name,
          type: account.type as AccountType,
          normalBalance: account.normalBalance as NormalBalance,
          parentId: null,
          description: account.description,
        },
      });
      codeToId.set(account.code, created.id);
    }
  }

  // Pass 2: Buat semua akun yang punya parent (2 level)
  for (let pass = 0; pass < 3; pass++) {
    for (const account of standardCoA) {
      if (account.parentCode !== null && !codeToId.has(account.code)) {
        const parentId = codeToId.get(account.parentCode);
        if (parentId !== undefined) {
          const created = await prisma.account.upsert({
            where: { businessId_code: { businessId: business1.id, code: account.code } },
            update: { name: account.name },
            create: {
              businessId: business1.id,
              code: account.code,
              name: account.name,
              type: account.type as AccountType,
              normalBalance: account.normalBalance as NormalBalance,
              parentId,
              description: account.description,
            },
          });
          codeToId.set(account.code, created.id);
        }
      }
    }
  }

  const totalAccounts = await prisma.account.count({ where: { businessId: business1.id } });
  console.log(`   ✅ ${totalAccounts} akun CoA berhasil dibuat untuk ${business1.name}`);

  // ============================================================
  // RINGKASAN
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ SEEDING SELESAI!');
  console.log('='.repeat(60));
  console.log('\n📋 Ringkasan:');
  console.log(`   • Super Admin   : superadmin / admin123`);
  console.log(`   • Unit Usaha    : ${business1.name} (${business1.code})`);
  console.log(`   • Total Akun CoA: ${totalAccounts} akun`);
  console.log('\n⚠️  PENTING: Segera ganti password setelah login pertama!');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
