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
INSERT INTO `_prisma_migrations` VALUES ('1d256848-92c4-4b79-b549-8673cd2ffd4b','c25297cbed7d2a975cba759cbb5dcf21af6ad393a5367afc7685daa51b0959e0','2026-10-30 12:38:37.439','20261030123835_init',NULL,NULL,'2026-10-30 12:38:35.431',1),('1ebb3fbb-7fb1-4575-a669-ca6f5e797ece','e6c3524c5494ced1270ffd663fc576b2cb0a1dbfd6ae9f933b177c167cfb99fc','2026-10-30 14:28:08.341','20261030142808_add_inventory_items',NULL,NULL,'2026-10-30 14:28:08.155',1);
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
) ENGINE=InnoDB AUTO_INCREMENT=238 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,1,'1-0000','ASET','ASET','DEBIT',NULL,1,'Akun induk: Seluruh kekayaan usaha','2026-10-30 12:39:26.183','2026-10-30 12:39:26.183'),(2,1,'2-0000','KEWAJIBAN','KEWAJIBAN','KREDIT',NULL,1,'Akun induk: Seluruh hutang/kewajiban usaha','2026-10-30 12:39:26.191','2026-10-30 12:39:26.191'),(3,1,'3-0000','EKUITAS','EKUITAS','KREDIT',NULL,1,'Akun induk: Modal pemilik','2026-10-30 12:39:26.199','2026-10-30 12:39:26.199'),(4,1,'4-0000','PENDAPATAN','PENDAPATAN','KREDIT',NULL,1,'Akun induk: Seluruh pendapatan usaha','2026-10-30 12:39:26.205','2026-10-30 12:39:26.205'),(5,1,'5-0000','BEBAN','BEBAN','DEBIT',NULL,1,'Akun induk: Seluruh beban/pengeluaran usaha','2026-10-30 12:39:26.210','2026-10-30 12:39:26.210'),(6,1,'1-1000','Aset Lancar','ASET','DEBIT',1,1,'Aset yang dapat dicairkan dalam satu tahun','2026-10-30 12:39:26.215','2026-10-30 12:39:26.215'),(7,1,'1-1001','Kas','ASET','DEBIT',6,1,'Uang tunai di tangan kasir','2026-10-30 12:39:26.221','2026-10-30 12:39:26.221'),(8,1,'1-1002','Kas Kecil (Petty Cash)','ASET','DEBIT',6,1,'Dana kas kecil untuk pengeluaran rutin kecil','2026-10-30 12:39:26.227','2026-10-30 12:39:26.227'),(9,1,'1-1003','Bank','ASET','DEBIT',6,1,'Saldo rekening bank usaha','2026-10-30 12:39:26.231','2026-10-30 12:39:26.231'),(10,1,'1-1004','Piutang Usaha','ASET','DEBIT',6,1,'Tagihan kepada pelanggan yang belum dibayar','2026-10-30 12:39:26.236','2026-10-30 12:39:26.236'),(11,1,'1-1005','Persediaan Bahan Baku / Inventaris','ASET','DEBIT',6,1,'Stok barang dagangan','2026-10-30 12:39:26.241','2026-10-31 06:30:31.654'),(12,1,'1-1006','Perlengkapan / Supplies','ASET','DEBIT',6,1,'Perlengkapan operasional yang belum habis dipakai','2026-10-30 12:39:26.246','2026-10-30 12:39:26.246'),(13,1,'1-1007','Biaya Dibayar di Muka','ASET','DEBIT',6,1,'Pembayaran yang dilakukan sebelum manfaatnya diterima (mis: sewa dibayar dimuka)','2026-10-30 12:39:26.250','2026-10-30 12:39:26.250'),(14,1,'1-2000','Aset Tidak Lancar','ASET','DEBIT',1,1,'Aset jangka panjang','2026-10-30 12:39:26.254','2026-10-30 12:39:26.254'),(15,1,'1-2001','Tanah','ASET','DEBIT',14,1,'Nilai tanah yang dimiliki','2026-10-30 12:39:26.259','2026-10-30 12:39:26.259'),(16,1,'1-2002','Bangunan','ASET','DEBIT',14,1,'Nilai bangunan/gedung','2026-10-30 12:39:26.264','2026-10-30 12:39:26.264'),(17,1,'1-2003','Akumulasi Penyusutan Bangunan','ASET','KREDIT',14,1,'Akumulasi pengurangan nilai bangunan','2026-10-30 12:39:26.269','2026-10-30 12:39:26.269'),(18,1,'1-2004','Peralatan','ASET','DEBIT',14,1,'Peralatan usaha (mesin, elektronik, dll)','2026-10-30 12:39:26.276','2026-10-30 12:39:26.276'),(19,1,'1-2005','Akumulasi Penyusutan Peralatan','ASET','KREDIT',14,1,'Akumulasi pengurangan nilai peralatan','2026-10-30 12:39:26.282','2026-10-30 12:39:26.282'),(20,1,'1-2006','Kendaraan','ASET','DEBIT',14,1,'Nilai kendaraan operasional','2026-10-30 12:39:26.287','2026-10-30 12:39:26.287'),(21,1,'1-2007','Akumulasi Penyusutan Kendaraan','ASET','KREDIT',14,1,'Akumulasi pengurangan nilai kendaraan','2026-10-30 12:39:26.291','2026-10-30 12:39:26.291'),(22,1,'2-1000','Kewajiban Lancar','KEWAJIBAN','KREDIT',2,1,'Kewajiban yang jatuh tempo dalam satu tahun','2026-10-30 12:39:26.295','2026-10-30 12:39:26.295'),(23,1,'2-1001','Hutang Usaha','KEWAJIBAN','KREDIT',22,1,'Hutang kepada pemasok/vendor','2026-10-30 12:39:26.300','2026-10-30 12:39:26.300'),(24,1,'2-1002','Hutang Gaji','KEWAJIBAN','KREDIT',22,1,'Gaji karyawan yang belum dibayarkan','2026-10-30 12:39:26.305','2026-10-30 12:39:26.305'),(25,1,'2-1003','Hutang Pajak','KEWAJIBAN','KREDIT',22,1,'Kewajiban pajak yang belum disetor','2026-10-30 12:39:26.310','2026-10-30 12:39:26.310'),(26,1,'2-1004','Pendapatan Diterima di Muka','KEWAJIBAN','KREDIT',22,1,'Pembayaran dari pelanggan sebelum barang/jasa diserahkan','2026-10-30 12:39:26.314','2026-10-30 12:39:26.314'),(27,1,'2-1005','Biaya Akrual','KEWAJIBAN','KREDIT',22,1,'Biaya yang sudah terjadi tapi belum dibayar','2026-10-30 12:39:26.319','2026-10-30 12:39:26.319'),(28,1,'2-2000','Kewajiban Jangka Panjang','KEWAJIBAN','KREDIT',2,1,'Kewajiban yang jatuh tempo lebih dari satu tahun','2026-10-30 12:39:26.323','2026-10-30 12:39:26.323'),(29,1,'2-2001','Hutang Bank Jangka Panjang','KEWAJIBAN','KREDIT',28,1,'Pinjaman bank jangka panjang','2026-10-30 12:39:26.328','2026-10-30 12:39:26.328'),(30,1,'3-1001','Modal Awal','EKUITAS','KREDIT',3,1,'Modal yang disetor oleh pemilik usaha','2026-10-30 12:39:26.333','2026-10-30 12:39:26.333'),(31,1,'3-1002','Prive / Penarikan Pemilik','EKUITAS','DEBIT',3,1,'Penarikan uang/aset oleh pemilik untuk keperluan pribadi','2026-10-30 12:39:26.337','2026-10-30 12:39:26.337'),(32,1,'3-1003','Laba / Rugi Ditahan','EKUITAS','KREDIT',3,1,'Akumulasi laba/rugi tahun-tahun sebelumnya','2026-10-30 12:39:26.342','2026-10-30 12:39:26.342'),(33,1,'3-1004','Laba / Rugi Periode Berjalan','EKUITAS','KREDIT',3,1,'Laba/rugi periode akuntansi saat ini','2026-10-30 12:39:26.347','2026-10-30 12:39:26.347'),(34,1,'4-1001','Pendapatan Penjualan','PENDAPATAN','KREDIT',4,1,'Pendapatan dari penjualan barang/jasa','2026-10-30 12:39:26.351','2026-10-30 12:39:26.351'),(35,1,'4-1002','Pendapatan Jasa','PENDAPATAN','KREDIT',4,1,'Pendapatan dari penyediaan jasa','2026-10-30 12:39:26.356','2026-10-30 12:39:26.356'),(36,1,'4-1003','Pendapatan Lain-lain','PENDAPATAN','KREDIT',4,1,'Pendapatan di luar kegiatan usaha utama','2026-10-30 12:39:26.360','2026-10-30 12:39:26.360'),(37,1,'4-1004','Diskon Penjualan (Kontra)','PENDAPATAN','DEBIT',4,1,'Pengurangan pendapatan akibat diskon yang diberikan','2026-10-30 12:39:26.366','2026-10-30 12:39:26.366'),(38,1,'4-1005','Retur Penjualan (Kontra)','PENDAPATAN','DEBIT',4,1,'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan','2026-10-30 12:39:26.371','2026-10-30 12:39:26.371'),(39,1,'5-1000','Beban Pokok Penjualan (HPP)','BEBAN','DEBIT',5,1,'Biaya langsung terkait produksi atau pembelian barang yang dijual','2026-10-30 12:39:26.375','2026-10-30 12:39:26.375'),(40,1,'5-1001','Beban Penjualan','BEBAN','DEBIT',39,1,'HPP barang dagangan yang terjual','2026-10-30 12:39:26.380','2026-10-31 06:30:31.644'),(41,1,'5-1002','Pembelian Bahan Baku','BEBAN','DEBIT',39,1,'Pembelian bahan baku untuk produksi','2026-10-30 12:39:26.384','2026-10-30 12:39:26.384'),(42,1,'5-2000','Beban Operasional','BEBAN','DEBIT',5,1,'Biaya operasional rutin usaha','2026-10-30 12:39:26.388','2026-10-30 12:39:26.388'),(43,1,'5-2001','Beban Gaji & Upah','BEBAN','DEBIT',42,1,'Gaji dan upah karyawan','2026-10-30 12:39:26.392','2026-10-30 12:39:26.392'),(44,1,'5-2002','Beban Sewa','BEBAN','DEBIT',42,1,'Biaya sewa tempat usaha','2026-10-30 12:39:26.397','2026-10-30 12:39:26.397'),(45,1,'5-2003','Beban Listrik & Air','BEBAN','DEBIT',42,1,'Tagihan listrik dan air','2026-10-30 12:39:26.402','2026-10-30 12:39:26.402'),(46,1,'5-2004','Beban Telepon & Internet','BEBAN','DEBIT',42,1,'Tagihan telepon dan internet','2026-10-30 12:39:26.406','2026-10-30 12:39:26.406'),(47,1,'5-2005','Beban Transportasi','BEBAN','DEBIT',42,1,'Biaya transportasi operasional','2026-10-30 12:39:26.411','2026-10-30 12:39:26.411'),(48,1,'5-2006','Beban Perlengkapan','BEBAN','DEBIT',42,1,'Biaya perlengkapan operasional yang habis pakai','2026-10-30 12:39:26.415','2026-10-30 12:39:26.415'),(49,1,'5-2007','Beban Pemeliharaan','BEBAN','DEBIT',42,1,'Biaya perawatan dan perbaikan peralatan/gedung','2026-10-30 12:39:26.420','2026-10-30 12:39:26.420'),(50,1,'5-2008','Beban Iklan & Promosi','BEBAN','DEBIT',42,1,'Biaya pemasaran dan promosi','2026-10-30 12:39:26.424','2026-10-30 12:39:26.424'),(51,1,'5-3000','Beban Penyusutan','BEBAN','DEBIT',5,1,'Beban penyusutan aset tetap','2026-10-30 12:39:26.429','2026-10-30 12:39:26.429'),(52,1,'5-3001','Beban Penyusutan Bangunan','BEBAN','DEBIT',51,1,'Penyusutan nilai bangunan per periode','2026-10-30 12:39:26.434','2026-10-30 12:39:26.434'),(53,1,'5-3002','Beban Penyusutan Peralatan','BEBAN','DEBIT',51,1,'Penyusutan nilai peralatan per periode','2026-10-30 12:39:26.439','2026-10-30 12:39:26.439'),(54,1,'5-3003','Beban Penyusutan Kendaraan','BEBAN','DEBIT',51,1,'Penyusutan nilai kendaraan per periode','2026-10-30 12:39:26.443','2026-10-30 12:39:26.443'),(55,1,'5-4000','Beban Lain-lain','BEBAN','DEBIT',5,1,'Pengeluaran di luar operasional utama','2026-10-30 12:39:26.448','2026-10-30 12:39:26.448'),(56,1,'5-4001','Beban Bunga','BEBAN','DEBIT',55,1,'Biaya bunga pinjaman','2026-10-30 12:39:26.452','2026-10-30 12:39:26.452'),(57,1,'5-4002','Beban Pajak','BEBAN','DEBIT',55,1,'Beban pajak usaha','2026-10-30 12:39:26.456','2026-10-30 12:39:26.456'),(58,1,'5-4003','Beban Administrasi & Umum','BEBAN','DEBIT',55,1,'Biaya administrasi umum yang tidak terklasifikasi','2026-10-30 12:39:26.461','2026-10-30 12:39:26.461'),(59,2,'1-0000','ASET','ASET','DEBIT',NULL,1,'Akun induk: Seluruh kekayaan usaha','2026-10-30 12:48:37.832','2026-10-30 12:48:37.832'),(60,2,'2-0000','KEWAJIBAN','KEWAJIBAN','KREDIT',NULL,1,'Akun induk: Seluruh hutang/kewajiban usaha','2026-10-30 12:48:38.038','2026-10-30 12:48:38.038'),(61,2,'3-0000','EKUITAS','EKUITAS','KREDIT',NULL,1,'Akun induk: Modal pemilik','2026-10-30 12:48:38.061','2026-10-30 12:48:38.061'),(62,2,'4-0000','PENDAPATAN','PENDAPATAN','KREDIT',NULL,1,'Akun induk: Seluruh pendapatan usaha','2026-10-30 12:48:38.069','2026-10-30 12:48:38.069'),(63,2,'5-0000','BEBAN','BEBAN','DEBIT',NULL,1,'Akun induk: Seluruh beban/pengeluaran usaha','2026-10-30 12:48:38.074','2026-10-30 12:48:38.074'),(64,2,'1-1000','Aset Lancar','ASET','DEBIT',59,1,'Aset yang dapat dicairkan dalam satu tahun','2026-10-30 12:48:38.077','2026-10-30 12:48:38.077'),(65,2,'1-1001','Kas','ASET','DEBIT',64,1,'Uang tunai di tangan kasir','2026-10-30 12:48:38.109','2026-10-30 12:48:38.109'),(66,2,'1-1002','Kas Kecil (Petty Cash)','ASET','DEBIT',64,1,'Dana kas kecil untuk pengeluaran rutin kecil','2026-10-30 12:48:38.119','2026-10-30 12:48:38.119'),(67,2,'1-1003','Bank','ASET','DEBIT',64,1,'Saldo rekening bank usaha','2026-10-30 12:48:38.136','2026-10-30 12:48:38.136'),(68,2,'1-1004','Piutang Usaha','ASET','DEBIT',64,1,'Tagihan kepada pelanggan yang belum dibayar','2026-10-30 12:48:38.140','2026-10-30 12:48:38.140'),(69,2,'1-1005','Persediaan Bahan Baku / Inventaris','ASET','DEBIT',64,1,'Stok barang dagangan','2026-10-30 12:48:38.145','2026-10-31 06:30:31.720'),(70,2,'1-1006','Perlengkapan / Supplies','ASET','DEBIT',64,1,'Perlengkapan operasional yang belum habis dipakai','2026-10-30 12:48:38.150','2026-10-30 12:48:38.150'),(71,2,'1-1007','Biaya Dibayar di Muka','ASET','DEBIT',64,1,'Pembayaran yang dilakukan sebelum manfaatnya diterima','2026-10-30 12:48:38.154','2026-10-30 12:48:38.154'),(72,2,'1-2000','Aset Tidak Lancar','ASET','DEBIT',59,1,'Aset jangka panjang','2026-10-30 12:48:38.159','2026-10-30 12:48:38.159'),(73,2,'1-2001','Tanah','ASET','DEBIT',72,1,'Nilai tanah yang dimiliki','2026-10-30 12:48:38.163','2026-10-30 12:48:38.163'),(74,2,'1-2002','Bangunan','ASET','DEBIT',72,1,'Nilai bangunan/gedung','2026-10-30 12:48:38.168','2026-10-30 12:48:38.168'),(75,2,'1-2003','Akumulasi Penyusutan Bangunan','ASET','KREDIT',72,1,'Akumulasi pengurangan nilai bangunan','2026-10-30 12:48:38.171','2026-10-30 12:48:38.171'),(76,2,'1-2004','Peralatan','ASET','DEBIT',72,1,'Peralatan usaha (mesin, elektronik, dll)','2026-10-30 12:48:38.181','2026-10-30 12:48:38.181'),(77,2,'1-2005','Akumulasi Penyusutan Peralatan','ASET','KREDIT',72,1,'Akumulasi pengurangan nilai peralatan','2026-10-30 12:48:38.185','2026-10-30 12:48:38.185'),(78,2,'1-2006','Kendaraan','ASET','DEBIT',72,1,'Nilai kendaraan operasional','2026-10-30 12:48:38.189','2026-10-30 12:48:38.189'),(79,2,'1-2007','Akumulasi Penyusutan Kendaraan','ASET','KREDIT',72,1,'Akumulasi pengurangan nilai kendaraan','2026-10-30 12:48:38.193','2026-10-30 12:48:38.193'),(80,2,'2-1000','Kewajiban Lancar','KEWAJIBAN','KREDIT',60,1,'Kewajiban yang jatuh tempo dalam satu tahun','2026-10-30 12:48:38.197','2026-10-30 12:48:38.197'),(81,2,'2-1001','Hutang Usaha','KEWAJIBAN','KREDIT',80,1,'Hutang kepada pemasok/vendor','2026-10-30 12:48:38.201','2026-10-30 12:48:38.201'),(82,2,'2-1002','Hutang Gaji','KEWAJIBAN','KREDIT',80,1,'Gaji karyawan yang belum dibayarkan','2026-10-30 12:48:38.205','2026-10-30 12:48:38.205'),(83,2,'2-1003','Hutang Pajak','KEWAJIBAN','KREDIT',80,1,'Kewajiban pajak yang belum disetor','2026-10-30 12:48:38.208','2026-10-30 12:48:38.208'),(84,2,'2-1004','Pendapatan Diterima di Muka','KEWAJIBAN','KREDIT',80,1,'Pembayaran dari pelanggan sebelum barang/jasa diserahkan','2026-10-30 12:48:38.212','2026-10-30 12:48:38.212'),(85,2,'2-1005','Biaya Akrual','KEWAJIBAN','KREDIT',80,1,'Biaya yang sudah terjadi tapi belum dibayar','2026-10-30 12:48:38.217','2026-10-30 12:48:38.217'),(86,2,'2-2000','Kewajiban Jangka Panjang','KEWAJIBAN','KREDIT',60,1,'Kewajiban yang jatuh tempo lebih dari satu tahun','2026-10-30 12:48:38.221','2026-10-30 12:48:38.221'),(87,2,'2-2001','Hutang Bank Jangka Panjang','KEWAJIBAN','KREDIT',86,1,'Pinjaman bank jangka panjang','2026-10-30 12:48:38.225','2026-10-30 12:48:38.225'),(88,2,'3-1001','Modal Awal','EKUITAS','KREDIT',61,1,'Modal yang disetor oleh pemilik usaha','2026-10-30 12:48:38.230','2026-10-30 12:48:38.230'),(89,2,'3-1002','Prive / Penarikan Pemilik','EKUITAS','DEBIT',61,1,'Penarikan uang/aset oleh pemilik untuk keperluan pribadi','2026-10-30 12:48:38.233','2026-10-30 12:48:38.233'),(90,2,'3-1003','Laba / Rugi Ditahan','EKUITAS','KREDIT',61,1,'Akumulasi laba/rugi tahun-tahun sebelumnya','2026-10-30 12:48:38.237','2026-10-30 12:48:38.237'),(91,2,'3-1004','Laba / Rugi Periode Berjalan','EKUITAS','KREDIT',61,1,'Laba/rugi periode akuntansi saat ini','2026-10-30 12:48:38.242','2026-10-30 12:48:38.242'),(92,2,'4-1001','Pendapatan Penjualan','PENDAPATAN','KREDIT',62,1,'Pendapatan dari penjualan barang/jasa','2026-10-30 12:48:38.246','2026-10-30 12:48:38.246'),(93,2,'4-1002','Pendapatan Jasa','PENDAPATAN','KREDIT',62,1,'Pendapatan dari penyediaan jasa','2026-10-30 12:48:38.250','2026-10-30 12:48:38.250'),(94,2,'4-1003','Pendapatan Lain-lain','PENDAPATAN','KREDIT',62,1,'Pendapatan di luar kegiatan usaha utama','2026-10-30 12:48:38.254','2026-10-30 12:48:38.254'),(95,2,'4-1004','Diskon Penjualan (Kontra)','PENDAPATAN','DEBIT',62,1,'Pengurangan pendapatan akibat diskon yang diberikan','2026-10-30 12:48:38.258','2026-10-30 12:48:38.258'),(96,2,'4-1005','Retur Penjualan (Kontra)','PENDAPATAN','DEBIT',62,1,'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan','2026-10-30 12:48:38.263','2026-10-30 12:48:38.263'),(97,2,'5-1000','Beban Pokok Penjualan (HPP)','BEBAN','DEBIT',63,1,'Biaya langsung terkait produksi atau pembelian barang yang dijual','2026-10-30 12:48:38.266','2026-10-30 12:48:38.266'),(98,2,'5-1001','Beban Penjualan','BEBAN','DEBIT',97,1,'HPP barang dagangan yang terjual','2026-10-30 12:48:38.270','2026-10-31 06:30:31.712'),(99,2,'5-1002','Pembelian Bahan Baku','BEBAN','DEBIT',97,1,'Pembelian bahan baku untuk produksi','2026-10-30 12:48:38.274','2026-10-30 12:48:38.274'),(100,2,'5-2000','Beban Operasional','BEBAN','DEBIT',63,1,'Biaya operasional rutin usaha','2026-10-30 12:48:38.278','2026-10-30 12:48:38.278'),(101,2,'5-2001','Beban Gaji & Upah','BEBAN','DEBIT',100,1,'Gaji dan upah karyawan','2026-10-30 12:48:38.282','2026-10-30 12:48:38.282'),(102,2,'5-2002','Beban Sewa','BEBAN','DEBIT',100,1,'Biaya sewa tempat usaha','2026-10-30 12:48:38.286','2026-10-30 12:48:38.286'),(103,2,'5-2003','Beban Listrik & Air','BEBAN','DEBIT',100,1,'Tagihan listrik dan air','2026-10-30 12:48:38.291','2026-10-30 12:48:38.291'),(104,2,'5-2004','Beban Telepon & Internet','BEBAN','DEBIT',100,1,'Tagihan telepon dan internet','2026-10-30 12:48:38.296','2026-10-30 12:48:38.296'),(105,2,'5-2005','Beban Transportasi','BEBAN','DEBIT',100,1,'Biaya transportasi operasional','2026-10-30 12:48:38.302','2026-10-30 12:48:38.302'),(106,2,'5-2006','Beban Perlengkapan','BEBAN','DEBIT',100,1,'Biaya perlengkapan operasional yang habis pakai','2026-10-30 12:48:38.313','2026-10-30 12:48:38.313'),(107,2,'5-2007','Beban Pemeliharaan','BEBAN','DEBIT',100,1,'Biaya perawatan dan perbaikan peralatan/gedung','2026-10-30 12:48:38.318','2026-10-30 12:48:38.318'),(108,2,'5-2008','Beban Iklan & Promosi','BEBAN','DEBIT',100,1,'Biaya pemasaran dan promosi','2026-10-30 12:48:38.327','2026-10-30 12:48:38.327'),(109,2,'5-3000','Beban Penyusutan','BEBAN','DEBIT',63,1,'Beban penyusutan aset tetap','2026-10-30 12:48:38.331','2026-10-30 12:48:38.331'),(110,2,'5-3001','Beban Penyusutan Bangunan','BEBAN','DEBIT',109,1,'Penyusutan nilai bangunan per periode','2026-10-30 12:48:38.339','2026-10-30 12:48:38.339'),(111,2,'5-3002','Beban Penyusutan Peralatan','BEBAN','DEBIT',109,1,'Penyusutan nilai peralatan per periode','2026-10-30 12:48:38.344','2026-10-30 12:48:38.344'),(112,2,'5-3003','Beban Penyusutan Kendaraan','BEBAN','DEBIT',109,1,'Penyusutan nilai kendaraan per periode','2026-10-30 12:48:38.352','2026-10-30 12:48:38.352'),(113,2,'5-4000','Beban Lain-lain','BEBAN','DEBIT',63,1,'Pengeluaran di luar operasional utama','2026-10-30 12:48:38.358','2026-10-30 12:48:38.358'),(114,2,'5-4001','Beban Bunga','BEBAN','DEBIT',113,1,'Biaya bunga pinjaman','2026-10-30 12:48:38.363','2026-10-30 12:48:38.363'),(115,2,'5-4002','Beban Pajak','BEBAN','DEBIT',113,1,'Beban pajak usaha','2026-10-30 12:48:38.369','2026-10-30 12:48:38.369'),(116,2,'5-4003','Beban Administrasi & Umum','BEBAN','DEBIT',113,1,'Biaya administrasi umum yang tidak terklasifikasi','2026-10-30 12:48:38.375','2026-10-30 12:48:38.375'),(117,3,'1-0000','ASET','ASET','DEBIT',NULL,1,'Akun induk: Seluruh kekayaan usaha','2026-10-30 14:03:41.629','2026-10-30 14:03:41.629'),(118,3,'2-0000','KEWAJIBAN','KEWAJIBAN','KREDIT',NULL,1,'Akun induk: Seluruh hutang/kewajiban usaha','2026-10-30 14:03:41.644','2026-10-30 14:03:41.644'),(119,3,'3-0000','EKUITAS','EKUITAS','KREDIT',NULL,1,'Akun induk: Modal pemilik','2026-10-30 14:03:41.654','2026-10-30 14:03:41.654'),(120,3,'4-0000','PENDAPATAN','PENDAPATAN','KREDIT',NULL,1,'Akun induk: Seluruh pendapatan usaha','2026-10-30 14:03:41.671','2026-10-30 14:03:41.671'),(121,3,'5-0000','BEBAN','BEBAN','DEBIT',NULL,1,'Akun induk: Seluruh beban/pengeluaran usaha','2026-10-30 14:03:41.682','2026-10-30 14:03:41.682'),(122,3,'1-1000','Aset Lancar','ASET','DEBIT',117,1,'Aset yang dapat dicairkan dalam satu tahun','2026-10-30 14:03:41.690','2026-10-30 14:03:41.690'),(123,3,'1-1001','Kas','ASET','DEBIT',122,1,'Uang tunai di tangan kasir','2026-10-30 14:03:41.698','2026-10-30 14:03:41.698'),(124,3,'1-1002','Kas Kecil (Petty Cash)','ASET','DEBIT',122,1,'Dana kas kecil untuk pengeluaran rutin kecil','2026-10-30 14:03:41.703','2026-10-30 14:03:41.703'),(125,3,'1-1003','Bank','ASET','DEBIT',122,1,'Saldo rekening bank usaha','2026-10-30 14:03:41.707','2026-10-30 14:03:41.707'),(126,3,'1-1004','Piutang Usaha','ASET','DEBIT',122,1,'Tagihan kepada pelanggan yang belum dibayar','2026-10-30 14:03:41.712','2026-10-30 14:03:41.712'),(127,3,'1-1005','Persediaan Bahan Baku / Inventaris','ASET','DEBIT',122,1,'Stok barang dagangan','2026-10-30 14:03:41.717','2026-10-31 06:30:31.744'),(128,3,'1-1006','Perlengkapan / Supplies','ASET','DEBIT',122,1,'Perlengkapan operasional yang belum habis dipakai','2026-10-30 14:03:41.722','2026-10-30 14:03:41.722'),(129,3,'1-1007','Biaya Dibayar di Muka','ASET','DEBIT',122,1,'Pembayaran yang dilakukan sebelum manfaatnya diterima','2026-10-30 14:03:41.726','2026-10-30 14:03:41.726'),(130,3,'1-2000','Aset Tidak Lancar','ASET','DEBIT',117,1,'Aset jangka panjang','2026-10-30 14:03:41.731','2026-10-30 14:03:41.731'),(131,3,'1-2001','Tanah','ASET','DEBIT',130,1,'Nilai tanah yang dimiliki','2026-10-30 14:03:41.737','2026-10-30 14:03:41.737'),(132,3,'1-2002','Bangunan','ASET','DEBIT',130,1,'Nilai bangunan/gedung','2026-10-30 14:03:41.747','2026-10-30 14:03:41.747'),(133,3,'1-2003','Akumulasi Penyusutan Bangunan','ASET','KREDIT',130,1,'Akumulasi pengurangan nilai bangunan','2026-10-30 14:03:41.752','2026-10-30 14:03:41.752'),(134,3,'1-2004','Peralatan','ASET','DEBIT',130,1,'Peralatan usaha (mesin, elektronik, dll)','2026-10-30 14:03:41.756','2026-10-30 14:03:41.756'),(135,3,'1-2005','Akumulasi Penyusutan Peralatan','ASET','KREDIT',130,1,'Akumulasi pengurangan nilai peralatan','2026-10-30 14:03:41.759','2026-10-30 14:03:41.759'),(136,3,'1-2006','Kendaraan','ASET','DEBIT',130,1,'Nilai kendaraan operasional','2026-10-30 14:03:41.763','2026-10-30 14:03:41.763'),(137,3,'1-2007','Akumulasi Penyusutan Kendaraan','ASET','KREDIT',130,1,'Akumulasi pengurangan nilai kendaraan','2026-10-30 14:03:41.766','2026-10-30 14:03:41.766'),(138,3,'2-1000','Kewajiban Lancar','KEWAJIBAN','KREDIT',118,1,'Kewajiban yang jatuh tempo dalam satu tahun','2026-10-30 14:03:41.770','2026-10-30 14:03:41.770'),(139,3,'2-1001','Hutang Usaha','KEWAJIBAN','KREDIT',138,1,'Hutang kepada pemasok/vendor','2026-10-30 14:03:41.774','2026-10-30 14:03:41.774'),(140,3,'2-1002','Hutang Gaji','KEWAJIBAN','KREDIT',138,1,'Gaji karyawan yang belum dibayarkan','2026-10-30 14:03:41.780','2026-10-30 14:03:41.780'),(141,3,'2-1003','Hutang Pajak','KEWAJIBAN','KREDIT',138,1,'Kewajiban pajak yang belum disetor','2026-10-30 14:03:41.784','2026-10-30 14:03:41.784'),(142,3,'2-1004','Pendapatan Diterima di Muka','KEWAJIBAN','KREDIT',138,1,'Pembayaran dari pelanggan sebelum barang/jasa diserahkan','2026-10-30 14:03:41.788','2026-10-30 14:03:41.788'),(143,3,'2-1005','Biaya Akrual','KEWAJIBAN','KREDIT',138,1,'Biaya yang sudah terjadi tapi belum dibayar','2026-10-30 14:03:41.792','2026-10-30 14:03:41.792'),(144,3,'2-2000','Kewajiban Jangka Panjang','KEWAJIBAN','KREDIT',118,1,'Kewajiban yang jatuh tempo lebih dari satu tahun','2026-10-30 14:03:41.797','2026-10-30 14:03:41.797'),(145,3,'2-2001','Hutang Bank Jangka Panjang','KEWAJIBAN','KREDIT',144,1,'Pinjaman bank jangka panjang','2026-10-30 14:03:41.801','2026-10-30 14:03:41.801'),(146,3,'3-1001','Modal Awal','EKUITAS','KREDIT',119,1,'Modal yang disetor oleh pemilik usaha','2026-10-30 14:03:41.805','2026-10-30 14:03:41.805'),(147,3,'3-1002','Prive / Penarikan Pemilik','EKUITAS','DEBIT',119,1,'Penarikan uang/aset oleh pemilik untuk keperluan pribadi','2026-10-30 14:03:41.809','2026-10-30 14:03:41.809'),(148,3,'3-1003','Laba / Rugi Ditahan','EKUITAS','KREDIT',119,1,'Akumulasi laba/rugi tahun-tahun sebelumnya','2026-10-30 14:03:41.813','2026-10-30 14:03:41.813'),(149,3,'3-1004','Laba / Rugi Periode Berjalan','EKUITAS','KREDIT',119,1,'Laba/rugi periode akuntansi saat ini','2026-10-30 14:03:41.816','2026-10-30 14:03:41.816'),(150,3,'4-1001','Pendapatan Penjualan','PENDAPATAN','KREDIT',120,1,'Pendapatan dari penjualan barang/jasa','2026-10-30 14:03:41.820','2026-10-30 14:03:41.820'),(151,3,'4-1002','Pendapatan Jasa','PENDAPATAN','KREDIT',120,1,'Pendapatan dari penyediaan jasa','2026-10-30 14:03:41.825','2026-10-30 14:03:41.825'),(152,3,'4-1003','Pendapatan Lain-lain','PENDAPATAN','KREDIT',120,1,'Pendapatan di luar kegiatan usaha utama','2026-10-30 14:03:41.829','2026-10-30 14:03:41.829'),(153,3,'4-1004','Diskon Penjualan (Kontra)','PENDAPATAN','DEBIT',120,1,'Pengurangan pendapatan akibat diskon yang diberikan','2026-10-30 14:03:41.832','2026-10-30 14:03:41.832'),(154,3,'4-1005','Retur Penjualan (Kontra)','PENDAPATAN','DEBIT',120,1,'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan','2026-10-30 14:03:41.836','2026-10-30 14:03:41.836'),(155,3,'5-1000','Beban Pokok Penjualan (HPP)','BEBAN','DEBIT',121,1,'Biaya langsung terkait produksi atau pembelian barang yang dijual','2026-10-30 14:03:41.840','2026-10-30 14:03:41.840'),(156,3,'5-1001','Beban Penjualan','BEBAN','DEBIT',155,1,'HPP barang dagangan yang terjual','2026-10-30 14:03:41.843','2026-10-31 06:30:31.737'),(157,3,'5-1002','Pembelian Bahan Baku','BEBAN','DEBIT',155,1,'Pembelian bahan baku untuk produksi','2026-10-30 14:03:41.847','2026-10-30 14:03:41.847'),(158,3,'5-2000','Beban Operasional','BEBAN','DEBIT',121,1,'Biaya operasional rutin usaha','2026-10-30 14:03:41.850','2026-10-30 14:03:41.850'),(159,3,'5-2001','Beban Gaji & Upah','BEBAN','DEBIT',158,1,'Gaji dan upah karyawan','2026-10-30 14:03:41.853','2026-10-30 14:03:41.853'),(160,3,'5-2002','Beban Sewa','BEBAN','DEBIT',158,1,'Biaya sewa tempat usaha','2026-10-30 14:03:41.857','2026-10-30 14:03:41.857'),(161,3,'5-2003','Beban Listrik & Air','BEBAN','DEBIT',158,1,'Tagihan listrik dan air','2026-10-30 14:03:41.860','2026-10-30 14:03:41.860'),(162,3,'5-2004','Beban Telepon & Internet','BEBAN','DEBIT',158,1,'Tagihan telepon dan internet','2026-10-30 14:03:41.864','2026-10-30 14:03:41.864'),(163,3,'5-2005','Beban Transportasi','BEBAN','DEBIT',158,1,'Biaya transportasi operasional','2026-10-30 14:03:41.868','2026-10-30 14:03:41.868'),(164,3,'5-2006','Beban Perlengkapan','BEBAN','DEBIT',158,1,'Biaya perlengkapan operasional yang habis pakai','2026-10-30 14:03:41.872','2026-10-30 14:03:41.872'),(165,3,'5-2007','Beban Pemeliharaan','BEBAN','DEBIT',158,1,'Biaya perawatan dan perbaikan peralatan/gedung','2026-10-30 14:03:41.875','2026-10-30 14:03:41.875'),(166,3,'5-2008','Beban Iklan & Promosi','BEBAN','DEBIT',158,1,'Biaya pemasaran dan promosi','2026-10-30 14:03:41.879','2026-10-30 14:03:41.879'),(167,3,'5-3000','Beban Penyusutan','BEBAN','DEBIT',121,1,'Beban penyusutan aset tetap','2026-10-30 14:03:41.882','2026-10-30 14:03:41.882'),(168,3,'5-3001','Beban Penyusutan Bangunan','BEBAN','DEBIT',167,1,'Penyusutan nilai bangunan per periode','2026-10-30 14:03:41.887','2026-10-30 14:03:41.887'),(169,3,'5-3002','Beban Penyusutan Peralatan','BEBAN','DEBIT',167,1,'Penyusutan nilai peralatan per periode','2026-10-30 14:03:41.890','2026-10-30 14:03:41.890'),(170,3,'5-3003','Beban Penyusutan Kendaraan','BEBAN','DEBIT',167,1,'Penyusutan nilai kendaraan per periode','2026-10-30 14:03:41.893','2026-10-30 14:03:41.893'),(171,3,'5-4000','Beban Lain-lain','BEBAN','DEBIT',121,1,'Pengeluaran di luar operasional utama','2026-10-30 14:03:41.897','2026-10-30 14:03:41.897'),(172,3,'5-4001','Beban Bunga','BEBAN','DEBIT',171,1,'Biaya bunga pinjaman','2026-10-30 14:03:41.900','2026-10-30 14:03:41.900'),(173,3,'5-4002','Beban Pajak','BEBAN','DEBIT',171,1,'Beban pajak usaha','2026-10-30 14:03:41.903','2026-10-30 14:03:41.903'),(174,3,'5-4003','Beban Administrasi & Umum','BEBAN','DEBIT',171,1,'Biaya administrasi umum yang tidak terklasifikasi','2026-10-30 14:03:41.907','2026-10-30 14:03:41.907'),(175,4,'1-0000','ASET','ASET','DEBIT',NULL,1,'Akun induk: Seluruh kekayaan usaha','2026-10-30 14:03:41.943','2026-10-30 14:03:41.943'),(176,4,'2-0000','KEWAJIBAN','KEWAJIBAN','KREDIT',NULL,1,'Akun induk: Seluruh hutang/kewajiban usaha','2026-10-30 14:03:41.948','2026-10-30 14:03:41.948'),(177,4,'3-0000','EKUITAS','EKUITAS','KREDIT',NULL,1,'Akun induk: Modal pemilik','2026-10-30 14:03:41.951','2026-10-30 14:03:41.951'),(178,4,'4-0000','PENDAPATAN','PENDAPATAN','KREDIT',NULL,1,'Akun induk: Seluruh pendapatan usaha','2026-10-30 14:03:41.954','2026-10-30 14:03:41.954'),(179,4,'5-0000','BEBAN','BEBAN','DEBIT',NULL,1,'Akun induk: Seluruh beban/pengeluaran usaha','2026-10-30 14:03:41.958','2026-10-30 14:03:41.958'),(180,4,'1-1000','Aset Lancar','ASET','DEBIT',175,1,'Aset yang dapat dicairkan dalam satu tahun','2026-10-30 14:03:41.962','2026-10-30 14:03:41.962'),(181,4,'1-1001','Kas','ASET','DEBIT',180,1,'Uang tunai di tangan kasir','2026-10-30 14:03:41.965','2026-10-30 14:03:41.965'),(182,4,'1-1002','Kas Kecil (Petty Cash)','ASET','DEBIT',180,1,'Dana kas kecil untuk pengeluaran rutin kecil','2026-10-30 14:03:41.968','2026-10-30 14:03:41.968'),(183,4,'1-1003','Bank','ASET','DEBIT',180,1,'Saldo rekening bank usaha','2026-10-30 14:03:41.972','2026-10-30 14:03:41.972'),(184,4,'1-1004','Piutang Usaha','ASET','DEBIT',180,1,'Tagihan kepada pelanggan yang belum dibayar','2026-10-30 14:03:41.976','2026-10-30 14:03:41.976'),(185,4,'1-1005','Persediaan Bahan Baku / Inventaris','ASET','DEBIT',180,1,'Stok barang dagangan','2026-10-30 14:03:41.982','2026-10-31 06:30:31.766'),(186,4,'1-1006','Perlengkapan / Supplies','ASET','DEBIT',180,1,'Perlengkapan operasional yang belum habis dipakai','2026-10-30 14:03:41.988','2026-10-30 14:03:41.988'),(187,4,'1-1007','Biaya Dibayar di Muka','ASET','DEBIT',180,1,'Pembayaran yang dilakukan sebelum manfaatnya diterima','2026-10-30 14:03:41.992','2026-10-30 14:03:41.992'),(188,4,'1-2000','Aset Tidak Lancar','ASET','DEBIT',175,1,'Aset jangka panjang','2026-10-30 14:03:41.996','2026-10-30 14:03:41.996'),(189,4,'1-2001','Tanah','ASET','DEBIT',188,1,'Nilai tanah yang dimiliki','2026-10-30 14:03:42.000','2026-10-30 14:03:42.000'),(190,4,'1-2002','Bangunan','ASET','DEBIT',188,1,'Nilai bangunan/gedung','2026-10-30 14:03:42.005','2026-10-30 14:03:42.005'),(191,4,'1-2003','Akumulasi Penyusutan Bangunan','ASET','KREDIT',188,1,'Akumulasi pengurangan nilai bangunan','2026-10-30 14:03:42.009','2026-10-30 14:03:42.009'),(192,4,'1-2004','Peralatan','ASET','DEBIT',188,1,'Peralatan usaha (mesin, elektronik, dll)','2026-10-30 14:03:42.012','2026-10-30 14:03:42.012'),(193,4,'1-2005','Akumulasi Penyusutan Peralatan','ASET','KREDIT',188,1,'Akumulasi pengurangan nilai peralatan','2026-10-30 14:03:42.016','2026-10-30 14:03:42.016'),(194,4,'1-2006','Kendaraan','ASET','DEBIT',188,1,'Nilai kendaraan operasional','2026-10-30 14:03:42.018','2026-10-30 14:03:42.018'),(195,4,'1-2007','Akumulasi Penyusutan Kendaraan','ASET','KREDIT',188,1,'Akumulasi pengurangan nilai kendaraan','2026-10-30 14:03:42.022','2026-10-30 14:03:42.022'),(196,4,'2-1000','Kewajiban Lancar','KEWAJIBAN','KREDIT',176,1,'Kewajiban yang jatuh tempo dalam satu tahun','2026-10-30 14:03:42.024','2026-10-30 14:03:42.024'),(197,4,'2-1001','Hutang Usaha','KEWAJIBAN','KREDIT',196,1,'Hutang kepada pemasok/vendor','2026-10-30 14:03:42.028','2026-10-30 14:03:42.028'),(198,4,'2-1002','Hutang Gaji','KEWAJIBAN','KREDIT',196,1,'Gaji karyawan yang belum dibayarkan','2026-10-30 14:03:42.031','2026-10-30 14:03:42.031'),(199,4,'2-1003','Hutang Pajak','KEWAJIBAN','KREDIT',196,1,'Kewajiban pajak yang belum disetor','2026-10-30 14:03:42.034','2026-10-30 14:03:42.034'),(200,4,'2-1004','Pendapatan Diterima di Muka','KEWAJIBAN','KREDIT',196,1,'Pembayaran dari pelanggan sebelum barang/jasa diserahkan','2026-10-30 14:03:42.038','2026-10-30 14:03:42.038'),(201,4,'2-1005','Biaya Akrual','KEWAJIBAN','KREDIT',196,1,'Biaya yang sudah terjadi tapi belum dibayar','2026-10-30 14:03:42.040','2026-10-30 14:03:42.040'),(202,4,'2-2000','Kewajiban Jangka Panjang','KEWAJIBAN','KREDIT',176,1,'Kewajiban yang jatuh tempo lebih dari satu tahun','2026-10-30 14:03:42.043','2026-10-30 14:03:42.043'),(203,4,'2-2001','Hutang Bank Jangka Panjang','KEWAJIBAN','KREDIT',202,1,'Pinjaman bank jangka panjang','2026-10-30 14:03:42.047','2026-10-30 14:03:42.047'),(204,4,'3-1001','Modal Awal','EKUITAS','KREDIT',177,1,'Modal yang disetor oleh pemilik usaha','2026-10-30 14:03:42.049','2026-10-30 14:03:42.049'),(205,4,'3-1002','Prive / Penarikan Pemilik','EKUITAS','DEBIT',177,1,'Penarikan uang/aset oleh pemilik untuk keperluan pribadi','2026-10-30 14:03:42.053','2026-10-30 14:03:42.053'),(206,4,'3-1003','Laba / Rugi Ditahan','EKUITAS','KREDIT',177,1,'Akumulasi laba/rugi tahun-tahun sebelumnya','2026-10-30 14:03:42.056','2026-10-30 14:03:42.056'),(207,4,'3-1004','Laba / Rugi Periode Berjalan','EKUITAS','KREDIT',177,1,'Laba/rugi periode akuntansi saat ini','2026-10-30 14:03:42.059','2026-10-30 14:03:42.059'),(208,4,'4-1001','Pendapatan Penjualan','PENDAPATAN','KREDIT',178,1,'Pendapatan dari penjualan barang/jasa','2026-10-30 14:03:42.063','2026-10-30 14:03:42.063'),(209,4,'4-1002','Pendapatan Jasa','PENDAPATAN','KREDIT',178,1,'Pendapatan dari penyediaan jasa','2026-10-30 14:03:42.066','2026-10-30 14:03:42.066'),(210,4,'4-1003','Pendapatan Lain-lain','PENDAPATAN','KREDIT',178,1,'Pendapatan di luar kegiatan usaha utama','2026-10-30 14:03:42.068','2026-10-30 14:03:42.068'),(211,4,'4-1004','Diskon Penjualan (Kontra)','PENDAPATAN','DEBIT',178,1,'Pengurangan pendapatan akibat diskon yang diberikan','2026-10-30 14:03:42.072','2026-10-30 14:03:42.072'),(212,4,'4-1005','Retur Penjualan (Kontra)','PENDAPATAN','DEBIT',178,1,'Pengurangan pendapatan akibat barang yang dikembalikan pelanggan','2026-10-30 14:03:42.074','2026-10-30 14:03:42.074'),(213,4,'5-1000','Beban Pokok Penjualan (HPP)','BEBAN','DEBIT',179,1,'Biaya langsung terkait produksi atau pembelian barang yang dijual','2026-10-30 14:03:42.077','2026-10-30 14:03:42.077'),(214,4,'5-1001','Beban Penjualan','BEBAN','DEBIT',213,1,'HPP barang dagangan yang terjual','2026-10-30 14:03:42.080','2026-10-31 06:30:31.759'),(215,4,'5-1002','Pembelian Bahan Baku','BEBAN','DEBIT',213,1,'Pembelian bahan baku untuk produksi','2026-10-30 14:03:42.083','2026-10-30 14:03:42.083'),(216,4,'5-2000','Beban Operasional','BEBAN','DEBIT',179,1,'Biaya operasional rutin usaha','2026-10-30 14:03:42.085','2026-10-30 14:03:42.085'),(217,4,'5-2001','Beban Gaji & Upah','BEBAN','DEBIT',216,1,'Gaji dan upah karyawan','2026-10-30 14:03:42.088','2026-10-30 14:03:42.088'),(218,4,'5-2002','Beban Sewa','BEBAN','DEBIT',216,1,'Biaya sewa tempat usaha','2026-10-30 14:03:42.091','2026-10-30 14:03:42.091'),(219,4,'5-2003','Beban Listrik & Air','BEBAN','DEBIT',216,1,'Tagihan listrik dan air','2026-10-30 14:03:42.093','2026-10-30 14:03:42.093'),(220,4,'5-2004','Beban Telepon & Internet','BEBAN','DEBIT',216,1,'Tagihan telepon dan internet','2026-10-30 14:03:42.096','2026-10-30 14:03:42.096'),(221,4,'5-2005','Beban Transportasi','BEBAN','DEBIT',216,1,'Biaya transportasi operasional','2026-10-30 14:03:42.099','2026-10-30 14:03:42.099'),(222,4,'5-2006','Beban Perlengkapan','BEBAN','DEBIT',216,1,'Biaya perlengkapan operasional yang habis pakai','2026-10-30 14:03:42.102','2026-10-30 14:03:42.102'),(223,4,'5-2007','Beban Pemeliharaan','BEBAN','DEBIT',216,1,'Biaya perawatan dan perbaikan peralatan/gedung','2026-10-30 14:03:42.105','2026-10-30 14:03:42.105'),(224,4,'5-2008','Beban Iklan & Promosi','BEBAN','DEBIT',216,1,'Biaya pemasaran dan promosi','2026-10-30 14:03:42.107','2026-10-30 14:03:42.107'),(225,4,'5-3000','Beban Penyusutan','BEBAN','DEBIT',179,1,'Beban penyusutan aset tetap','2026-10-30 14:03:42.110','2026-10-30 14:03:42.110'),(226,4,'5-3001','Beban Penyusutan Bangunan','BEBAN','DEBIT',225,1,'Penyusutan nilai bangunan per periode','2026-10-30 14:03:42.114','2026-10-30 14:03:42.114'),(227,4,'5-3002','Beban Penyusutan Peralatan','BEBAN','DEBIT',225,1,'Penyusutan nilai peralatan per periode','2026-10-30 14:03:42.117','2026-10-30 14:03:42.117'),(228,4,'5-3003','Beban Penyusutan Kendaraan','BEBAN','DEBIT',225,1,'Penyusutan nilai kendaraan per periode','2026-10-30 14:03:42.119','2026-10-30 14:03:42.119'),(229,4,'5-4000','Beban Lain-lain','BEBAN','DEBIT',179,1,'Pengeluaran di luar operasional utama','2026-10-30 14:03:42.122','2026-10-30 14:03:42.122'),(230,4,'5-4001','Beban Bunga','BEBAN','DEBIT',229,1,'Biaya bunga pinjaman','2026-10-30 14:03:42.125','2026-10-30 14:03:42.125'),(231,4,'5-4002','Beban Pajak','BEBAN','DEBIT',229,1,'Beban pajak usaha','2026-10-30 14:03:42.128','2026-10-30 14:03:42.128'),(232,4,'5-4003','Beban Administrasi & Umum','BEBAN','DEBIT',229,1,'Biaya administrasi umum yang tidak terklasifikasi','2026-10-30 14:03:42.131','2026-10-30 14:03:42.131'),(233,1,'1-1008','Persediaan Barang Dagangan','ASET','DEBIT',6,1,'Persediaan barang dagangan siap jual kasir POS','2026-10-31 06:30:31.676','2026-10-31 06:30:31.676'),(234,2,'1-1008','Persediaan Barang Dagangan','ASET','DEBIT',64,1,'Persediaan barang dagangan siap jual kasir POS','2026-10-31 06:30:31.729','2026-10-31 06:30:31.729'),(235,3,'1-1008','Persediaan Barang Dagangan','ASET','DEBIT',122,1,'Persediaan barang dagangan siap jual kasir POS','2026-10-31 06:30:31.752','2026-10-31 06:30:31.752'),(236,4,'1-1008','Persediaan Barang Dagangan','ASET','DEBIT',180,1,'Persediaan barang dagangan siap jual kasir POS','2026-10-31 06:30:31.791','2026-10-31 06:30:31.791');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendances`
--

DROP TABLE IF EXISTS `attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attendances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `clock_in_time` datetime(3) DEFAULT NULL,
  `clock_in_photo` longtext DEFAULT NULL,
  `clock_in_notes` varchar(255) DEFAULT NULL,
  `clock_out_time` datetime(3) DEFAULT NULL,
  `clock_out_photo` longtext DEFAULT NULL,
  `clock_out_notes` varchar(255) DEFAULT NULL,
  `status` enum('HADIR','TERLAMBAT','PULANG_AWAL','IZIN','SAKIT','CUTI','LIBUR','ALFA') NOT NULL DEFAULT 'HADIR',
  `late_minutes` int(11) NOT NULL DEFAULT 0,
  `early_minutes` int(11) NOT NULL DEFAULT 0,
  `is_late` tinyint(1) NOT NULL DEFAULT 0,
  `created_by_id` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendances_business_id_employee_id_date_key` (`business_id`,`employee_id`,`date`),
  KEY `attendances_employee_id_fkey` (`employee_id`),
  KEY `attendances_shift_id_fkey` (`shift_id`),
  KEY `attendances_created_by_id_fkey` (`created_by_id`),
  CONSTRAINT `attendances_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendances_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendances`
--

LOCK TABLES `attendances` WRITE;
/*!40000 ALTER TABLE `attendances` DISABLE KEYS */;
INSERT INTO `attendances` VALUES (2,1,7,1,'2026-11-01','2026-11-01 01:10:00.000','data:image/jpeg;base64,mockOnTimePhotoData','Masuk tepat waktu','2026-11-01 09:05:00.000','data:image/jpeg;base64,mockClockOutPhoto','Pulang normal','HADIR',0,0,0,NULL,'2026-11-07 06:43:49.166','2026-11-07 06:43:49.177',NULL),(3,1,7,1,'2026-11-02','2026-11-02 01:35:00.000','data:image/jpeg;base64,mockLatePhotoData','Macet di jalan',NULL,NULL,NULL,'TERLAMBAT',35,0,1,NULL,'2026-11-07 06:43:49.189','2026-11-07 06:43:49.189',NULL);
/*!40000 ALTER TABLE `attendances` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `businesses`
--

LOCK TABLES `businesses` WRITE;
/*!40000 ALTER TABLE `businesses` DISABLE KEYS */;
INSERT INTO `businesses` VALUES (1,'Usaha Pertama','USAHA01','Jl. Contoh No. 1, Jakarta','021-12345678','Unit usaha pertama Robin Group',1,'2026-10-30 12:39:26.163','2026-10-30 12:39:26.163',NULL),(2,'Robin Cafe & Resto','CAFE01','Jl. Kuliner No. 8','08123456789','Unit usaha F&B Robin Group',1,'2026-10-30 12:48:37.599','2026-10-30 12:48:37.599',NULL),(3,'Robin Resto','RESTO01',NULL,NULL,'[F&B / Kafe & Resto] Restoran aneka masakan nusantara',1,'2026-10-30 14:03:41.603','2026-10-30 14:03:41.603',NULL),(4,'Robin Billiard','BILLIARD01',NULL,NULL,'[Billiard & Rekreasi] Arena biliar 9-ball & 10-ball',1,'2026-10-30 14:03:41.939','2026-10-30 14:03:41.939',NULL);
/*!40000 ALTER TABLE `businesses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_deductions`
--

DROP TABLE IF EXISTS `employee_deductions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employee_deductions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `salary_payment_id` int(11) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `type` varchar(30) NOT NULL DEFAULT 'KASBON',
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `notes` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `created_by_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `remaining_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `employee_deductions_business_id_fkey` (`business_id`),
  KEY `employee_deductions_employee_id_fkey` (`employee_id`),
  KEY `employee_deductions_salary_payment_id_fkey` (`salary_payment_id`),
  KEY `employee_deductions_created_by_id_fkey` (`created_by_id`),
  CONSTRAINT `employee_deductions_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `employee_deductions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `employee_deductions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `employee_deductions_salary_payment_id_fkey` FOREIGN KEY (`salary_payment_id`) REFERENCES `salary_payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_deductions`
--

LOCK TABLES `employee_deductions` WRITE;
/*!40000 ALTER TABLE `employee_deductions` DISABLE KEYS */;
INSERT INTO `employee_deductions` VALUES (1,1,4,3,150000.00,'KASBON','2026-11-06 20:03:18.929','Kasbon Uji 1 (Makan)','SETTLED',1,'2026-11-06 20:03:18.938','2026-11-06 20:04:30.998',NULL,0.00,0.00),(2,1,4,3,100000.00,'KASBON','2026-11-06 20:03:18.945','Kasbon Uji 2 (Transport)','SETTLED',1,'2026-11-06 20:03:18.949','2026-11-06 20:04:30.998',NULL,0.00,0.00),(3,1,4,3,150000.00,'KASBON','2026-11-06 20:03:45.646','Kasbon Uji 1 (Makan)','SETTLED',1,'2026-11-06 20:03:45.654','2026-11-06 20:04:30.998',NULL,0.00,0.00),(4,1,4,3,100000.00,'KASBON','2026-11-06 20:03:45.658','Kasbon Uji 2 (Transport)','SETTLED',1,'2026-11-06 20:03:45.663','2026-11-06 20:04:30.998',NULL,0.00,0.00),(5,1,4,3,150000.00,'KASBON','2026-11-06 20:04:30.898','Kasbon Uji 1 (Makan)','SETTLED',1,'2026-11-06 20:04:30.906','2026-11-06 20:04:30.998',NULL,0.00,0.00),(6,1,4,3,100000.00,'KASBON','2026-11-06 20:04:30.911','Kasbon Uji 2 (Transport)','SETTLED',1,'2026-11-06 20:04:30.915','2026-11-06 20:04:30.998',NULL,0.00,0.00),(7,1,4,4,150000.00,'KASBON','2026-11-06 20:05:14.654','Kasbon Uji 1 (Makan)','SETTLED',1,'2026-11-06 20:05:14.662','2026-11-06 20:05:14.742',NULL,0.00,0.00),(8,1,4,4,100000.00,'KASBON','2026-11-06 20:05:14.666','Kasbon Uji 2 (Transport)','SETTLED',1,'2026-11-06 20:05:14.671','2026-11-06 20:05:14.742',NULL,0.00,0.00),(9,1,4,NULL,150000.00,'KASBON','2026-11-06 20:05:36.818','Kasbon Uji 1 (Makan)','PENDING',1,'2026-11-06 20:05:36.826','2026-11-06 20:05:56.717',NULL,0.00,0.00),(10,1,4,NULL,100000.00,'KASBON','2026-11-06 20:05:36.831','Kasbon Uji 2 (Transport)','PENDING',1,'2026-11-06 20:05:36.834','2026-11-06 20:05:56.717',NULL,0.00,0.00),(23,4,2,18,200000.00,'KASBON','2026-11-07 04:44:17.297',NULL,'SETTLED',1,'2026-11-07 04:44:17.329','2026-11-07 11:51:05.922',NULL,200000.00,0.00);
/*!40000 ALTER TABLE `employee_deductions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `position` varchar(100) NOT NULL,
  `phone` varchar(25) DEFAULT NULL,
  `salary_type` varchar(20) NOT NULL DEFAULT 'BULANAN',
  `base_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `bank_name` varchar(50) DEFAULT NULL,
  `bank_account` varchar(50) DEFAULT NULL,
  `join_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `monthly_day_off_quota` int(11) NOT NULL DEFAULT 4,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_business_id_code_key` (`business_id`,`code`),
  KEY `employees_user_id_fkey` (`user_id`),
  CONSTRAINT `employees_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (2,4,2,'STF-806','Budi Santoso','Kasir','081234567890','BULANAN',2500000.00,0.00,'BCA','123456789','2026-11-07 08:32:08.362',1,NULL,'2026-11-06 19:43:42.395','2026-11-07 08:32:08.384',NULL,4),(3,4,4,'STF-580','Ardiansyah Saputra','Admin','0819874563210','BULANAN',2900000.00,0.00,'BCA','9874563210','2026-11-07 08:32:01.958',1,NULL,'2026-11-06 19:48:07.541','2026-11-07 08:32:01.990',NULL,4),(4,1,NULL,'TEST-EMP-99','Karyawan Uji Kasbon','Staff Uji',NULL,'BULANAN',3000000.00,0.00,NULL,NULL,'2026-11-06 20:02:01.512',1,NULL,'2026-11-06 20:02:01.512','2026-11-06 20:02:01.512',NULL,4),(6,4,3,'STF-890','Hilmi A','Admin','0123456789','BULANAN',2500000.00,0.00,'BRI','1234567890','2026-11-07 08:32:14.219',1,NULL,'2026-11-07 04:43:03.390','2026-11-07 08:32:14.250',NULL,4),(7,1,NULL,'EMP-ATT-TEST','Staf Uji Absensi','Barista',NULL,'BULANAN',2500000.00,300000.00,NULL,NULL,'2026-11-07 06:43:26.756',1,NULL,'2026-11-07 06:43:26.756','2026-11-07 06:43:26.756',NULL,4),(8,1,NULL,'TEST-SALARY-01','Budi Test Slip','Staff Operasional',NULL,'BULANAN',3000000.00,250000.00,NULL,NULL,'2026-11-07 08:05:16.868',1,NULL,'2026-11-07 08:05:16.868','2026-11-07 08:05:16.868',NULL,4),(9,4,NULL,'STF-235','Wisnu','Kasir','1236547890','BULANAN',2500000.00,0.00,'Bri','3214569870','2026-11-07 12:14:23.270',1,NULL,'2026-11-07 12:14:23.304','2026-11-07 12:14:23.304',NULL,4);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` enum('BAHAN_BAKU','PERLENGKAPAN','PERALATAN_ASET','BARANG_DAGANGAN','LAINNYA') NOT NULL DEFAULT 'BAHAN_BAKU',
  `unit` varchar(30) NOT NULL DEFAULT 'PCS',
  `quantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `minimum_stock` decimal(15,2) NOT NULL DEFAULT 0.00,
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `storage_location` varchar(150) DEFAULT NULL,
  `condition` enum('BAIK','RUSAK_RINGAN','RUSAK_BERAT') NOT NULL DEFAULT 'BAIK',
  `item_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_items_business_id_code_key` (`business_id`,`code`),
  KEY `inventory_items_account_id_fkey` (`account_id`),
  CONSTRAINT `inventory_items_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_items_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
INSERT INTO `inventory_items` VALUES (1,4,'INV-BB-001','Biji Kopi Arabika House Blend 1kg','BAHAN_BAKU','KG',20.00,5.00,125000.00,'Gudang Dapur Rak B','BAIK','2026-10-30 00:00:00.000','Biji kopi sangrai medium roast kualitas premium','2026-10-30 14:40:14.473','2026-10-31 05:45:17.841','2026-10-31 05:45:17.839',185),(2,4,'INV-SIRUP-246','Sirup Hazelnut Premium 750ml','BAHAN_BAKU','BOTOL',12.00,2.00,85000.00,'Rak Minuman Bar','BAIK','2026-10-30 15:18:03.133','Sirup impor perasa kopi','2026-10-30 15:18:03.136','2026-10-31 05:45:19.696','2026-10-31 05:45:19.694',185),(3,1,'INV-DMG-01','Stik Billiard Predator Ujung Retak','PERALATAN_ASET','PCS',2.00,0.00,1200000.00,'Rak Meja 4','RUSAK_RINGAN','2026-10-30 15:47:14.249','Ujung ferrul retak butuh servis','2026-10-30 15:47:14.251','2026-10-30 15:47:14.251',NULL,18),(4,4,'INV-7549','sirup','BAHAN_BAKU','BOTOL',20.00,5.00,55000.00,NULL,'BAIK','2026-10-31 00:00:00.000',NULL,'2026-10-31 06:11:06.220','2026-11-06 18:29:18.670','2026-11-06 18:29:18.669',185),(5,4,'INV-3775','beras','BAHAN_BAKU','KG',16.00,5.00,15000.00,NULL,'BAIK','2026-11-05 00:00:00.000',NULL,'2026-11-05 07:23:06.014','2026-11-06 18:29:16.353','2026-11-06 18:29:16.352',185),(6,4,'INV-6177','sarung tangan','PERLENGKAPAN','PCS',50.00,5.00,497.00,NULL,'BAIK','2026-11-05 00:00:00.000',NULL,'2026-11-05 08:17:50.796','2026-11-06 18:29:21.008','2026-11-06 18:29:21.007',186),(7,4,'INV-5124','beras','BAHAN_BAKU','KG',40.00,5.00,15000.00,NULL,'BAIK','2026-11-06 00:00:00.000',NULL,'2026-11-06 18:30:59.601','2026-11-06 18:32:25.241','2026-11-06 18:32:25.239',185),(9,4,'INV-3166','beras','BAHAN_BAKU','KG',50.00,5.00,15000.00,NULL,'BAIK','2026-11-05 18:58:39.522',NULL,'2026-11-06 18:58:39.525','2026-11-06 18:58:57.055','2026-11-06 18:58:57.054',185),(11,4,'INV-8717','Sapu','PERALATAN_ASET','PCS',10.00,5.00,20000.00,NULL,'RUSAK_RINGAN','2026-11-07 12:43:52.083',NULL,'2026-11-07 12:43:52.154','2026-11-07 12:44:09.189','2026-11-07 12:44:09.187',192);
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `type` enum('MASUK','KELUAR','OPNAME') NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `stock_before` decimal(15,2) NOT NULL,
  `stock_after` decimal(15,2) NOT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `movement_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `journal_entry_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_movements_journal_entry_id_key` (`journal_entry_id`),
  KEY `inventory_movements_business_id_fkey` (`business_id`),
  KEY `inventory_movements_item_id_fkey` (`item_id`),
  CONSTRAINT `inventory_movements_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_movements_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_movements_journal_entry_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_movements`
