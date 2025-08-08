import { promises as fs } from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../db');

export const initializeDB = async () => {
  try {
    const files = await fs.readdir(DB_PATH);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(DB_PATH, file);
        try {
          const data = await fs.readFile(filePath, 'utf8');
          if (data.trim() === '') {
            await fs.writeFile(filePath, '[]');
            console.log(`Initialized empty database: ${file}`);
          }
        } catch (error) {
          await fs.writeFile(filePath, '[]');
          console.log(`Created new database file: ${file}`);
        }
      }
    }
    console.log('✅ Database files initialized');
  } catch (err) {
    console.error('❌ Database initialization failed', err);
  }
};
