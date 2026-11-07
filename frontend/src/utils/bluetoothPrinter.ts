/**
 * bluetoothPrinter.ts
 * Driver Web Bluetooth API & ESC/POS Command Generator
 * Khusus untuk Printer Thermal Kasir Bluetooth (58mm & 80mm)
 * 100% Offline & Native Browser (Tanpa aplikasi pihak ketiga)
 */

export interface ReceiptPrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptPrintData {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  nomorBukti: string;
  transactionDate: string | Date;
  cashier: string;
  paymentMethod: string;
  items: ReceiptPrintItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  grandTotal: number;
  cashPaid?: number | null;
  changeAmount?: number | null;
  notes?: string | null;
}

// Daftar Service UUID umum untuk printer thermal kasir BLE (ESC/POS)
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / Goojprt / MPT / Pos-58 / Zjiang (Paling umum)
  '0000ff00-0000-1000-8000-00805f9b34fb', // VSC / Panda / Epson BLE
  '0000fff0-0000-1000-8000-00805f9b34fb', // Serial BLE module
  '0000fee7-0000-1000-8000-00805f9b34fb', // Wechat / Android IoT Printer
  '0000ae00-0000-1000-8000-00805f9b34fb', // Zhuhai Jiubao / Iware
  '0000ae30-0000-1000-8000-00805f9b34fb', // Iware / BellaV
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
  '0000e781-0000-1000-8000-00805f9b34fb', // Generic Thermal
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Mini BLE POS
  '000018f1-0000-1000-8000-00805f9b34fb',
];

// State singleton printer yang sedang terkoneksi
let bluetoothDevice: any = null;
let printCharacteristic: any = null;

/**
 * Cek apakah browser mendukung Web Bluetooth API
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Cek status apakah printer bluetooth sedang terhubung
 */
export function isPrinterConnected(): boolean {
  return !!(bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected && printCharacteristic);
}

/**
 * Dapatkan nama perangkat printer yang sedang terhubung
 */
export function getConnectedDeviceName(): string | null {
  if (isPrinterConnected()) {
    return bluetoothDevice.name || 'Printer Bluetooth';
  }
  return null;
}

/**
 * Hubungkan ke printer thermal bluetooth melalui dialog browser
 */
export async function connectBluetoothPrinter(): Promise<string> {
  if (!isBluetoothSupported()) {
    throw new Error(
      'Browser ini tidak mendukung Web Bluetooth API. Harap gunakan Google Chrome atau Microsoft Edge pada Android.'
    );
  }

  try {
    // 1. Minta user memilih printer via dialog bawaan Chrome
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    if (!device) {
      throw new Error('Tidak ada perangkat printer yang dipilih.');
    }

    bluetoothDevice = device;

    // Pasang listener jika koneksi terputus
    device.addEventListener('gattserverdisconnected', onDeviceDisconnected);

    // 2. Konek ke GATT Server
    const server = await device.gatt.connect();

    // 3. Telusuri Services untuk mencari Characteristic yang bisa ditulis
    let targetCharacteristic: any = null;

    // Coba ambil dari optionalServices terlebih dahulu
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetCharacteristic = char;
            break;
          }
        }
        if (targetCharacteristic) break;
      } catch {
        // Coba service berikutnya
      }
    }

    // Jika belum ketemu, telusuri seluruh primary services yang tersedia
    if (!targetCharacteristic) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                targetCharacteristic = char;
                break;
              }
            }
            if (targetCharacteristic) break;
          } catch {
            // Lanjut ke service lain
          }
        }
      } catch {
        // Abaikan
      }
    }

    if (!targetCharacteristic) {
      throw new Error(
        'Berhasil terhubung ke perangkat, namun layanan cetak ESC/POS tidak ditemukan pada perangkat ini.'
      );
    }

    printCharacteristic = targetCharacteristic;
    return device.name || 'Printer Bluetooth';
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      throw new Error('Pencarian printer dibatalkan.');
    }
    throw error;
  }
}

/**
 * Putuskan koneksi printer bluetooth
 */
export async function disconnectBluetoothPrinter(): Promise<void> {
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
    await bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  printCharacteristic = null;
}

function onDeviceDisconnected() {
  printCharacteristic = null;
}

/**
 * Format teks dengan padding rata kiri & kanan (contoh: "Item A           Rp 15.000")
 */
function formatTwoColumns(left: string, right: string, maxChars = 32): string {
  const leftTrimmed = left.trim();
  const rightTrimmed = right.trim();
  const spaceNeeded = maxChars - leftTrimmed.length - rightTrimmed.length;

  if (spaceNeeded > 0) {
    return leftTrimmed + ' '.repeat(spaceNeeded) + rightTrimmed;
  }
  // Jika terlalu panjang, potong bagian kiri
  const maxLeft = maxChars - rightTrimmed.length - 1;
  return leftTrimmed.substring(0, maxLeft) + ' ' + rightTrimmed;
}

/**
 * Format baris pembatas (dash line)
 */
function createDivider(char = '-', length = 32): string {
  return char.repeat(length) + '\n';
}

/**
 * Helper format angka mata uang Rupiah untuk teks struk
 */
