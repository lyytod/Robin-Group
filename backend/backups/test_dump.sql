-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: robin_group_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('1d256848-92c4-4b79-b549-8673cd2ffd4b','c25297cbed7d2a975cba759cbb5dcf21af6ad393a5367afc7685daa51b0959e0','2026-10-30 12:38:37.439','20261030123835_init',NULL,NULL,'2026-10-30 12:38:35.431',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` enum('ASET','KEWAJIBAN','EKUITAS','PENDAPATAN','BEBAN') NOT NULL,
  `normal_balance` enum('DEBIT','KREDIT') NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_business_id_code_key` (`business_id`,`code`),
  KEY `accounts_parent_id_fkey` (`parent_id`),
  CONSTRAINT `accounts_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `accounts_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,1,'1-0000','ASET','ASET','DEBIT',NULL,1,'Akun induk: Seluruh kekayaan usaha','2026-10-30 12:39:26.183','2026-10-30 12:39:26.183'),(2,1,'2-0000','KEWAJIBAN','KEWAJIBAN','KREDIT',NULL,1,'Akun induk: Seluruh hutang/kewajiban usaha','2026-10-30 12:39:26.191','2026-10-30 12:39:26.191'),(3,1,'3-0000','EKUITAS','EKUITAS','KREDIT',NULL,1,'Akun induk: Modal pemilik','2026-10-30 12:39:26.199','2026-10-30 12:39:26.199'),(4,1,'4-0000','PENDAPATAN','PENDAPATAN','KREDIT',NULL,1,'Akun induk: Seluruh pendapatan usaha','2026-10-30 12:39:26.205','2026-10-30 12:39:26.205'),(5,1,'5-0000','BEBAN','BEBAN','DEBIT',NULL,1,'Akun induk: Seluruh beban/pengeluaran usaha','2026-10-30 12:39:26.210','2026-10-30 12:39:26.210'),(6,1,'1-1000','Aset Lancar','ASET','DEBIT',1,1,'Aset yang dapat dicairkan dalam satu tahun','2026-10-30 12:39:26.215','2026-10-30 12:39:26.215'),(7,1,'1-1001','Kas','ASET','DEBIT',6,1,'Uang tunai di tangan kasir','2026-10-30 12:39:26.221','2026-10-30 12:39:26.221'),(8,1,'1-1002','Kas Kecil (Petty Cash)','ASET','DEBIT',6,1,'Dana kas kecil untuk pengeluaran rutin kecil','2026-10-30 12:39:26.227','2026-10-30 12:39:26.227'),(9,1,'1-1003','Bank','ASET','DEBIT',6,1,'Saldo rekening bank usaha','2026-10-30 12:39:26.231','2026-10-30 12:39:26.231'),(10,1,'1-1004','Piutang Usaha','ASET','DEBIT',6,1,'Tagihan kepada pelanggan yang belum dibayar','2026-10-30 12:39:26.236','2026-10-30 12:39:26.236'),(11,1,'1-1005','Persediaan Barang','ASET','DEBIT',6,1,'Stok barang dagangan','2026-10-30 12:39:26.241','2026-10-30 12:39:26.241'),(12,1,'1-1006','Perlengkapan / Supplies','ASET','DEBIT',6,1,'Perlengkapan operasional yang belum habis dipakai','2026-10-30 12:39:26.246','2026-10-30 12:39:26.246'),(13,1,'1-1007','Biaya Dibayar di Muka','ASET','DEBIT',6,1,'Pembayaran yang dilakukan sebelum manfaatnya diterima (mis: sewa dibayar dimuka)','2026-10-30 12:39:26.250','2026-10-30 12:39:26.250'),(14,1,'1-2000','Aset Tidak Lancar','ASET','DEBIT',1,1,'Aset jangka panjang','2026-10-30 12:39:26.254','2026-10-30 12:39:26.254'),(15,1,'1-2001','Tanah','ASET','DEBIT',14,1,'Nilai tanah yang dimiliki','2026-10-30 12:39:26.259','2026-10-30 12:39:26.259'),(16,1,'1-2002','Bangunan','ASET','DEBIT',14,1,'Nilai bangunan/gedung','2026-10-30 12:39:26.264','2026-10-30 12:39:26.264'),(17,1,'1-2003','Akumulasi Penyusutan Bangunan','ASET','KREDIT',14,1,'Akumulasi pengurangan nilai bangunan','2026-10-30 12:39:26.269','2026-10-30 12:39:26.269'),(18,1,'1-2004','Peralatan','ASET','DEBIT',14,1,'Peralatan usaha (mesin, elektronik, dll)','2026-10-30 12:39:26.276','2026-10-30 12:39:26.276'),(19,1,'1-2005','Akumulasi Penyusutan Peralatan','ASET','KREDIT',14,1,'Akumulasi pengurangan nilai peralatan','2026-10-30 12:39:26.282','2026-10-30 12:39:26.282'),(20,1,'1-2006','Kendaraan','ASET','DEBIT',14,1,'Nilai kendaraan operasional','2026-10-30 12:39:26.287','2026-10-30 12:39:26.287'),(21,1,'1-2007','Akumulasi Penyusutan Kendaraan','ASET','KREDIT',14,1,'Akumulasi pengurangan nilai kendaraan','2026-10-30 12:39:26.291','2026-10-30 12:39:26.291'),(22,1,'2-1000','Kewajiban Lancar','KEWAJIBAN','KREDIT',2,1,'Kewajiban yang jatuh tempo dalam satu tahun','2026-10-30 12:39:26.295','2026-10-30 12:39:26.295'),(23,1,'2-1001','Hutang Usaha','KEWAJIBAN','KREDIT',22,1,'Hutang kepada pemasok/vendor','2026-10-30 12:39:26.300','2026-10-30 12:39:26.300'),(24,1,'2-1002','Hutang Gaji','KEWAJIBAN','KREDIT',22,1,'Gaji karyawan yang belum dibayarkan','2026-10-30 12:39:26.305','2026-10-30 12:39:26.305'),(25,1,'2-1003','Hutang Pajak','KEWAJIBAN','KREDIT',22,1,'Kewajiban pajak yang belum disetor','2026-10-30 12:39:26.310','2026-10-30 12:39:26.310'),(26,1,'2-1004','Pendapatan Diterima di Muka','KEWAJIBAN','KREDIT',22,1,'Pembayaran dari pelanggan sebelum barang/jasa diserahkan','2026-10-30 12:39:26.314','2026-10-30 12:39:26.314'),(27,1,'2-1005','Biaya Akrual','KEWAJIBAN','KREDIT',22,1,'Biaya yang sudah terjadi tapi belum dibayar','2026-10-30 12:39:26.319','2026-10-30 12:39:26.319'),(28,1,'2-2000','Kewajiban Jangka Panjang','KEWAJIBAN','KREDIT',2,1,'Kewajiban yang jatuh tempo lebih dari satu tahun','2026-10-30 12:39:26.323','2026-10-30 12:39:26.323'),(29,1,'2-2001','Hutang Bank Jangka Panjang','KEWAJIBAN','KREDIT',28,1,'Pinjaman bank jangka panjang','2026-10-30 12:39:26.328','2026-10-30 12:39:26.328'),(30,1,'3-1001','Modal Awal','EKUITAS','KREDIT',3,1,'Modal yang disetor oleh pemilik usaha','2026-10-30 12:39:26.333','2026-10-30 12:39:26.333'),(31,1,'3-1002','Prive / Penarikan Pemilik','EKUITAS','DEBIT',3,1,'Penarikan uang/aset oleh pemilik untuk keperluan pribadi','2026-10-30 12:39:26.337','2026-10-30 12:39:26.337'),(32,1,'3-1003','Laba / Rugi Ditahan','EKUITAS','KREDIT',3,1,'Akumulasi laba/rugi tahun-tahun sebelumnya','2026-10-30 12:39:26.342','2026-10-30 12:39:26.342'),(33,1,'3-1004','Laba / Rugi Periode Berjalan','EKUITAS','KREDIT',3,1,'Laba/rugi periode akuntansi saat ini','2026-10-30 12:39:26.347','2026-10-30 12:39:26.347'),(34,1,'4-1001','Pendapatan Penjualan','PENDAPATAN','KREDIT',4,1,'Pendapatan dari penjualan barang/jasa','2026-10-30 12:39:26.351','2026-10-30 12:39:26.351'),(35,1,'4-1002','Pendapatan Jasa','PENDAPATAN','KREDIT',4,1,'Pendapatan dari penyediaan jasa','2026-10-30 12:39:26.356','2026-10-30 12:39:26.356'),(36,1,'4-1003','Pendapatan Lain-lain','PENDAPATAN','KREDIT',4,1,'Pendapatan di luar kegiatan usaha utama','2026-10-30 12:39:26.360','2026-10-30 12:39:26.360'),(37,1,'4-1004','Diskon Penjualan (Kontra)','PENDAPATAN','DEBIT',4,1,'Pengurangan pendapatan akibat diskon yang diberikan','2026-10-30 12:39:26.366','2026-10-30 12:39:26.366'),(38,1,'4-1005','Retur Penjualan (Kontra)','PENDAPATAN','DEBIT',4,1,'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan','2026-10-30 12:39:26.371','2026-10-30 12:39:26.371'),(39,1,'5-1000','Beban Pokok Penjualan (HPP)','BEBAN','DEBIT',5,1,'Biaya langsung terkait produksi atau pembelian barang yang dijual','2026-10-30 12:39:26.375','2026-10-30 12:39:26.375'),(40,1,'5-1001','Harga Pokok Penjualan','BEBAN','DEBIT',39,1,'HPP barang dagangan yang terjual','2026-10-30 12:39:26.380','2026-10-30 12:39:26.380'),(41,1,'5-1002','Pembelian Bahan Baku','BEBAN','DEBIT',39,1,'Pembelian bahan baku untuk produksi','2026-10-30 12:39:26.384','2026-10-30 12:39:26.384'),(42,1,'5-2000','Beban Operasional','BEBAN','DEBIT',5,1,'Biaya operasional rutin usaha','2026-10-30 12:39:26.388','2026-10-30 12:39:26.388'),(43,1,'5-2001','Beban Gaji & Upah','BEBAN','DEBIT',42,1,'Gaji dan upah karyawan','2026-10-30 12:39:26.392','2026-10-30 12:39:26.392'),(44,1,'5-2002','Beban Sewa','BEBAN','DEBIT',42,1,'Biaya sewa tempat usaha','2026-10-30 12:39:26.397','2026-10-30 12:39:26.397'),(45,1,'5-2003','Beban Listrik & Air','BEBAN','DEBIT',42,1,'Tagihan listrik dan air','2026-10-30 12:39:26.402','2026-10-30 12:39:26.402'),(46,1,'5-2004','Beban Telepon & Internet','BEBAN','DEBIT',42,1,'Tagihan telepon dan internet','2026-10-30 12:39:26.406','2026-10-30 12:39:26.406'),(47,1,'5-2005','Beban Transportasi','BEBAN','DEBIT',42,1,'Biaya transportasi operasional','2026-10-30 12:39:26.411','2026-10-30 12:39:26.411'),(48,1,'5-2006','Beban Perlengkapan','BEBAN','DEBIT',42,1,'Biaya perlengkapan operasional yang habis pakai','2026-10-30 12:39:26.415','2026-10-30 12:39:26.415'),(49,1,'5-2007','Beban Pemeliharaan','BEBAN','DEBIT',42,1,'Biaya perawatan dan perbaikan peralatan/gedung','2026-10-30 12:39:26.420','2026-10-30 12:39:26.420'),(50,1,'5-2008','Beban Iklan & Promosi','BEBAN','DEBIT',42,1,'Biaya pemasaran dan promosi','2026-10-30 12:39:26.424','2026-10-30 12:39:26.424'),(51,1,'5-3000','Beban Penyusutan','BEBAN','DEBIT',5,1,'Beban penyusutan aset tetap','2026-10-30 12:39:26.429','2026-10-30 12:39:26.429'),(52,1,'5-3001','Beban Penyusutan Bangunan','BEBAN','DEBIT',51,1,'Penyusutan nilai bangunan per periode','2026-10-30 12:39:26.434','2026-10-30 12:39:26.434'),(53,1,'5-3002','Beban Penyusutan Peralatan','BEBAN','DEBIT',51,1,'Penyusutan nilai peralatan per periode','2026-10-30 12:39:26.439','2026-10-30 12:39:26.439'),(54,1,'5-3003','Beban Penyusutan Kendaraan','BEBAN','DEBIT',51,1,'Penyusutan nilai kendaraan per periode','2026-10-30 12:39:26.443','2026-10-30 12:39:26.443'),(55,1,'5-4000','Beban Lain-lain','BEBAN','DEBIT',5,1,'Pengeluaran di luar operasional utama','2026-10-30 12:39:26.448','2026-10-30 12:39:26.448'),(56,1,'5-4001','Beban Bunga','BEBAN','DEBIT',55,1,'Biaya bunga pinjaman','2026-10-30 12:39:26.452','2026-10-30 12:39:26.452'),(57,1,'5-4002','Beban Pajak','BEBAN','DEBIT',55,1,'Beban pajak usaha','2026-10-30 12:39:26.456','2026-10-30 12:39:26.456'),(58,1,'5-4003','Beban Administrasi & Umum','BEBAN','DEBIT',55,1,'Biaya administrasi umum yang tidak terklasifikasi','2026-10-30 12:39:26.461','2026-10-30 12:39:26.461'),(59,2,'1-0000','ASET','ASET','DEBIT',NULL,1,'Akun induk: Seluruh kekayaan usaha','2026-10-30 12:48:37.832','2026-10-30 12:48:37.832'),(60,2,'2-0000','KEWAJIBAN','KEWAJIBAN','KREDIT',NULL,1,'Akun induk: Seluruh hutang/kewajiban usaha','2026-10-30 12:48:38.038','2026-10-30 12:48:38.038'),(61,2,'3-0000','EKUITAS','EKUITAS','KREDIT',NULL,1,'Akun induk: Modal pemilik','2026-10-30 12:48:38.061','2026-10-30 12:48:38.061'),(62,2,'4-0000','PENDAPATAN','PENDAPATAN','KREDIT',NULL,1,'Akun induk: Seluruh pendapatan usaha','2026-10-30 12:48:38.069','2026-10-30 12:48:38.069'),(63,2,'5-0000','BEBAN','BEBAN','DEBIT',NULL,1,'Akun induk: Seluruh beban/pengeluaran usaha','2026-10-30 12:48:38.074','2026-10-30 12:48:38.074'),(64,2,'1-1000','Aset Lancar','ASET','DEBIT',59,1,'Aset yang dapat dicairkan dalam satu tahun','2026-10-30 12:48:38.077','2026-10-30 12:48:38.077'),(65,2,'1-1001','Kas','ASET','DEBIT',64,1,'Uang tunai di tangan kasir','2026-10-30 12:48:38.109','2026-10-30 12:48:38.109'),(66,2,'1-1002','Kas Kecil (Petty Cash)','ASET','DEBIT',64,1,'Dana kas kecil untuk pengeluaran rutin kecil','2026-10-30 12:48:38.119','2026-10-30 12:48:38.119'),(67,2,'1-1003','Bank','ASET','DEBIT',64,1,'Saldo rekening bank usaha','2026-10-30 12:48:38.136','2026-10-30 12:48:38.136'),(68,2,'1-1004','Piutang Usaha','ASET','DEBIT',64,1,'Tagihan kepada pelanggan yang belum dibayar','2026-10-30 12:48:38.140','2026-10-30 12:48:38.140'),(69,2,'1-1005','Persediaan Barang','ASET','DEBIT',64,1,'Stok barang dagangan','2026-10-30 12:48:38.145','2026-10-30 12:48:38.145'),(70,2,'1-1006','Perlengkapan / Supplies','ASET','DEBIT',64,1,'Perlengkapan operasional yang belum habis dipakai','2026-10-30 12:48:38.150','2026-10-30 12:48:38.150'),(71,2,'1-1007','Biaya Dibayar di Muka','ASET','DEBIT',64,1,'Pembayaran yang dilakukan sebelum manfaatnya diterima','2026-10-30 12:48:38.154','2026-10-30 12:48:38.154'),(72,2,'1-2000','Aset Tidak Lancar','ASET','DEBIT',59,1,'Aset jangka panjang','2026-10-30 12:48:38.159','2026-10-30 12:48:38.159'),(73,2,'1-2001','Tanah','ASET','DEBIT',72,1,'Nilai tanah yang dimiliki','2026-10-30 12:48:38.163','2026-10-30 12:48:38.163'),(74,2,'1-2002','Bangunan','ASET','DEBIT',72,1,'Nilai bangunan/gedung','2026-10-30 12:48:38.168','2026-10-30 12:48:38.168'),(75,2,'1-2003','Akumulasi Penyusutan Bangunan','ASET','KREDIT',72,1,'Akumulasi pengurangan nilai bangunan','2026-10-30 12:48:38.171','2026-10-30 12:48:38.171'),(76,2,'1-2004','Peralatan','ASET','DEBIT',72,1,'Peralatan usaha (mesin, elektronik, dll)','2026-10-30 12:48:38.181','2026-10-30 12:48:38.181'),(77,2,'1-2005','Akumulasi Penyusutan Peralatan','ASET','KREDIT',72,1,'Akumulasi pengurangan nilai peralatan','2026-10-30 12:48:38.185','2026-10-30 12:48:38.185'),(78,2,'1-2006','Kendaraan','ASET','DEBIT',72,1,'Nilai kendaraan operasional','2026-10-30 12:48:38.189','2026-10-30 12:48:38.189'),(79,2,'1-2007','Akumulasi Penyusutan Kendaraan','ASET','KREDIT',72,1,'Akumulasi pengurangan nilai kendaraan','2026-10-30 12:48:38.193','2026-10-30 12:48:38.193'),(80,2,'2-1000','Kewajiban Lancar','KEWAJIBAN','KREDIT',60,1,'Kewajiban yang jatuh tempo dalam satu tahun','2026-10-30 12:48:38.197','2026-10-30 12:48:38.197'),(81,2,'2-1001','Hutang Usaha','KEWAJIBAN','KREDIT',80,1,'Hutang kepada pemasok/vendor','2026-10-30 12:48:38.201','2026-10-30 12:48:38.201'),(82,2,'2-1002','Hutang Gaji','KEWAJIBAN','KREDIT',80,1,'Gaji karyawan yang belum dibayarkan','2026-10-30 12:48:38.205','2026-10-30 12:48:38.205'),(83,2,'2-1003','Hutang Pajak','KEWAJIBAN','KREDIT',80,1,'Kewajiban pajak yang belum disetor','2026-10-30 12:48:38.208','2026-10-30 12:48:38.208'),(84,2,'2-1004','Pendapatan Diterima di Muka','KEWAJIBAN','KREDIT',80,1,'Pembayaran dari pelanggan sebelum barang/jasa diserahkan','2026-10-30 12:48:38.212','2026-10-30 12:48:38.212'),(85,2,'2-1005','Biaya Akrual','KEWAJIBAN','KREDIT',80,1,'Biaya yang sudah terjadi tapi belum dibayar','2026-10-30 12:48:38.217','2026-10-30 12:48:38.217'),(86,2,'2-2000','Kewajiban Jangka Panjang','KEWAJIBAN','KREDIT',60,1,'Kewajiban yang jatuh tempo lebih dari satu tahun','2026-10-30 12:48:38.221','2026-10-30 12:48:38.221'),(87,2,'2-2001','Hutang Bank Jangka Panjang','KEWAJIBAN','KREDIT',86,1,'Pinjaman bank jangka panjang','2026-10-30 12:48:38.225','2026-10-30 12:48:38.225'),(88,2,'3-1001','Modal Awal','EKUITAS','KREDIT',61,1,'Modal yang disetor oleh pemilik usaha','2026-10-30 12:48:38.230','2026-10-30 12:48:38.230'),(89,2,'3-1002','Prive / Penarikan Pemilik','EKUITAS','DEBIT',61,1,'Penarikan uang/aset oleh pemilik untuk keperluan pribadi','2026-10-30 12:48:38.233','2026-10-30 12:48:38.233'),(90,2,'3-1003','Laba / Rugi Ditahan','EKUITAS','KREDIT',61,1,'Akumulasi laba/rugi tahun-tahun sebelumnya','2026-10-30 12:48:38.237','2026-10-30 12:48:38.237'),(91,2,'3-1004','Laba / Rugi Periode Berjalan','EKUITAS','KREDIT',61,1,'Laba/rugi periode akuntansi saat ini','2026-10-30 12:48:38.242','2026-10-30 12:48:38.242'),(92,2,'4-1001','Pendapatan Penjualan','PENDAPATAN','KREDIT',62,1,'Pendapatan dari penjualan barang/jasa','2026-10-30 12:48:38.246','2026-10-30 12:48:38.246'),(93,2,'4-1002','Pendapatan Jasa','PENDAPATAN','KREDIT',62,1,'Pendapatan dari penyediaan jasa','2026-10-30 12:48:38.250','2026-10-30 12:48:38.250'),(94,2,'4-1003','Pendapatan Lain-lain','PENDAPATAN','KREDIT',62,1,'Pendapatan di luar kegiatan usaha utama','2026-10-30 12:48:38.254','2026-10-30 12:48:38.254'),(95,2,'4-1004','Diskon Penjualan (Kontra)','PENDAPATAN','DEBIT',62,1,'Pengurangan pendapatan akibat diskon yang diberikan','2026-10-30 12:48:38.258','2026-10-30 12:48:38.258'),(96,2,'4-1005','Retur Penjualan (Kontra)','PENDAPATAN','DEBIT',62,1,'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan','2026-10-30 12:48:38.263','2026-10-30 12:48:38.263'),(97,2,'5-1000','Beban Pokok Penjualan (HPP)','BEBAN','DEBIT',63,1,'Biaya langsung terkait produksi atau pembelian barang yang dijual','2026-10-30 12:48:38.266','2026-10-30 12:48:38.266'),(98,2,'5-1001','Harga Pokok Penjualan','BEBAN','DEBIT',97,1,'HPP barang dagangan yang terjual','2026-10-30 12:48:38.270','2026-10-30 12:48:38.270'),(99,2,'5-1002','Pembelian Bahan Baku','BEBAN','DEBIT',97,1,'Pembelian bahan baku untuk produksi','2026-10-30 12:48:38.274','2026-10-30 12:48:38.274'),(100,2,'5-2000','Beban Operasional','BEBAN','DEBIT',63,1,'Biaya operasional rutin usaha','2026-10-30 12:48:38.278','2026-10-30 12:48:38.278'),(101,2,'5-2001','Beban Gaji & Upah','BEBAN','DEBIT',100,1,'Gaji dan upah karyawan','2026-10-30 12:48:38.282','2026-10-30 12:48:38.282'),(102,2,'5-2002','Beban Sewa','BEBAN','DEBIT',100,1,'Biaya sewa tempat usaha','2026-10-30 12:48:38.286','2026-10-30 12:48:38.286'),(103,2,'5-2003','Beban Listrik & Air','BEBAN','DEBIT',100,1,'Tagihan listrik dan air','2026-10-30 12:48:38.291','2026-10-30 12:48:38.291'),(104,2,'5-2004','Beban Telepon & Internet','BEBAN','DEBIT',100,1,'Tagihan telepon dan internet','2026-10-30 12:48:38.296','2026-10-30 12:48:38.296'),(105,2,'5-2005','Beban Transportasi','BEBAN','DEBIT',100,1,'Biaya transportasi operasional','2026-10-30 12:48:38.302','2026-10-30 12:48:38.302'),(106,2,'5-2006','Beban Perlengkapan','BEBAN','DEBIT',100,1,'Biaya perlengkapan operasional yang habis pakai','2026-10-30 12:48:38.313','2026-10-30 12:48:38.313'),(107,2,'5-2007','Beban Pemeliharaan','BEBAN','DEBIT',100,1,'Biaya perawatan dan perbaikan peralatan/gedung','2026-10-30 12:48:38.318','2026-10-30 12:48:38.318'),(108,2,'5-2008','Beban Iklan & Promosi','BEBAN','DEBIT',100,1,'Biaya pemasaran dan promosi','2026-10-30 12:48:38.327','2026-10-30 12:48:38.327'),(109,2,'5-3000','Beban Penyusutan','BEBAN','DEBIT',63,1,'Beban penyusutan aset tetap','2026-10-30 12:48:38.331','2026-10-30 12:48:38.331'),(110,2,'5-3001','Beban Penyusutan Bangunan','BEBAN','DEBIT',109,1,'Penyusutan nilai bangunan per periode','2026-10-30 12:48:38.339','2026-10-30 12:48:38.339'),(111,2,'5-3002','Beban Penyusutan Peralatan','BEBAN','DEBIT',109,1,'Penyusutan nilai peralatan per periode','2026-10-30 12:48:38.344','2026-10-30 12:48:38.344'),(112,2,'5-3003','Beban Penyusutan Kendaraan','BEBAN','DEBIT',109,1,'Penyusutan nilai kendaraan per periode','2026-10-30 12:48:38.352','2026-10-30 12:48:38.352'),(113,2,'5-4000','Beban Lain-lain','BEBAN','DEBIT',63,1,'Pengeluaran di luar operasional utama','2026-10-30 12:48:38.358','2026-10-30 12:48:38.358'),(114,2,'5-4001','Beban Bunga','BEBAN','DEBIT',113,1,'Biaya bunga pinjaman','2026-10-30 12:48:38.363','2026-10-30 12:48:38.363'),(115,2,'5-4002','Beban Pajak','BEBAN','DEBIT',113,1,'Beban pajak usaha','2026-10-30 12:48:38.369','2026-10-30 12:48:38.369'),(116,2,'5-4003','Beban Administrasi & Umum','BEBAN','DEBIT',113,1,'Biaya administrasi umum yang tidak terklasifikasi','2026-10-30 12:48:38.375','2026-10-30 12:48:38.375');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `businesses`