--

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
INSERT INTO `inventory_movements` VALUES (1,4,1,'MASUK',15.00,0.00,15.00,125000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-10-30 00:00:00.000','2026-10-30 14:40:14.479',NULL),(2,4,1,'MASUK',5.00,15.00,20.00,125000.00,'PO-2026-10-001','Tambahan pasokan dari supplier lokal','2026-10-30 00:00:00.000','2026-10-30 14:40:14.580',NULL),(3,4,2,'MASUK',10.00,0.00,10.00,85000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-10-30 15:18:03.133','2026-10-30 15:18:03.167',NULL),(4,4,2,'KELUAR',4.00,10.00,6.00,85000.00,'RESEP-BAR-01','Pemakaian untuk 20 cangkir hazelnut latte','2026-10-30 15:18:03.212','2026-10-30 15:18:03.235',NULL),(5,4,2,'MASUK',6.00,6.00,12.00,85000.00,'PO-SUPPLIER-02','Restock pasokan baru dari supplier','2026-10-30 15:18:03.384','2026-10-30 15:18:03.612',NULL),(6,1,3,'MASUK',2.00,0.00,2.00,1200000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-10-30 15:47:14.249','2026-10-30 15:47:14.293',12),(7,4,4,'MASUK',20.00,0.00,20.00,55000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-10-31 00:00:00.000','2026-10-31 06:11:06.252',NULL),(8,4,5,'MASUK',23.00,0.00,23.00,15000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-11-05 00:00:00.000','2026-11-05 07:23:06.144',NULL),(9,4,5,'KELUAR',7.00,23.00,16.00,15000.00,NULL,NULL,'2026-11-05 00:00:00.000','2026-11-05 07:23:50.143',NULL),(10,4,6,'MASUK',50.00,0.00,50.00,497.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-11-05 00:00:00.000','2026-11-05 08:17:51.260',NULL),(11,4,7,'MASUK',50.00,0.00,50.00,15000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-11-06 00:00:00.000','2026-11-06 18:30:59.631',NULL),(12,4,7,'KELUAR',10.00,50.00,40.00,15000.00,NULL,NULL,'2026-11-06 00:00:00.000','2026-11-06 18:31:40.234',NULL),(15,4,9,'MASUK',50.00,0.00,50.00,15000.00,'SALDO-AWAL','Pencatatan saldo awal barang inventaris','2026-11-05 18:58:39.522','2026-11-06 18:58:39.554',NULL);
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_entries`
--

LOCK TABLES `journal_entries` WRITE;
/*!40000 ALTER TABLE `journal_entries` DISABLE KEYS */;
INSERT INTO `journal_entries` VALUES (1,2,1,'JRN-20261030-0001','PENJUALAN','Penjualan kasir: TRX-20261030-0001',89000.00,89000.00,'2026-10-30 13:04:35.601',1,NULL,1,'2026-10-30 13:04:35.649','2026-10-30 13:05:05.091'),(2,2,2,'JRN-20261030-0002','PENGELUARAN','Pengeluaran kas: Beban Listrik & Air - Pembayaran token listrik toko bulan ini',250000.00,250000.00,'2026-10-30 13:04:35.812',0,NULL,1,'2026-10-30 13:04:35.824','2026-10-30 13:04:35.824'),(3,2,NULL,'REV-20261030-0003','PENYESUAIAN','Jurnal Pembalik atas transaksi TRX-20261030-0001 (Alasan: Pelanggan salah pesan dan pesanan dibatalkan)',89000.00,89000.00,'2026-10-30 13:05:05.117',0,1,1,'2026-10-30 13:05:05.119','2026-10-30 13:05:05.119'),(6,2,7,'JRN-CAFE01-20261030-0004','PENJUALAN','Penjualan kasir: TRX-CAFE01-20261030-0003',37000.00,37000.00,'2026-10-30 14:53:57.742',0,NULL,1,'2026-10-30 14:53:57.829','2026-10-30 14:53:57.829'),(12,1,NULL,'JRN-USAHA01-20261030-0001','PEMBUKAAN','Saldo Awal Inventaris: Stik Billiard Predator Ujung Retak (2 PCS)',2400000.00,2400000.00,'2026-10-30 15:47:14.249',0,NULL,1,'2026-10-30 15:47:14.287','2026-10-30 15:47:14.287'),(24,1,NULL,'JRN-USAHA01-20261107-0002','PENYESUAIAN','Pemakaian/Stok Keluar: Test Barang Jam Presisi (2 KG)',20000.00,20000.00,'2026-11-06 18:57:05.332',0,NULL,1,'2026-11-06 18:57:05.357','2026-11-06 18:57:05.357'),(30,1,NULL,'JRN-USAHA01-20261107-0003','PENGELUARAN','Gaji Staf: Karyawan Uji Kasbon (PAY-USAHA01-20261107-0001)',3000000.00,3000000.00,'2026-11-05 20:04:30.954',0,NULL,1,'2026-11-06 20:04:30.975','2026-11-06 20:04:30.975'),(31,1,NULL,'JRN-USAHA01-20261107-0004','PENGELUARAN','Gaji Staf: Karyawan Uji Kasbon (PAY-USAHA01-20261107-0002)',2750000.00,2750000.00,'2026-11-05 20:05:14.706',0,NULL,1,'2026-11-06 20:05:14.722','2026-11-06 20:05:14.722'),(40,4,9,'JRN-BILLIARD01-20261107-0002','PENJUALAN','Penjualan kasir: TRX-BILLIARD01-20261107-0001',422000.00,422000.00,'2026-11-07 04:50:34.663',0,NULL,1,'2026-11-07 04:50:34.772','2026-11-07 04:50:34.772'),(43,1,10,'JRN-USAHA01-20261107-0005','PENJUALAN','Penjualan kasir: TRX-USAHA01-20261107-0001',110000.00,110000.00,'2026-11-07 06:08:10.569',0,NULL,1,'2026-11-07 06:08:10.599','2026-11-07 06:08:10.599'),(44,1,11,'JRN-USAHA01-20261107-0006','PENJUALAN','Penjualan kasir: TRX-USAHA01-20261107-0002',110000.00,110000.00,'2026-11-07 06:09:02.757',1,NULL,1,'2026-11-07 06:09:02.784','2026-11-07 06:09:02.923'),(45,1,NULL,'REV-USAHA01-20261107-0006','PENYESUAIAN','Jurnal Pembalik atas transaksi TRX-USAHA01-20261107-0002 (Alasan: Uji coba pembatalan struk otomatis)',110000.00,110000.00,'2026-11-07 06:09:02.928',0,44,1,'2026-11-07 06:09:02.930','2026-11-07 06:09:02.930'),(46,1,12,'JRN-USAHA01-20261107-0007','PENJUALAN','Penjualan kasir: TRX-USAHA01-20261107-0003',110000.00,110000.00,'2026-11-07 06:09:34.058',1,NULL,1,'2026-11-07 06:09:34.097','2026-11-07 06:09:34.223'),(47,1,NULL,'REV-USAHA01-20261107-0008','PENYESUAIAN','Jurnal Pembalik atas transaksi TRX-USAHA01-20261107-0003 (Alasan: Uji coba pembatalan struk otomatis)',110000.00,110000.00,'2026-11-07 06:09:34.228',0,46,1,'2026-11-07 06:09:34.231','2026-11-07 06:09:34.231'),(51,4,NULL,'JRN-BILLIARD01-20261107-0003','PENGELUARAN','Gaji Staf: Budi Santoso (PAY-BILLIARD01-20261107-0001)',2318000.00,2318000.00,'2026-11-07 11:51:05.754',0,NULL,1,'2026-11-07 11:51:05.856','2026-11-07 11:51:05.856'),(52,4,NULL,'JRN-BILLIARD01-20261107-0004','PENGELUARAN','Gaji Staf: Ardiansyah Saputra (PAY-BILLIARD01-20261107-0002)',2940000.00,2940000.00,'2026-11-07 11:54:40.081',0,NULL,1,'2026-11-07 11:54:40.136','2026-11-07 11:54:40.136'),(53,4,13,'JRN-BILLIARD01-20261107-0005','PENJUALAN','Penjualan kasir: TRX-BILLIARD01-20261107-0002',132000.00,132000.00,'2026-11-07 12:01:22.163',0,NULL,1,'2026-11-07 12:01:22.314','2026-11-07 12:01:22.314');
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
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_items`
--

LOCK TABLES `journal_items` WRITE;
/*!40000 ALTER TABLE `journal_items` DISABLE KEYS */;
INSERT INTO `journal_items` VALUES (1,1,65,1,61000.00,'Penerimaan kas/bank penjualan (TRX-20261030-0001)'),(2,1,92,0,61000.00,'Pendapatan penjualan barang/jasa (TRX-20261030-0001)'),(3,1,98,1,28000.00,'HPP penjualan barang (TRX-20261030-0001)'),(4,1,69,0,28000.00,'Pengurangan persediaan barang (TRX-20261030-0001)'),(5,2,103,1,250000.00,'Beban Beban Listrik & Air: Pembayaran token listrik toko bulan ini'),(6,2,65,0,250000.00,'Pengeluaran via Kas (EXP-20261030-0002)'),(7,3,65,0,61000.00,'[PEMBALIK] Penerimaan kas/bank penjualan (TRX-20261030-0001)'),(8,3,92,1,61000.00,'[PEMBALIK] Pendapatan penjualan barang/jasa (TRX-20261030-0001)'),(9,3,98,0,28000.00,'[PEMBALIK] HPP penjualan barang (TRX-20261030-0001)'),(10,3,69,1,28000.00,'[PEMBALIK] Pengurangan persediaan barang (TRX-20261030-0001)'),(19,6,65,1,25000.00,'Penerimaan kas/bank penjualan (TRX-CAFE01-20261030-0003)'),(20,6,92,0,25000.00,'Pendapatan penjualan barang/jasa (TRX-CAFE01-20261030-0003)'),(21,6,98,1,12000.00,'HPP penjualan barang (TRX-CAFE01-20261030-0003)'),(22,6,69,0,12000.00,'Pengurangan persediaan barang (TRX-CAFE01-20261030-0003)'),(37,12,18,1,2400000.00,'Saldo awal persediaan Stik Billiard Predator Ujung Retak'),(38,12,30,0,2400000.00,'Pengimbang saldo awal inventaris via Modal Awal'),(67,24,41,1,20000.00,'Beban pemakaian Test Barang Jam Presisi - Test mutasi waktu presisi'),(68,24,11,0,20000.00,'Pengurangan persediaan fisik Test Barang Jam Presisi'),(79,30,43,1,3000000.00,'Beban gaji Karyawan Uji Kasbon - Periode 2026-11-06 s.d. 2026-11-06'),(80,30,1,0,3000000.00,'Pembayaran via ASET - Uji Potong Kasbon Otomatis'),(81,31,43,1,2750000.00,'Beban gaji Karyawan Uji Kasbon - Periode 2026-11-06 s.d. 2026-11-06'),(82,31,1,0,2750000.00,'Pembayaran via ASET - Uji Potong Kasbon Otomatis'),(99,40,181,1,248000.00,'Penerimaan kas/bank penjualan (TRX-BILLIARD01-20261107-0001)'),(100,40,208,0,248000.00,'Pendapatan penjualan barang/jasa (TRX-BILLIARD01-20261107-0001)'),(101,40,214,1,174000.00,'Beban penjualan barang (TRX-BILLIARD01-20261107-0001)'),(102,40,236,0,174000.00,'Pengurangan persediaan barang dagangan (TRX-BILLIARD01-20261107-0001)'),(107,43,7,1,70000.00,'Penerimaan kas/bank penjualan (TRX-USAHA01-20261107-0001)'),(108,43,34,0,70000.00,'Pendapatan penjualan barang/jasa (TRX-USAHA01-20261107-0001)'),(109,43,40,1,40000.00,'Beban penjualan barang (TRX-USAHA01-20261107-0001)'),(110,43,233,0,40000.00,'Pengurangan persediaan barang dagangan (TRX-USAHA01-20261107-0001)'),(111,44,9,1,70000.00,'Penerimaan via QRIS (No: TRX-USAHA01-20261107-0002)'),(112,44,34,0,70000.00,'Pendapatan penjualan barang/jasa (TRX-USAHA01-20261107-0002)'),(113,44,40,1,40000.00,'Beban penjualan barang (TRX-USAHA01-20261107-0002)'),(114,44,233,0,40000.00,'Pengurangan persediaan barang dagangan (TRX-USAHA01-20261107-0002)'),(115,45,9,0,70000.00,'[PEMBALIK] Penerimaan via QRIS (No: TRX-USAHA01-20261107-0002)'),(116,45,34,1,70000.00,'[PEMBALIK] Pendapatan penjualan barang/jasa (TRX-USAHA01-20261107-0002)'),(117,45,40,0,40000.00,'[PEMBALIK] Beban penjualan barang (TRX-USAHA01-20261107-0002)'),(118,45,233,1,40000.00,'[PEMBALIK] Pengurangan persediaan barang dagangan (TRX-USAHA01-20261107-0002)'),(119,46,9,1,70000.00,'Penerimaan via QRIS (No: TRX-USAHA01-20261107-0003)'),(120,46,34,0,70000.00,'Pendapatan penjualan barang/jasa (TRX-USAHA01-20261107-0003)'),(121,46,40,1,40000.00,'Beban penjualan barang (TRX-USAHA01-20261107-0003)'),(122,46,233,0,40000.00,'Pengurangan persediaan barang dagangan (TRX-USAHA01-20261107-0003)'),(123,47,9,0,70000.00,'[PEMBALIK] Penerimaan via QRIS (No: TRX-USAHA01-20261107-0003)'),(124,47,34,1,70000.00,'[PEMBALIK] Pendapatan penjualan barang/jasa (TRX-USAHA01-20261107-0003)'),(125,47,40,0,40000.00,'[PEMBALIK] Beban penjualan barang (TRX-USAHA01-20261107-0003)'),(126,47,233,1,40000.00,'[PEMBALIK] Pengurangan persediaan barang dagangan (TRX-USAHA01-20261107-0003)'),(133,51,217,1,2318000.00,'Beban gaji Budi Santoso - Periode 2026-11-01 s.d. 2026-11-30'),(134,51,183,0,2318000.00,'Pembayaran via Bank'),(135,52,217,1,2940000.00,'Beban gaji Ardiansyah Saputra - Periode 2026-11-01 s.d. 2026-11-30'),(136,52,183,0,2940000.00,'Pembayaran via Bank'),(137,53,181,1,78000.00,'Penerimaan kas/bank penjualan (TRX-BILLIARD01-20261107-0002)'),(138,53,208,0,78000.00,'Pendapatan penjualan barang/jasa (TRX-BILLIARD01-20261107-0002)'),(139,53,214,1,54000.00,'Beban penjualan barang (TRX-BILLIARD01-20261107-0002)'),(140,53,236,0,54000.00,'Pengurangan persediaan barang dagangan (TRX-BILLIARD01-20261107-0002)');
/*!40000 ALTER TABLE `journal_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operational_rules`
--

DROP TABLE IF EXISTS `operational_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operational_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `discipline_bonus_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `late_deduction_per_occurrence` decimal(15,2) NOT NULL DEFAULT 0.00,
  `late_deduction_per_minute` decimal(15,2) NOT NULL DEFAULT 0.00,
  `min_work_days_for_bonus` int(11) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `absence_deduction_per_day` decimal(15,2) NOT NULL DEFAULT 0.00,
  `meal_allowance_per_day` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operational_rules_business_id_key` (`business_id`),
  CONSTRAINT `operational_rules_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operational_rules`
--

LOCK TABLES `operational_rules` WRITE;
/*!40000 ALTER TABLE `operational_rules` DISABLE KEYS */;
INSERT INTO `operational_rules` VALUES (1,1,150000.00,25000.00,1000.00,20,'Rule test kedisiplinan','2026-11-07 06:43:26.747','2026-11-07 06:43:49.141',0.00,0.00),(2,4,20000.00,2000.00,0.00,0,'Aturan kedisiplinan dan jam kerja operasional standar.','2026-11-07 06:52:19.346','2026-11-07 12:20:06.140',25000.00,20000.00),(3,2,10000.00,15000.00,0.00,0,'Kebijakan bonus kedisiplinan per hari dan potongan keterlambatan.','2026-11-07 08:23:26.235','2026-11-07 08:23:26.235',0.00,0.00);
/*!40000 ALTER TABLE `operational_rules` ENABLE KEYS */;
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
  `category` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_business_id_code_key` (`business_id`,`code`),
  CONSTRAINT `products_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,2,'KOP01','Kopi Susu Gula Aren','CUP',18000.00,8000.00,50.00,10.00,1,NULL,'2026-10-30 13:04:35.308','2026-10-30 13:05:05.066',NULL,NULL),(2,2,'CR01','Croissant Butter','PCS',25000.00,12000.00,29.00,5.00,1,NULL,'2026-10-30 13:04:35.559','2026-10-30 14:53:57.756',NULL,NULL),(3,4,'KO123','SSS','PCS',145000.00,123000.00,50.00,5.00,0,NULL,'2026-10-30 14:21:39.770','2026-10-30 14:21:52.253','2026-10-30 14:21:52.252',NULL),(4,4,'MN-1360','asd','PORSI',25000.00,15000.00,47.00,5.00,0,NULL,'2026-10-30 14:45:24.704','2026-10-31 05:47:00.890','2026-10-31 05:47:00.886',NULL),(5,1,'MN-TEST-1019','Menu Spesial Uji Coba','PORSI',35000.00,20000.00,0.00,0.00,1,'Menu tanpa input stok awal dan tanpa batas minimal','2026-10-30 15:46:59.154','2026-10-30 15:46:59.154',NULL,NULL),(6,4,'MN-5709','nasi goreng','PORSI',20000.00,15000.00,-12.00,0.00,1,NULL,'2026-11-05 07:19:29.157','2026-11-07 12:01:22.228',NULL,'Makanan'),(7,4,'MN-8133','es teh','PORSI',4000.00,2000.00,-14.00,0.00,1,NULL,'2026-11-07 04:49:41.475','2026-11-07 12:01:22.191',NULL,'Minuman'),(8,1,'TEST-MENU-0535','Nasi Liwet Komplit Spesial','PORSI',35000.00,20000.00,-2.00,0.00,1,NULL,'2026-11-07 06:08:10.543','2026-11-07 06:08:10.580',NULL,'Paket Spesial Khas Sunda'),(9,1,'TEST-MENU-2713','Nasi Liwet Komplit Spesial','PORSI',35000.00,20000.00,0.00,0.00,1,NULL,'2026-11-07 06:09:02.722','2026-11-07 06:09:02.919',NULL,'Paket Spesial Khas Sunda'),(10,1,'TEST-MENU-4010','Nasi Liwet Komplit Spesial','PORSI',35000.00,20000.00,0.00,0.00,0,NULL,'2026-11-07 06:09:34.028','2026-11-07 06:09:34.235','2026-11-07 06:09:34.233','Paket Spesial Khas Sunda'),(11,4,'MN-7052','Onion Ring','PORSI',15000.00,10000.00,-2.00,0.00,1,NULL,'2026-11-07 11:56:04.011','2026-11-07 12:01:22.250',NULL,'Snack');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_payment_deduction_items`
--

DROP TABLE IF EXISTS `salary_payment_deduction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `salary_payment_deduction_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `salary_payment_id` int(11) NOT NULL,
  `deduction_id` int(11) NOT NULL,
  `amount_applied` decimal(15,2) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `salary_payment_deduction_items_salary_payment_id_fkey` (`salary_payment_id`),
  KEY `salary_payment_deduction_items_deduction_id_fkey` (`deduction_id`),
  CONSTRAINT `salary_payment_deduction_items_deduction_id_fkey` FOREIGN KEY (`deduction_id`) REFERENCES `employee_deductions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `salary_payment_deduction_items_salary_payment_id_fkey` FOREIGN KEY (`salary_payment_id`) REFERENCES `salary_payments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_payment_deduction_items`