function formatAngka(num: number): string {
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

/**
 * Helper format tanggal waktu lokal
 */
function formatWaktu(dateInput: string | Date): string {
  const d = new Date(dateInput);
  const pad = (n: number) => String(n).padStart(2, '0');
  const tgl = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const jam = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${tgl} ${jam}`;
}

/**
 * Buat array byte ESC/POS lengkap dari data struk
 */
export function generateEscPosBytes(data: ReceiptPrintData, paperWidth: '58mm' | '80mm' = '58mm'): Uint8Array {
  const maxChars = paperWidth === '80mm' ? 48 : 32;
  const bytes: number[] = [];

  // Helper push bytes
  const push = (...args: number[]) => bytes.push(...args);
  const pushText = (text: string) => {
    // Encode string ke ASCII / Windows-1252 bytes
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // Ganti karakter non-ascii dengan spasi jika perlu
      push(code < 128 ? code : 32);
    }
  };

  // 1. Inisialisasi printer (ESC @)
  push(0x1b, 0x40);

  // 2. Set Code Page ke Standard Europe / Latin (ESC t 0)
  push(0x1b, 0x74, 0x00);

  // 3. Header: Nama Usaha (Center, Bold, Double Size)
  push(0x1b, 0x61, 0x01); // Center
  push(0x1b, 0x45, 0x01); // Bold ON
  push(0x1d, 0x21, 0x11); // Double width & height
  pushText(data.businessName.toUpperCase() + '\n');

  // Reset ukuran font normal
  push(0x1d, 0x21, 0x00);
  push(0x1b, 0x45, 0x00); // Bold OFF

  if (data.businessAddress) {
    pushText(data.businessAddress + '\n');
  }
  if (data.businessPhone) {
    pushText('Telp: ' + data.businessPhone + '\n');
  }

  // Garis pembatas tebal
  pushText(createDivider('=', maxChars));

  // 4. Info Transaksi (Rata Kiri)
  push(0x1b, 0x61, 0x00); // Align Left
  pushText(formatTwoColumns('No. Struk', data.nomorBukti, maxChars) + '\n');
  pushText(formatTwoColumns('Waktu', formatWaktu(data.transactionDate), maxChars) + '\n');
  pushText(formatTwoColumns('Kasir', data.cashier || 'Kasir', maxChars) + '\n');
  pushText(formatTwoColumns('Metode', data.paymentMethod, maxChars) + '\n');

  // Garis pemisah item
  pushText(createDivider('-', maxChars));

  // 5. Daftar Item Belanja
  for (const item of data.items) {
    // Baris 1: Nama Item (Bold)
    push(0x1b, 0x45, 0x01); // Bold ON
    pushText(item.name + '\n');
    push(0x1b, 0x45, 0x00); // Bold OFF

    // Baris 2: Qty x Harga Satuan           Subtotal
    const qtyPrice = `  ${item.quantity} x ${formatAngka(item.unitPrice)}`;
    const subtotalText = formatAngka(item.subtotal);
    pushText(formatTwoColumns(qtyPrice, subtotalText, maxChars) + '\n');
  }

  // Garis pemisah total
  pushText(createDivider('-', maxChars));

  // 6. Rincian Total Tagihan
  pushText(formatTwoColumns('Subtotal', formatAngka(data.subtotal), maxChars) + '\n');

  if (data.discountAmount && data.discountAmount > 0) {
    pushText(formatTwoColumns('Diskon', `-${formatAngka(data.discountAmount)}`, maxChars) + '\n');
  }

  if (data.taxAmount && data.taxAmount > 0) {
    pushText(formatTwoColumns('Pajak', `+${formatAngka(data.taxAmount)}`, maxChars) + '\n');
  }

  // Grand Total (Bold & Sedikit Lebih Besar)
  push(0x1b, 0x45, 0x01); // Bold ON
  pushText(formatTwoColumns('TOTAL TAGIHAN', formatAngka(data.grandTotal), maxChars) + '\n');
  push(0x1b, 0x45, 0x00); // Bold OFF

  // Tunai & Kembalian jika ada
  if (data.cashPaid !== undefined && data.cashPaid !== null && data.cashPaid > 0) {
    pushText(formatTwoColumns('Tunai Diterima', formatAngka(data.cashPaid), maxChars) + '\n');
    pushText(formatTwoColumns('Kembalian', formatAngka(data.changeAmount || 0), maxChars) + '\n');
  }

  // Catatan transaksi jika ada
  if (data.notes) {
    pushText(createDivider('-', maxChars));
    pushText('Catatan: ' + data.notes + '\n');
  }

  // 7. Footer Struk (Center)
  push(0x1b, 0x61, 0x01); // Center
  pushText(createDivider('=', maxChars));
  pushText('Terima Kasih Atas Kunjungan Anda\n');
  pushText('Struk Sah Pembayaran Kasir\n');
  pushText('Robin Group Offline POS System\n');

  // 8. Feed kertas beberapa baris & Cut (jika printer punya auto cutter)
  pushText('\n\n\n');
  push(0x1d, 0x56, 0x41, 0x10); // Auto-cut paper (GS V A)

  return new Uint8Array(bytes);
}

/**
 * Kirim buffer byte ke printer via BLE characteristic secara bertahap (chunking)
 */
async function sendBytesInChunks(characteristic: any, data: Uint8Array, chunkSize = 50): Promise<void> {
  let offset = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + chunkSize);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    offset += chunkSize;
    // Jeda kecil 25ms agar buffer printer thermal tidak overflow
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/**
 * Cetak struk kasir via Bluetooth Thermal secara langsung
 */
export async function printReceiptBluetooth(
  data: ReceiptPrintData,
  paperWidth: '58mm' | '80mm' = '58mm'
): Promise<void> {
  // Jika belum terkoneksi, minta user konek terlebih dahulu
  if (!isPrinterConnected()) {
    await connectBluetoothPrinter();
  }

  if (!printCharacteristic) {
    throw new Error('Printer bluetooth belum siap untuk mencetak.');
  }

  const rawBytes = generateEscPosBytes(data, paperWidth);
  await sendBytesInChunks(printCharacteristic, rawBytes);
}

