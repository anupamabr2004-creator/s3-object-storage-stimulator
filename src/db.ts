import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'object_storage.db');
const STORAGE_DIR = path.join(process.cwd(), 'data', 'storage');

// Ensure directories exist
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Helper to query all rows
export function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Helper to query a single row
export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

// Helper to execute INSERT, UPDATE, DELETE
export function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Close database connection
export function close(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Initialize tables and seed mock data
export async function initDb() {
  db.serialize(() => {
    // 1. Buckets Table
    db.run(`
      CREATE TABLE IF NOT EXISTS buckets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        region TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Objects Table
    db.run(`
      CREATE TABLE IF NOT EXISTS objects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        filename TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        md5_etag TEXT NOT NULL,
        lifecycle_status TEXT DEFAULT 'active', -- 'active', 'archived', 'expired'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bucket_id) REFERENCES buckets(id) ON DELETE CASCADE,
        UNIQUE(bucket_id, key)
      )
    `);

    // 3. Object Metadata Table (Custom S3 tags/headers)
    db.run(`
      CREATE TABLE IF NOT EXISTS object_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_id INTEGER NOT NULL,
        meta_key TEXT NOT NULL,
        meta_value TEXT NOT NULL,
        FOREIGN KEY(object_id) REFERENCES objects(id) ON DELETE CASCADE,
        UNIQUE(object_id, meta_key)
      )
    `);

    // 4. Temporary Presigned Access Links
    db.run(`
      CREATE TABLE IF NOT EXISTS temporary_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        downloads_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(object_id) REFERENCES objects(id) ON DELETE CASCADE
      )
    `);

    // 5. Lifecycle Policies
    db.run(`
      CREATE TABLE IF NOT EXISTS lifecycle_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket_id INTEGER NOT NULL,
        prefix TEXT,
        days_to_archive INTEGER, -- Transition to archived status
        days_to_delete INTEGER,  -- Delete file automatically
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bucket_id) REFERENCES buckets(id) ON DELETE CASCADE
      )
    `);

    // 6. Storage Event Logs (Analytics)
    db.run(`
      CREATE TABLE IF NOT EXISTS storage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL, -- 'upload', 'download', 'delete', 'link_create', 'link_access', 'lifecycle'
        bucket_id INTEGER,
        object_id INTEGER,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  // Seed sample data if table is empty
  const bucketsCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM buckets');
  if (bucketsCount && bucketsCount.count === 0) {
    console.log('Seeding initial object storage database demo...');

    // Create default buckets
    await run(`INSERT INTO buckets (name, region) VALUES (?, ?)`, ['user-assets', 'us-east-1']);
    await run(`INSERT INTO buckets (name, region) VALUES (?, ?)`, ['production-logs', 'us-west-2']);
    await run(`INSERT INTO buckets (name, region) VALUES (?, ?)`, ['backup-db', 'eu-central-1']);

    const b1 = await get('SELECT id FROM buckets WHERE name = ?', ['user-assets']);
    const b2 = await get('SELECT id FROM buckets WHERE name = ?', ['production-logs']);
    const b3 = await get('SELECT id FROM buckets WHERE name = ?', ['backup-db']);

    if (b1 && b2 && b3) {
      // Create some virtual files and write dummy bytes to storage path to simulate real files
      const writeDummyFile = (bName: string, fName: string, content: string) => {
        const bDir = path.join(STORAGE_DIR, bName);
        if (!fs.existsSync(bDir)) fs.mkdirSync(bDir, { recursive: true });
        const filePath = path.join(bDir, fName);
        fs.writeFileSync(filePath, content);
        return filePath;
      };

      // Seed Objects
      const p1 = writeDummyFile('user-assets', 'avatar_primary.png', 'fake-png-binary-content-1');
      await run(`
        INSERT INTO objects (bucket_id, key, filename, size, mime_type, storage_path, md5_etag) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b1.id, 'images/avatar_primary.png', 'avatar_primary.png', 1048576, 'image/png', p1, '8f921a9987cf3c11e0a293']
      );

      const p2 = writeDummyFile('user-assets', 'landing_hero.jpg', 'fake-jpg-binary-content-2');
      await run(`
        INSERT INTO objects (bucket_id, key, filename, size, mime_type, storage_path, md5_etag) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b1.id, 'assets/landing_hero.jpg', 'landing_hero.jpg', 3145728, 'image/jpeg', p2, 'a551fb2788fa122bc1d198']
      );

      const p3 = writeDummyFile('production-logs', 'server_log_2026_07_17.txt', 'info: server boot up success\nwarn: slow db response');
      await run(`
        INSERT INTO objects (bucket_id, key, filename, size, mime_type, storage_path, md5_etag) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b2.id, 'logs/2026-07-17.log', 'server_log_2026_07_17.txt', 25600, 'text/plain', p3, '6cd0474347716f1f2e1dfa']
      );

      const p4 = writeDummyFile('backup-db', 'postgres_prod_dump.sql', '-- PostgreSQL database dump\n-- Dumped on 2026-07-18');
      await run(`
        INSERT INTO objects (bucket_id, key, filename, size, mime_type, storage_path, md5_etag) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b3.id, 'backups/postgres_prod_dump.sql', 'postgres_prod_dump.sql', 104857600, 'application/sql', p4, 'f9e011d87e0fa19fc3c18b']
      );

      // Seed metadata
      const obj1 = await get('SELECT id FROM objects WHERE key = ?', ['images/avatar_primary.png']);
      if (obj1) {
        await run(`INSERT INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)`, [obj1.id, 'X-Amz-Meta-Owner', 'Surjit Kumar']);
        await run(`INSERT INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)`, [obj1.id, 'X-Amz-Meta-Environment', 'Production']);
      }

      const obj2 = await get('SELECT id FROM objects WHERE key = ?', ['assets/landing_hero.jpg']);
      if (obj2) {
        await run(`INSERT INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)`, [obj2.id, 'X-Amz-Meta-Width', '1920']);
        await run(`INSERT INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)`, [obj2.id, 'X-Amz-Meta-Height', '1080']);
      }

      const obj3 = await get('SELECT id FROM objects WHERE key = ?', ['logs/2026-07-17.log']);
      if (obj3) {
        await run(`INSERT INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)`, [obj3.id, 'X-Amz-Meta-Service', 'GatewayServer']);
      }

      const obj4 = await get('SELECT id FROM objects WHERE key = ?', ['backups/postgres_prod_dump.sql']);

      // Seed lifecycle policy
      await run(`
        INSERT INTO lifecycle_policies (bucket_id, prefix, days_to_archive, days_to_delete)
        VALUES (?, ?, ?, ?)`, [b2.id, 'logs/', 7, 30]
      );
      await run(`
        INSERT INTO lifecycle_policies (bucket_id, prefix, days_to_archive, days_to_delete)
        VALUES (?, ?, ?, ?)`, [b3.id, 'backups/', 30, 90]
      );

      // Seed logs (Analytics)
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['upload', b1.id, obj1?.id || 1, 'File uploaded successfully']);
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['upload', b1.id, obj2?.id || 2, 'File uploaded successfully']);
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['upload', b2.id, obj3?.id || 3, 'File uploaded successfully']);
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['upload', b3.id, obj4?.id || 4, 'File uploaded successfully']);
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['download', b1.id, obj1?.id || 1, 'File downloaded']);
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['download', b1.id, obj1?.id || 1, 'File downloaded']);
      await run(`INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)`, ['download', b2.id, obj3?.id || 3, 'File downloaded']);
    }
  }
}
