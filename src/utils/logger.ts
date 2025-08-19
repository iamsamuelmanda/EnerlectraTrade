// Simple logger utility for security system
class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, data?: any): void {
    console.log(`[${this.getTimestamp()}] INFO: ${message}`, data || '');
  }

  static warn(message: string, data?: any): void {
    console.warn(`[${this.getTimestamp()}] WARN: ${message}`, data || '');
  }

  static error(message: string, data?: any): void {
    console.error(`[${this.getTimestamp()}] ERROR: ${message}`, data || '');
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.getTimestamp()}] DEBUG: ${message}`, data || '');
    }
  }

  static security(message: string, data?: any): void {
    console.log(`[${this.getTimestamp()}] 🔐 SECURITY: ${message}`, data || '');
  }

  static threat(message: string, data?: any): void {
    console.warn(`[${this.getTimestamp()}] 🚨 THREAT: ${message}`, data || '');
  }

  static quantum(message: string, data?: any): void {
    console.log(`[${this.getTimestamp()}] ⚛️ QUANTUM: ${message}`, data || '');
  }
}

export default Logger;

