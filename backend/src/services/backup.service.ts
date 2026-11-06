import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/config.js';

const execAsync = promisify(exec);

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

// Pastikan direktori backup ada
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export class BackupService {
  /**
   * Cari path mysqldump executable di Windows / XAMPP
   */
  private static getMysqldumpPath(): string {
    const xamppPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
    if (fs.existsSync(xamppPath)) {
      return xamppPath;
    }
    return 'mysqldump';
  }

  /**
   * Membuat backup SQL database secara lokal
   */
  static async createBackup() {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .split('.')[0];
    const filename = `backup_robin_group_${timestamp}.sql`;
    const outputPath = path.join(BACKUP_DIR, filename);

    // Parse DATABASE_URL untuk dapatkan kredensial
    // Format: mysql://user:pass@host:port/dbname
    const dbUrl = config.database.url;
    const urlPattern = /mysql:\/\/([^:]+):?([^@]*)@([^:]+):(\d+)\/(.+)/;
    const match = dbUrl.match(urlPattern);

    let user = 'root';
    let password = '';
    let host = 'localhost';
    let port = '3306';
    let dbName = 'robin_group_db';

    if (match) {
      user = match[1];
      password = match[2];
      host = match[3];
      port = match[4];
      dbName = match[5];
    }

    const mysqldumpBin = this.getMysqldumpPath();
    const passArg = password ? `-p"${password}"` : '';
    const cmd = `& "${mysqldumpBin}" -h ${host} -P ${port} -u ${user} ${passArg} "--result-file=${outputPath}" ${dbName}`;

    try {
      await execAsync(cmd, { shell: 'powershell.exe' });

      const stats = fs.statSync(outputPath);
      return {
        filename,
        sizeBytes: stats.size,
        sizeReadable: `${(stats.size / 1024).toFixed(1)} KB`,
        createdAt: now.toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Gagal membuat backup database: ${error.message}`);
    }
  }

  /**
   * Daftar seluruh file backup yang tersimpan di disk lokal
   */
  static listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sql'));

    return files
      .map((f) => {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          sizeBytes: stats.size,
          sizeReadable: `${(stats.size / 1024).toFixed(1)} KB`,
          createdAt: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Mengambil file path untuk diunduh
   */
  static getBackupFilePath(filename: string): string {
    const cleanFilename = path.basename(filename);
    const fullPath = path.join(BACKUP_DIR, cleanFilename);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File backup tidak ditemukan.');
    }
    return fullPath;
  }
}
