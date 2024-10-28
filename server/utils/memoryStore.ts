import { ValidationRecord } from '../types/validation';

// Set memory limit to 60% of available memory
const MAX_MEMORY_USAGE = process.memoryUsage().heapTotal * 0.6;

class MemoryStore {
  private records: Map<string, ValidationRecord[]>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.records = new Map();
    
    // Cleanup old records every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 3600000);
  }

  private cleanup() {
    const now = Date.now();
    let totalSize = 0;

    for (const [userId, records] of this.records.entries()) {
      // Remove records older than 24 hours
      const filteredRecords = records.filter(record => {
        const age = now - new Date(record.createdAt).getTime();
        return age < 86400000; // 24 hours in milliseconds
      });

      if (filteredRecords.length === 0) {
        this.records.delete(userId);
      } else {
        this.records.set(userId, filteredRecords);
      }

      // Calculate approximate memory usage
      totalSize += JSON.stringify(filteredRecords).length * 2; // Unicode characters
    }

    // If memory usage exceeds limit, remove oldest records
    if (totalSize > MAX_MEMORY_USAGE) {
      const sortedUsers = Array.from(this.records.entries())
        .sort((a, b) => {
          const aOldest = Math.min(...a[1].map(r => new Date(r.createdAt).getTime()));
          const bOldest = Math.min(...b[1].map(r => new Date(r.createdAt).getTime()));
          return aOldest - bOldest;
        });

      while (totalSize > MAX_MEMORY_USAGE && sortedUsers.length > 0) {
        const [userId, records] = sortedUsers.shift()!;
        totalSize -= JSON.stringify(records).length * 2;
        this.records.delete(userId);
      }
    }
  }

  addRecord(userId: string, record: ValidationRecord): void {
    const userRecords = this.records.get(userId) || [];
    userRecords.push(record);
    
    // Keep only last 100 records per user
    if (userRecords.length > 100) {
      userRecords.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      userRecords.length = 100;
    }
    
    this.records.set(userId, userRecords);
    this.cleanup();
  }

  getRecords(userId: string): ValidationRecord[] {
    return this.records.get(userId) || [];
  }

  clear(): void {
    this.records.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.records.clear();
  }
}

export const memoryStore = new MemoryStore();