--

DROP TABLE IF EXISTS `businesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `businesses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `code` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `businesses_code_key` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `businesses`
--

LOCK TABLES `businesses` WRITE;
/*!40000 ALTER TABLE `businesses` DISABLE KEYS */;
INSERT INTO `businesses` VALUES (1,'Usaha Pertama','USAHA01','Jl. Contoh No. 1, Jakarta','021-12345678','Unit usaha pertama Robin Group',1,'2026-10-30 12:39:26.163','2026-10-30 12:39:26.163',NULL),(2,'Robin Cafe & Resto','CAFE01','Jl. Kuliner No. 8','08123456789','Unit usaha F&B Robin Group',1,'2026-10-30 12:48:37.599','2026-10-30 12:48:37.599',NULL);
/*!40000 ALTER TABLE `businesses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_entries`
--

DROP TABLE IF EXISTS `journal_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `nomor_jurnal` varchar(50) NOT NULL,
  `type` enum('PENJUALAN','PENGELUARAN','PENYESUAIAN','TRANSFER','PEMBUKAAN','PENUTUPAN') NOT NULL,
  `description` text NOT NULL,
  `total_debit` decimal(15,2) NOT NULL,
  `total_kredit` decimal(15,2) NOT NULL,
  `journal_date` datetime(3) NOT NULL,
  `is_reversed` tinyint(1) NOT NULL DEFAULT 0,
  `reversed_from_id` int(11) DEFAULT NULL,
  `created_by_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_entries_nomor_jurnal_key` (`nomor_jurnal`),
  UNIQUE KEY `journal_entries_transaction_id_key` (`transaction_id`),
  KEY `journal_entries_business_id_fkey` (`business_id`),
  KEY `journal_entries_created_by_id_fkey` (`created_by_id`),
  KEY `journal_entries_reversed_from_id_fkey` (`reversed_from_id`),
  CONSTRAINT `journal_entries_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `journal_entries_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `journal_entries_reversed_from_id_fkey` FOREIGN KEY (`reversed_from_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `journal_entries_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_entries`
--

LOCK TABLES `journal_entries` WRITE;
/*!40000 ALTER TABLE `journal_entries` DISABLE KEYS */;
INSERT INTO `journal_entries` VALUES (1,2,1,'JRN-20261030-0001','PENJUALAN','Penjualan kasir: TRX-20261030-0001',89000.00,89000.00,'2026-10-30 13:04:35.601',1,NULL,1,'2026-10-30 13:04:35.649','2026-10-30 13:05:05.091'),(2,2,2,'JRN-20261030-0002','PENGELUARAN','Pengeluaran kas: Beban Listrik & Air - Pembayaran token listrik toko bulan ini',250000.00,250000.00,'2026-10-30 13:04:35.812',0,NULL,1,'2026-10-30 13:04:35.824','2026-10-30 13:04:35.824'),(3,2,NULL,'REV-20261030-0003','PENYESUAIAN','Jurnal Pembalik atas transaksi TRX-20261030-0001 (Alasan: Pelanggan salah pesan dan pesanan dibatalkan)',89000.00,89000.00,'2026-10-30 13:05:05.117',0,1,1,'2026-10-30 13:05:05.119','2026-10-30 13:05:05.119');
/*!40000 ALTER TABLE `journal_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_items`
--

DROP TABLE IF EXISTS `journal_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `journal_entry_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `is_debit` tinyint(1) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `journal_items_journal_entry_id_fkey` (`journal_entry_id`),
  KEY `journal_items_account_id_fkey` (`account_id`),
  CONSTRAINT `journal_items_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `journal_items_journal_entry_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_items`
--

LOCK TABLES `journal_items` WRITE;
/*!40000 ALTER TABLE `journal_items` DISABLE KEYS */;
INSERT INTO `journal_items` VALUES (1,1,65,1,61000.00,'Penerimaan kas/bank penjualan (TRX-20261030-0001)'),(2,1,92,0,61000.00,'Pendapatan penjualan barang/jasa (TRX-20261030-0001)'),(3,1,98,1,28000.00,'HPP penjualan barang (TRX-20261030-0001)'),(4,1,69,0,28000.00,'Pengurangan persediaan barang (TRX-20261030-0001)'),(5,2,103,1,250000.00,'Beban Beban Listrik & Air: Pembayaran token listrik toko bulan ini'),(6,2,65,0,250000.00,'Pengeluaran via Kas (EXP-20261030-0002)'),(7,3,65,0,61000.00,'[PEMBALIK] Penerimaan kas/bank penjualan (TRX-20261030-0001)'),(8,3,92,1,61000.00,'[PEMBALIK] Pendapatan penjualan barang/jasa (TRX-20261030-0001)'),(9,3,98,0,28000.00,'[PEMBALIK] HPP penjualan barang (TRX-20261030-0001)'),(10,3,69,1,28000.00,'[PEMBALIK] Pengurangan persediaan barang (TRX-20261030-0001)');
/*!40000 ALTER TABLE `journal_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'PCS',
  `selling_price` decimal(15,2) NOT NULL,
  `purchase_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `current_stock` decimal(15,2) NOT NULL DEFAULT 0.00,
  `minimum_stock` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_business_id_code_key` (`business_id`,`code`),
  CONSTRAINT `products_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,2,'KOP01','Kopi Susu Gula Aren','CUP',18000.00,8000.00,50.00,10.00,1,NULL,'2026-10-30 13:04:35.308','2026-10-30 13:05:05.066',NULL),(2,2,'CR01','Croissant Butter','PCS',25000.00,12000.00,30.00,5.00,1,NULL,'2026-10-30 13:04:35.559','2026-10-30 13:05:05.080',NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `type` enum('MASUK','KELUAR','OPNAME','RETUR') NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `stock_before` decimal(15,2) NOT NULL,
  `stock_after` decimal(15,2) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `stock_movements_business_id_fkey` (`business_id`),
  KEY `stock_movements_product_id_fkey` (`product_id`),
  CONSTRAINT `stock_movements_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,2,1,'MASUK',50.00,0.00,50.00,'STOK-AWAL','Pencatatan stok awal saat produk baru didaftarkan','2026-10-30 13:04:35.326'),(2,2,2,'MASUK',30.00,0.00,30.00,'STOK-AWAL','Pencatatan stok awal saat produk baru didaftarkan','2026-10-30 13:04:35.565'),(3,2,1,'KELUAR',2.00,50.00,48.00,'TRX-20261030-0001','Penjualan kasir (TRX-20261030-0001)','2026-10-30 13:04:35.620'),(4,2,2,'KELUAR',1.00,30.00,29.00,'TRX-20261030-0001','Penjualan kasir (TRX-20261030-0001)','2026-10-30 13:04:35.632'),(5,2,1,'RETUR',2.00,48.00,50.00,'VOID-TRX-20261030-0001','Pengembalian stok akibat transaksi divoid: Pelanggan salah pesan dan pesanan dibatalkan','2026-10-30 13:05:05.071'),(6,2,2,'RETUR',1.00,29.00,30.00,'VOID-TRX-20261030-0001','Pengembalian stok akibat transaksi divoid: Pelanggan salah pesan dan pesanan dibatalkan','2026-10-30 13:05:05.086');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_items`
--

DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `transaction_items_transaction_id_fkey` (`transaction_id`),
  KEY `transaction_items_product_id_fkey` (`product_id`),
  CONSTRAINT `transaction_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transaction_items_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
INSERT INTO `transaction_items` VALUES (1,1,1,'Kopi Susu Gula Aren',2.00,18000.00,36000.00),(2,1,2,'Croissant Butter',1.00,25000.00,25000.00),(3,2,NULL,'Beban Listrik & Air (Pembayaran token listrik toko bulan ini)',1.00,250000.00,250000.00);
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `nomor_bukti` varchar(50) NOT NULL,
  `type` enum('PEMASUKAN','PENGELUARAN') NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(15,2) NOT NULL,
  `payment_method` enum('TUNAI','TRANSFER','QRIS','DEBIT','KREDIT') NOT NULL,
  `cash_paid` decimal(15,2) DEFAULT NULL,
  `change_amount` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `transaction_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_by_id` int(11) NOT NULL,
  `voided_at` datetime(3) DEFAULT NULL,
  `void_reason` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactions_nomor_bukti_key` (`nomor_bukti`),
  KEY `transactions_business_id_fkey` (`business_id`),
  KEY `transactions_created_by_id_fkey` (`created_by_id`),
  CONSTRAINT `transactions_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `transactions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,2,'TRX-20261030-0001','PEMASUKAN',61000.00,0.00,0.00,61000.00,'TUNAI',70000.00,9000.00,'Pelanggan meja 3','2026-10-30 13:04:35.601',1,'2026-10-30 13:05:05.054','Pelanggan salah pesan dan pesanan dibatalkan','2026-10-30 13:04:35.603','2026-10-30 13:05:05.057'),(2,2,'EXP-20261030-0002','PENGELUARAN',250000.00,0.00,0.00,250000.00,'TUNAI',NULL,NULL,'Pembayaran token listrik toko bulan ini','2026-10-30 13:04:35.812',1,NULL,NULL,'2026-10-30 13:04:35.814','2026-10-30 13:04:35.814');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_business_access`
--

DROP TABLE IF EXISTS `user_business_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_business_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_business_access_user_id_business_id_key` (`user_id`,`business_id`),
  KEY `user_business_access_business_id_fkey` (`business_id`),
  CONSTRAINT `user_business_access_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `user_business_access_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_business_access`
--

LOCK TABLES `user_business_access` WRITE;
/*!40000 ALTER TABLE `user_business_access` DISABLE KEYS */;
INSERT INTO `user_business_access` VALUES (1,1,1,'2026-10-30 12:39:26.174'),(2,1,2,'2026-10-30 12:48:37.617'),(3,2,2,'2026-10-30 12:48:39.252');
/*!40000 ALTER TABLE `user_business_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','KASIR') NOT NULL DEFAULT 'KASIR',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'superadmin','$2b$12$oeLSKCFck5mpxJsu40p/5ej0JEoy4RMST6vPU86TmdvPEo2L/AkDC','Super Administrator','SUPER_ADMIN',1,'2026-10-30 12:39:26.143','2026-10-30 12:39:26.143',NULL),(2,'kasir1','$2b$12$uDZVMSjd9SN63Ipo4qs0uu7VG6s/320p7gxG6DoKuRcq7K3MMkHR6','Budi Santoso','KASIR',1,'2026-10-30 12:48:39.246','2026-10-30 12:48:39.246',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-30 20:38:03
