/**
 * Format angka ke format mata uang Rupiah
 * Contoh: 1500000 => "Rp 1.500.000"
 */
export function formatRupiah(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format angka ke format desimal Indonesia
 * Contoh: 1500.5 => "1.500,50"
 */
export function formatAngka(amount: number, desimal = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  }).format(amount);
}

/**
 * Format tanggal ke format Indonesia panjang
 * Contoh: "15 Oktober 2024"
 */
export function formatTanggal(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format tanggal ke format singkat
 * Contoh: "15/10/2024"
 */
export function formatTanggalSingkat(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format tanggal + jam
 * Contoh: "15 Oktober 2024, 14:30"
 */
export function formatTanggalJam(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format tanggal ke format YYYY-MM-DD lokal untuk input date HTML (sesuai waktu lokal perangkat)
 */
export function formatTanggalISO(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Menggabungkan string tanggal YYYY-MM-DD dari form dengan jam:menit:detik lokal perangkat saat ini,
 * lalu mengembalikannya dalam bentuk ISO string yang akurat.
 */
export function combineDateWithLocalTime(dateStr?: string): string {
  const now = new Date();
  if (!dateStr) return now.toISOString();

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const combined = new Date(
      y,
      m,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
    return isNaN(combined.getTime()) ? now.toISOString() : combined.toISOString();
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? now.toISOString() : parsed.toISOString();
}

/**
 * Hitung persentase perubahan
 * Contoh: hitungPersentasePerubahan(100, 150) => "+50.00%"
 */
export function hitungPersentasePerubahan(sebelum: number, sesudah: number): string {
  if (sebelum === 0) return sesudah > 0 ? '+100%' : '0%';
  const persentase = ((sesudah - sebelum) / sebelum) * 100;
  const prefix = persentase > 0 ? '+' : '';
  return `${prefix}${persentase.toFixed(1)}%`;
}

/**
 * Singkat angka besar
 * Contoh: 1500000 => "1,5 Jt"
 */
export function singkatAngka(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} M`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Jt`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} Rb`;
  }
  return amount.toString();
}

/**
 * Truncate teks panjang dengan ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Capitalize huruf pertama setiap kata
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