--

LOCK TABLES `salary_payment_deduction_items` WRITE;
/*!40000 ALTER TABLE `salary_payment_deduction_items` DISABLE KEYS */;
INSERT INTO `salary_payment_deduction_items` VALUES (8,18,23,200000.00,'2026-11-07 11:51:05.900');
/*!40000 ALTER TABLE `salary_payment_deduction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_payments`
--

DROP TABLE IF EXISTS `salary_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `salary_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `payment_number` varchar(50) NOT NULL,
  `period_start` datetime(3) NOT NULL,
  `period_end` datetime(3) NOT NULL,
  `payment_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `base_salary` decimal(15,2) NOT NULL,
  `allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `bonus` decimal(15,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(15,2) NOT NULL,
  `payment_method` enum('TUNAI','TRANSFER','QRIS','DEBIT','KREDIT') NOT NULL DEFAULT 'TUNAI',
  `account_id` int(11) NOT NULL,
  `journal_entry_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `attendance_days` int(11) NOT NULL DEFAULT 0,
  `discipline_bonus` decimal(15,2) NOT NULL DEFAULT 0.00,
  `late_days` int(11) NOT NULL DEFAULT 0,
  `late_deduction` decimal(15,2) NOT NULL DEFAULT 0.00,
  `late_minutes` int(11) NOT NULL DEFAULT 0,
  `on_time_days` int(11) NOT NULL DEFAULT 0,
  `absence_deduction` decimal(15,2) NOT NULL DEFAULT 0.00,
  `alfa_days` int(11) NOT NULL DEFAULT 0,
  `izin_days` int(11) NOT NULL DEFAULT 0,
  `meal_allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sakit_days` int(11) NOT NULL DEFAULT 0,
  `cuti_days` int(11) NOT NULL DEFAULT 0,
  `libur_days` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_payments_payment_number_key` (`payment_number`),
  UNIQUE KEY `salary_payments_journal_entry_id_key` (`journal_entry_id`),
  KEY `salary_payments_business_id_fkey` (`business_id`),
  KEY `salary_payments_employee_id_fkey` (`employee_id`),
  KEY `salary_payments_account_id_fkey` (`account_id`),
  KEY `salary_payments_created_by_id_fkey` (`created_by_id`),
  CONSTRAINT `salary_payments_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `salary_payments_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `salary_payments_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `salary_payments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `salary_payments_journal_entry_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_payments`
--

LOCK TABLES `salary_payments` WRITE;
/*!40000 ALTER TABLE `salary_payments` DISABLE KEYS */;
INSERT INTO `salary_payments` VALUES (3,1,4,'PAY-USAHA01-20261107-0001','2026-11-05 20:04:30.954','2026-11-05 20:04:30.954','2026-11-05 20:04:30.954',3000000.00,0.00,0.00,0.00,3000000.00,'TUNAI',1,30,'Uji Potong Kasbon Otomatis',1,'2026-11-06 20:04:30.988','2026-11-06 20:04:30.988',NULL,0,0.00,0,0.00,0,0,0.00,0,0,0.00,0,0,0),(4,1,4,'PAY-USAHA01-20261107-0002','2026-11-05 20:05:14.706','2026-11-05 20:05:14.706','2026-11-05 20:05:14.706',3000000.00,0.00,0.00,250000.00,2750000.00,'TUNAI',1,31,'Uji Potong Kasbon Otomatis',1,'2026-11-06 20:05:14.733','2026-11-06 20:05:14.733',NULL,0,0.00,0,0.00,0,0,0.00,0,0,0.00,0,0,0),(18,4,2,'PAY-BILLIARD01-20261107-0001','2026-11-01 11:51:05.806','2026-11-30 11:51:05.806','2026-11-07 11:51:05.754',2500000.00,20000.00,0.00,202000.00,2318000.00,'TRANSFER',183,51,NULL,1,'2026-11-07 11:51:05.871','2026-11-07 11:51:05.871',NULL,1,0.00,1,2000.00,374,0,0.00,0,0,20000.00,0,0,0),(19,4,3,'PAY-BILLIARD01-20261107-0002','2026-11-01 11:54:40.109','2026-11-30 11:54:40.109','2026-11-07 11:54:40.081',2900000.00,20000.00,20000.00,0.00,2940000.00,'TRANSFER',183,52,NULL,1,'2026-11-07 11:54:40.151','2026-11-07 11:54:40.151',NULL,1,20000.00,0,0.00,0,1,0.00,0,0,20000.00,0,0,0);
/*!40000 ALTER TABLE `salary_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shifts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `start_time` varchar(10) NOT NULL,
  `end_time` varchar(10) NOT NULL,
  `grace_period_minutes` int(11) NOT NULL DEFAULT 15,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shifts_business_id_fkey` (`business_id`),
  CONSTRAINT `shifts_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shifts`
--

LOCK TABLES `shifts` WRITE;
/*!40000 ALTER TABLE `shifts` DISABLE KEYS */;
INSERT INTO `shifts` VALUES (1,1,'Shift Pagi Test','08:00','16:00',15,1,'2026-11-07 06:43:26.733','2026-11-07 06:43:26.733',NULL),(2,4,'Full','08:00','16:00',15,1,'2026-11-07 06:53:21.393','2026-11-07 12:22:56.873',NULL),(3,4,'malam','18:55','20:00',15,0,'2026-11-07 11:53:36.183','2026-11-07 12:13:52.166','2026-11-07 12:13:52.165');
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,2,1,'MASUK',50.00,0.00,50.00,'STOK-AWAL','Pencatatan stok awal saat produk baru didaftarkan','2026-10-30 13:04:35.326'),(2,2,2,'MASUK',30.00,0.00,30.00,'STOK-AWAL','Pencatatan stok awal saat produk baru didaftarkan','2026-10-30 13:04:35.565'),(3,2,1,'KELUAR',2.00,50.00,48.00,'TRX-20261030-0001','Penjualan kasir (TRX-20261030-0001)','2026-10-30 13:04:35.620'),(4,2,2,'KELUAR',1.00,30.00,29.00,'TRX-20261030-0001','Penjualan kasir (TRX-20261030-0001)','2026-10-30 13:04:35.632'),(5,2,1,'RETUR',2.00,48.00,50.00,'VOID-TRX-20261030-0001','Pengembalian stok akibat transaksi divoid: Pelanggan salah pesan dan pesanan dibatalkan','2026-10-30 13:05:05.071'),(6,2,2,'RETUR',1.00,29.00,30.00,'VOID-TRX-20261030-0001','Pengembalian stok akibat transaksi divoid: Pelanggan salah pesan dan pesanan dibatalkan','2026-10-30 13:05:05.086'),(7,4,3,'MASUK',50.00,0.00,50.00,'STOK-AWAL','Pencatatan stok awal saat produk baru didaftarkan','2026-10-30 14:21:39.786'),(8,4,4,'MASUK',50.00,0.00,50.00,'STOK-AWAL','Pencatatan stok awal saat produk baru didaftarkan','2026-10-30 14:45:24.713'),(9,4,4,'KELUAR',1.00,50.00,49.00,'TRX-BILLIARD01-20261030-0001','Penjualan kasir (TRX-BILLIARD01-20261030-0001)','2026-10-30 14:53:24.318'),(10,4,4,'KELUAR',1.00,49.00,48.00,'TRX-BILLIARD01-20261030-0002','Penjualan kasir (TRX-BILLIARD01-20261030-0002)','2026-10-30 14:53:37.031'),(11,2,2,'KELUAR',1.00,30.00,29.00,'TRX-CAFE01-20261030-0003','Penjualan kasir (TRX-CAFE01-20261030-0003)','2026-10-30 14:53:57.760'),(12,4,4,'KELUAR',1.00,48.00,47.00,'TRX-BILLIARD01-20261030-0003','Penjualan kasir (TRX-BILLIARD01-20261030-0003)','2026-10-30 14:55:17.391'),(13,4,6,'KELUAR',10.00,0.00,-10.00,'TRX-BILLIARD01-20261107-0001','Penjualan kasir (TRX-BILLIARD01-20261107-0001)','2026-11-07 04:50:34.701'),(14,4,7,'KELUAR',12.00,0.00,-12.00,'TRX-BILLIARD01-20261107-0001','Penjualan kasir (TRX-BILLIARD01-20261107-0001)','2026-11-07 04:50:34.736'),(15,1,8,'KELUAR',2.00,0.00,-2.00,'TRX-USAHA01-20261107-0001','Penjualan kasir (TRX-USAHA01-20261107-0001)','2026-11-07 06:08:10.582'),(16,1,9,'KELUAR',2.00,0.00,-2.00,'TRX-USAHA01-20261107-0002','Penjualan kasir (TRX-USAHA01-20261107-0002)','2026-11-07 06:09:02.769'),(17,1,9,'RETUR',2.00,-2.00,0.00,'VOID-TRX-USAHA01-20261107-0002','Pengembalian stok akibat transaksi divoid: Uji coba pembatalan struk otomatis','2026-11-07 06:09:02.921'),(18,1,10,'KELUAR',2.00,0.00,-2.00,'TRX-USAHA01-20261107-0003','Penjualan kasir (TRX-USAHA01-20261107-0003)','2026-11-07 06:09:34.076'),(19,1,10,'RETUR',2.00,-2.00,0.00,'VOID-TRX-USAHA01-20261107-0003','Pengembalian stok akibat transaksi divoid: Uji coba pembatalan struk otomatis','2026-11-07 06:09:34.221'),(20,4,7,'KELUAR',2.00,-12.00,-14.00,'TRX-BILLIARD01-20261107-0002','Penjualan kasir (TRX-BILLIARD01-20261107-0002)','2026-11-07 12:01:22.204'),(21,4,6,'KELUAR',2.00,-10.00,-12.00,'TRX-BILLIARD01-20261107-0002','Penjualan kasir (TRX-BILLIARD01-20261107-0002)','2026-11-07 12:01:22.238'),(22,4,11,'KELUAR',2.00,0.00,-2.00,'TRX-BILLIARD01-20261107-0002','Penjualan kasir (TRX-BILLIARD01-20261107-0002)','2026-11-07 12:01:22.259');
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
INSERT INTO `transaction_items` VALUES (1,1,1,'Kopi Susu Gula Aren',2.00,18000.00,36000.00),(2,1,2,'Croissant Butter',1.00,25000.00,25000.00),(3,2,NULL,'Beban Listrik & Air (Pembayaran token listrik toko bulan ini)',1.00,250000.00,250000.00),(4,5,4,'asd',1.00,25000.00,25000.00),(5,6,4,'asd',1.00,25000.00,25000.00),(6,7,2,'Croissant Butter',1.00,25000.00,25000.00),(7,8,4,'asd',1.00,25000.00,25000.00),(8,9,6,'nasi goreng',10.00,20000.00,200000.00),(9,9,7,'es teh',12.00,4000.00,48000.00),(10,10,8,'Nasi Liwet Komplit Spesial',2.00,35000.00,70000.00),(11,11,9,'Nasi Liwet Komplit Spesial',2.00,35000.00,70000.00),(12,12,10,'Nasi Liwet Komplit Spesial',2.00,35000.00,70000.00),(13,13,7,'es teh',2.00,4000.00,8000.00),(14,13,6,'nasi goreng',2.00,20000.00,40000.00),(15,13,11,'Onion Ring',2.00,15000.00,30000.00);
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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,2,'TRX-20261030-0001','PEMASUKAN',61000.00,0.00,0.00,61000.00,'TUNAI',70000.00,9000.00,'Pelanggan meja 3','2026-10-30 13:04:35.601',1,'2026-10-30 13:05:05.054','Pelanggan salah pesan dan pesanan dibatalkan','2026-10-30 13:04:35.603','2026-10-30 13:05:05.057'),(2,2,'EXP-20261030-0002','PENGELUARAN',250000.00,0.00,0.00,250000.00,'TUNAI',NULL,NULL,'Pembayaran token listrik toko bulan ini','2026-10-30 13:04:35.812',1,NULL,NULL,'2026-10-30 13:04:35.814','2026-10-30 13:04:35.814'),(5,4,'TRX-BILLIARD01-20261030-0001','PEMASUKAN',25000.00,0.00,0.00,25000.00,'TUNAI',100000.00,75000.00,'Penjualan uji coba kasir POS','2026-10-30 14:53:24.296',1,'2026-10-31 06:30:31.845','Jurnal transaksi telah dihapus oleh Super Admin di Buku Jurnal Umum','2026-10-30 14:53:24.298','2026-10-31 06:30:31.848'),(6,4,'TRX-BILLIARD01-20261030-0002','PEMASUKAN',25000.00,0.00,0.00,25000.00,'TUNAI',100000.00,75000.00,'Penjualan uji coba kasir POS','2026-10-30 14:53:37.017',1,'2026-10-31 06:30:31.854','Jurnal transaksi telah dihapus oleh Super Admin di Buku Jurnal Umum','2026-10-30 14:53:37.019','2026-10-31 06:30:31.855'),(7,2,'TRX-CAFE01-20261030-0003','PEMASUKAN',25000.00,0.00,0.00,25000.00,'TUNAI',50000.00,25000.00,'Penjualan Cafe','2026-10-30 14:53:57.742',1,NULL,NULL,'2026-10-30 14:53:57.744','2026-10-30 14:53:57.744'),(8,4,'TRX-BILLIARD01-20261030-0003','PEMASUKAN',25000.00,0.00,0.00,25000.00,'TUNAI',25000.00,0.00,NULL,'2026-10-30 14:55:17.352',1,'2026-10-31 06:30:31.859','Jurnal transaksi telah dihapus oleh Super Admin di Buku Jurnal Umum','2026-10-30 14:55:17.353','2026-10-31 06:30:31.861'),(9,4,'TRX-BILLIARD01-20261107-0001','PEMASUKAN',248000.00,0.00,0.00,248000.00,'TUNAI',250000.00,2000.00,NULL,'2026-11-07 04:50:34.663',1,NULL,NULL,'2026-11-07 04:50:34.665','2026-11-07 04:50:34.665'),(10,1,'TRX-USAHA01-20261107-0001','PEMASUKAN',70000.00,0.00,0.00,70000.00,'TUNAI',100000.00,30000.00,'Meja 5 - Tanpa sambal','2026-11-07 06:08:10.569',1,NULL,NULL,'2026-11-07 06:08:10.571','2026-11-07 06:08:10.571'),(11,1,'TRX-USAHA01-20261107-0002','PEMASUKAN',70000.00,0.00,0.00,70000.00,'QRIS',100000.00,30000.00,'Meja 5 - Sambal dipisah (Updated)','2026-11-07 06:09:02.757',1,'2026-11-07 06:09:02.913','Uji coba pembatalan struk otomatis','2026-11-07 06:09:02.759','2026-11-07 06:09:02.914'),(12,1,'TRX-USAHA01-20261107-0003','PEMASUKAN',70000.00,0.00,0.00,70000.00,'QRIS',100000.00,30000.00,'Meja 5 - Sambal dipisah (Updated)','2026-11-07 06:09:34.058',1,'2026-11-07 06:09:34.211','Uji coba pembatalan struk otomatis','2026-11-07 06:09:34.060','2026-11-07 06:09:34.213'),(13,4,'TRX-BILLIARD01-20261107-0002','PEMASUKAN',78000.00,0.00,0.00,78000.00,'TUNAI',78000.00,0.00,NULL,'2026-11-07 12:01:22.163',1,NULL,NULL,'2026-11-07 12:01:22.167','2026-11-07 12:01:22.167');
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_business_access`
--

LOCK TABLES `user_business_access` WRITE;
/*!40000 ALTER TABLE `user_business_access` DISABLE KEYS */;
INSERT INTO `user_business_access` VALUES (6,3,2,'2026-10-30 14:03:42.836'),(7,3,3,'2026-10-30 14:03:42.836'),(11,4,4,'2026-11-05 07:35:23.276'),(13,2,4,'2026-11-05 07:37:42.306'),(14,5,4,'2026-11-07 12:41:12.749');
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
  `role` enum('SUPER_ADMIN','ADMIN','KASIR','AGENT') NOT NULL DEFAULT 'KASIR',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'superadmin','$2b$12$oeLSKCFck5mpxJsu40p/5ej0JEoy4RMST6vPU86TmdvPEo2L/AkDC','Hilmi','SUPER_ADMIN',1,'2026-10-30 12:39:26.143','2026-11-07 12:00:48.119',NULL),(2,'kasir1','$2b$12$hgZJhzAinNLi4LLXY59N7.QY1ZIRo2sbhoZ2Vihmxaz4bNPEwIDiy','Budi Santoso','KASIR',1,'2026-10-30 12:48:39.246','2026-11-05 07:37:42.297',NULL),(3,'admin1','$2b$12$ZDayqZyTKZeGw31llv4h8uxmnsd2XSjjxsySRH/IUXmo9ogo9xe2e','Admin Cafe & Resto','ADMIN',1,'2026-10-30 14:03:42.831','2026-10-30 14:03:42.831',NULL),(4,'admin2','$2b$12$K5q58Aer4nzV/9dGXBmD0ebEJRThNpDlE7NAgPQRRqYNDxze3gZEq','Admin Billiard','ADMIN',1,'2026-10-30 14:03:43.428','2026-11-05 07:35:23.257',NULL),(5,'agent1','$2b$12$NIMAAQHjicHLEXtR87mCpuzbb5WXPfmc63S2CmL5dx62UQ6Q4AyXa','Hilmi','AGENT',1,'2026-11-07 12:41:12.737','2026-11-07 12:41:12.737',NULL);
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

-- Dump completed on 2026-11-07 21:02:27
