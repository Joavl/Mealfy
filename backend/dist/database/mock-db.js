"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDatabase = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(__dirname, 'data');
class MockDatabase {
    static async ensureDir() {
        try {
            await promises_1.default.access(DATA_DIR);
        }
        catch {
            await promises_1.default.mkdir(DATA_DIR, { recursive: true });
        }
    }
    static async read(fileName) {
        await this.ensureDir();
        const filePath = path_1.default.join(DATA_DIR, `${fileName}.json`);
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    }
    static async write(fileName, data) {
        await this.ensureDir();
        const filePath = path_1.default.join(DATA_DIR, `${fileName}.json`);
        await promises_1.default.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    static async appendAuditLog(event) {
        const logs = await this.read('audit-logs');
        logs.push({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...event
        });
        await this.write('audit-logs', logs);
    }
}
exports.MockDatabase = MockDatabase;
