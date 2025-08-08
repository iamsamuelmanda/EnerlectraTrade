import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';

class DatabaseService {
  private db: Database;
  
  constructor() {
    const dbPath = process.env.NODE_ENV === 'production' 
      ? process.env.DATABASE_URL || path.join(__dirname, '../data/enerlectra.db')
      : path.join(__dirname, '../data/enerlectra.db');
      
    this.db = new sqlite3.Database(dbPath);
    this.initialize();
  }
  
  private initialize() {
    // Create tables
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      this.db.run(`CREATE TABLE IF NOT EXISTS energy_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_address TEXT NOT NULL,
        buyer_address TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        tx_hash TEXT UNIQUE,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    });
  }
  
  // Add your existing database methods here
}

export default new DatabaseService();