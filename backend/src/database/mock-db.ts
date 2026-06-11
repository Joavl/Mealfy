import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, 'data');

export class MockDatabase {
  private static async ensureDir() {
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
  }

  static async read<T = any>(fileName: string): Promise<T> {
    await this.ensureDir();
    const filePath = path.join(DATA_DIR, `${fileName}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return [] as any;
    }
  }

  static async write(fileName: string, data: any): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(DATA_DIR, `${fileName}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async appendAuditLog(event: any): Promise<void> {
    const logs = await this.read<any>('audit-logs');
    logs.push({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...event
    });
    await this.write('audit-logs', logs);
  }
}
