import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initDb, all, get, run } from './src/db.js';

// Since we are running in Node with esbuild bundling to CommonJS for production,
// and we want it to run directly in dev with tsx, we handle standard path setups.
const STORAGE_DIR = path.join(process.cwd(), 'data', 'storage');

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Multer for uploads
// Files are temporarily saved to a temp directory, then moved to their corresponding bucket storage path
const uploadDir = path.join(process.cwd(), 'data', 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// -------------------------------------------------------------
// S3 REST APIs & MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// Helper to compute MD5 ETag
function getFileMD5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

// 1. Storage Analytics Endpoint
app.get('/api/s3/analytics', async (req, res) => {
  try {
    const stats = await get(`
      SELECT 
        (SELECT COUNT(*) FROM buckets) as bucketsCount,
        (SELECT COUNT(*) FROM objects) as objectsCount,
        (SELECT COALESCE(SUM(size), 0) FROM objects) as totalSize,
        (SELECT COUNT(*) FROM temporary_links WHERE datetime(expires_at) > datetime('now')) as activeLinksCount,
        (SELECT COALESCE(SUM(downloads_count), 0) FROM temporary_links) as totalDownloads
    `);

    const bucketDistribution = await all(`
      SELECT b.name, COUNT(o.id) as objectCount, COALESCE(SUM(o.size), 0) as totalBytes
      FROM buckets b
      LEFT JOIN objects o ON b.id = o.bucket_id
      GROUP BY b.id
    `);

    const mimeDistribution = await all(`
      SELECT mime_type as mimeType, COUNT(*) as count, COALESCE(SUM(size), 0) as totalBytes
      FROM objects
      GROUP BY mime_type
    `);

    const recentLogs = await all(`
      SELECT l.*, b.name as bucket_name, o.key as object_key
      FROM storage_logs l
      LEFT JOIN buckets b ON l.bucket_id = b.id
      LEFT JOIN objects o ON l.object_id = o.id
      ORDER BY l.timestamp DESC
      LIMIT 25
    `);

    // Storage growth trend simulation: group by date
    const storageTrend = await all(`
      SELECT DATE(created_at) as date, COUNT(*) as uploadCount, SUM(size) as bytesAdded
      FROM objects
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      stats,
      bucketDistribution,
      mimeDistribution,
      recentLogs,
      storageTrend
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch storage analytics', details: error.message });
  }
});

// 2. Buckets: List, Create, Delete
app.get('/api/s3/buckets', async (req, res) => {
  try {
    const bucketsList = await all(`
      SELECT b.*, 
             COUNT(o.id) as object_count, 
             COALESCE(SUM(o.size), 0) as total_size 
      FROM buckets b
      LEFT JOIN objects o ON b.id = o.bucket_id
      GROUP BY b.id
      ORDER BY b.name ASC
    `);
    res.json(bucketsList);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list buckets', details: error.message });
  }
});

app.post('/api/s3/buckets', async (req, res) => {
  const { name, region } = req.body;

  if (!name || typeof name !== 'string' || !name.match(/^[a-z0-9.-]{3,63}$/)) {
    return res.status(400).json({
      error: 'Invalid bucket name',
      message: 'Bucket name must be 3-63 characters, contain only lowercase letters, numbers, hyphens, and periods.'
    });
  }

  const bucketRegion = region || 'us-east-1';

  try {
    const existing = await get('SELECT id FROM buckets WHERE name = ?', [name]);
    if (existing) {
      return res.status(409).json({ error: 'BucketAlreadyExists', message: `Bucket "${name}" already exists.` });
    }

    const result = await run('INSERT INTO buckets (name, region) VALUES (?, ?)', [name, bucketRegion]);
    
    // Create physical storage folder for bucket
    const bucketDir = path.join(STORAGE_DIR, name);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    // Log event
    await run('INSERT INTO storage_logs (event_type, bucket_id, details) VALUES (?, ?, ?)', 
      ['bucket_create', result.lastID, `Bucket "${name}" created in region ${bucketRegion}`]
    );

    res.status(201).json({ id: result.lastID, name, region: bucketRegion, created_at: new Date() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create bucket', details: error.message });
  }
});

app.delete('/api/s3/buckets/:bucketName', async (req, res) => {
  const { bucketName } = req.params;

  try {
    const bucket = await get('SELECT id FROM buckets WHERE name = ?', [bucketName]);
    if (!bucket) {
      return res.status(404).json({ error: 'NoSuchBucket', message: `Bucket "${bucketName}" not found.` });
    }

    // Check if bucket has active objects
    const objectsCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM objects WHERE bucket_id = ?', [bucket.id]);
    if (objectsCount && objectsCount.count > 0) {
      return res.status(409).json({ 
        error: 'BucketNotEmpty', 
        message: 'The bucket you tried to delete is not empty. Please delete all objects first.' 
      });
    }

    // Delete bucket from database
    await run('DELETE FROM buckets WHERE id = ?', [bucket.id]);

    // Physically delete directory
    const bucketDir = path.join(STORAGE_DIR, bucketName);
    if (fs.existsSync(bucketDir)) {
      fs.rmSync(bucketDir, { recursive: true, force: true });
    }

    // Log event
    await run('INSERT INTO storage_logs (event_type, details) VALUES (?, ?)', 
      ['bucket_delete', `Bucket "${bucketName}" was deleted.`]
    );

    res.json({ message: `Bucket "${bucketName}" deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete bucket', details: error.message });
  }
});

// 3. Objects: List, Upload, Download, Delete, Restore
app.get('/api/s3/buckets/:bucketName/objects', async (req, res) => {
  const { bucketName } = req.params;
  const { prefix } = req.query; // S3 prefix filtering support!

  try {
    const bucket = await get('SELECT id FROM buckets WHERE name = ?', [bucketName]);
    if (!bucket) {
      return res.status(404).json({ error: 'NoSuchBucket', message: `Bucket "${bucketName}" not found.` });
    }

    let query = 'SELECT * FROM objects WHERE bucket_id = ?';
    const params: any[] = [bucket.id];

    if (prefix && typeof prefix === 'string') {
      query += ' AND key LIKE ?';
      params.push(`${prefix}%`);
    }

    query += ' ORDER BY created_at DESC';

    const objects = await all(query, params);
    res.json(objects);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list objects', details: error.message });
  }
});

// Create/Upload Object (supports Custom Metadata Headers like x-amz-meta-*)
app.post('/api/s3/buckets/:bucketName/objects', upload.single('file'), async (req, res) => {
  const { bucketName } = req.params;
  const { key, metadata } = req.body; // metadata should be a JSON string of key-value pairs

  if (!req.file) {
    return res.status(400).json({ error: 'MissingFile', message: 'No file was provided in the request.' });
  }

  const objectKey = key || req.file.originalname;

  try {
    const bucket = await get('SELECT id FROM buckets WHERE name = ?', [bucketName]);
    if (!bucket) {
      fs.unlinkSync(req.file.path); // remove temp file
      return res.status(404).json({ error: 'NoSuchBucket', message: `Bucket "${bucketName}" not found.` });
    }

    // Move file to final bucket storage
    const bucketDir = path.join(STORAGE_DIR, bucketName);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const destPath = path.join(bucketDir, safeFilename);
    fs.renameSync(req.file.path, destPath);

    // Compute MD5 ETag
    const md5Hash = await getFileMD5(destPath);

    // Check if key already exists in this bucket (S3 overwriting behavior)
    const existing = await get('SELECT id, storage_path FROM objects WHERE bucket_id = ? AND key = ?', [bucket.id, objectKey]);
    
    let objectId: number;

    if (existing) {
      // Overwrite: delete old physical file
      if (fs.existsSync(existing.storage_path)) {
        fs.unlinkSync(existing.storage_path);
      }
      
      await run(`
        UPDATE objects 
        SET filename = ?, size = ?, mime_type = ?, storage_path = ?, md5_etag = ?, lifecycle_status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [req.file.originalname, req.file.size, req.file.mimetype, destPath, md5Hash, existing.id]
      );
      objectId = existing.id;

      // Clean old metadata
      await run('DELETE FROM object_metadata WHERE object_id = ?', [objectId]);
    } else {
      // Insert new object
      const result = await run(`
        INSERT INTO objects (bucket_id, key, filename, size, mime_type, storage_path, md5_etag) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bucket.id, objectKey, req.file.originalname, req.file.size, req.file.mimetype, destPath, md5Hash]
      );
      objectId = result.lastID;
    }

    // Parse and save custom metadata (simulation of S3 custom header tags)
    if (metadata) {
      try {
        const parsedMeta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        for (const [k, v] of Object.entries(parsedMeta)) {
          // Normalize custom headers: always prepend x-amz-meta- if not present, and store cleanly
          const metaKey = k.toLowerCase().startsWith('x-amz-meta-') ? k : `X-Amz-Meta-${k}`;
          await run('INSERT OR REPLACE INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)', [objectId, metaKey, String(v)]);
        }
      } catch (e) {
        console.warn('Could not parse metadata object:', e);
      }
    }

    // Log event
    await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
      ['upload', bucket.id, objectId, `Object "${objectKey}" (${req.file.size} bytes) uploaded to bucket "${bucketName}"`]
    );

    res.status(201).json({
      message: 'Upload successful',
      objectId,
      bucket: bucketName,
      key: objectKey,
      filename: req.file.originalname,
      size: req.file.size,
      mime_type: req.file.mimetype,
      etag: md5Hash,
      status: 'active'
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload object', details: error.message });
  }
});

// Download Object
app.get('/api/s3/buckets/:bucketName/objects/:objectId/download', async (req, res) => {
  const { bucketName, objectId } = req.params;

  try {
    const object = await get('SELECT * FROM objects WHERE id = ?', [objectId]);
    if (!object) {
      return res.status(404).json({ error: 'NoSuchKey', message: 'The specified object does not exist.' });
    }

    if (object.lifecycle_status === 'archived') {
      return res.status(403).json({
        error: 'InvalidObjectState',
        message: 'The object is currently archived in Glacier simulated storage. Please initiate a restore first.'
      });
    }

    if (!fs.existsSync(object.storage_path)) {
      return res.status(410).json({ error: 'InternalFileNotFound', message: 'The backing storage file has been deleted or moved.' });
    }

    // Log the download event
    await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
      ['download', object.bucket_id, object.id, `Object "${object.key}" downloaded.`]
    );

    res.setHeader('Content-Type', object.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${object.filename}"`);
    res.setHeader('ETag', object.md5_etag);
    res.setHeader('Content-Length', object.size);
    fs.createReadStream(object.storage_path).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to download object', details: error.message });
  }
});

// Delete Object
app.delete('/api/s3/buckets/:bucketName/objects/:objectId', async (req, res) => {
  const { bucketName, objectId } = req.params;

  try {
    const object = await get('SELECT * FROM objects WHERE id = ?', [objectId]);
    if (!object) {
      return res.status(404).json({ error: 'NoSuchKey', message: 'The specified object does not exist.' });
    }

    // Delete record
    await run('DELETE FROM objects WHERE id = ?', [objectId]);

    // Physically delete file
    if (fs.existsSync(object.storage_path)) {
      fs.unlinkSync(object.storage_path);
    }

    // Log event
    await run('INSERT INTO storage_logs (event_type, bucket_id, details) VALUES (?, ?, ?)',
      ['delete', object.bucket_id, `Deleted object "${object.key}" from bucket "${bucketName}"`]
    );

    res.json({ message: `Object "${object.key}" deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete object', details: error.message });
  }
});

// Restore Archived Object (simulate transitioning back from Glacier/archived status)
app.post('/api/s3/buckets/:bucketName/objects/:objectId/restore', async (req, res) => {
  const { objectId } = req.params;

  try {
    const object = await get('SELECT * FROM objects WHERE id = ?', [objectId]);
    if (!object) {
      return res.status(404).json({ error: 'NoSuchKey', message: 'Object not found.' });
    }

    if (object.lifecycle_status !== 'archived') {
      return res.status(400).json({ error: 'InvalidRequest', message: 'Only archived objects can be restored.' });
    }

    await run("UPDATE objects SET lifecycle_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [objectId]);

    await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
      ['lifecycle', object.bucket_id, object.id, `Object "${object.key}" restored to active storage.`]
    );

    res.json({ message: `Object "${object.key}" restored successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to restore object', details: error.message });
  }
});

// 4. Custom Metadata: Get, Update
app.get('/api/s3/objects/:objectId/metadata', async (req, res) => {
  const { objectId } = req.params;

  try {
    const meta = await all('SELECT meta_key, meta_value FROM object_metadata WHERE object_id = ?', [objectId]);
    res.json(meta);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch metadata', details: error.message });
  }
});

app.post('/api/s3/objects/:objectId/metadata', async (req, res) => {
  const { objectId } = req.params;
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'InvalidPayload', message: 'Metadata key and value are required.' });
  }

  const metaKey = key.toLowerCase().startsWith('x-amz-meta-') ? key : `X-Amz-Meta-${key}`;

  try {
    const object = await get('SELECT id, bucket_id, key FROM objects WHERE id = ?', [objectId]);
    if (!object) {
      return res.status(404).json({ error: 'NoSuchKey', message: 'Object not found.' });
    }

    await run('INSERT OR REPLACE INTO object_metadata (object_id, meta_key, meta_value) VALUES (?, ?, ?)', [objectId, metaKey, String(value)]);

    await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
      ['metadata_update', object.bucket_id, object.id, `Updated metadata for "${object.key}": ${metaKey}=${value}`]
    );

    res.json({ message: 'Metadata updated successfully.', metaKey, metaValue: value });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update metadata', details: error.message });
  }
});

// 5. Temporary Shared Links (S3 Pre-signed URL Simulation)
app.post('/api/s3/objects/:objectId/share', async (req, res) => {
  const { objectId } = req.params;
  const { expiresInMinutes } = req.body; // e.g., 5, 60, 1440

  const duration = parseInt(expiresInMinutes, 10) || 60; // default 1 hour

  try {
    const object = await get('SELECT * FROM objects WHERE id = ?', [objectId]);
    if (!object) {
      return res.status(404).json({ error: 'NoSuchKey', message: 'Object not found.' });
    }

    if (object.lifecycle_status === 'archived') {
      return res.status(400).json({ error: 'InvalidState', message: 'Cannot generate a link for an archived object.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    await run('INSERT INTO temporary_links (object_id, token, expires_at) VALUES (?, ?, ?)', [objectId, token, expiresAt]);

    await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
      ['link_create', object.bucket_id, object.id, `Temporary link created for "${object.key}" expiring in ${duration} minutes`]
    );

    // Compute public share link URL
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const shareLink = `${appUrl}/api/share/${token}`;

    res.status(201).json({
      token,
      expires_at: expiresAt,
      share_link: shareLink,
      expires_in_minutes: duration
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate temporary link', details: error.message });
  }
});

// 6. Public share route - expirable, tracked public file download!
app.get('/api/share/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Find link
    const link = await get(`
      SELECT tl.*, o.filename, o.mime_type, o.storage_path, o.size, o.key, o.bucket_id, o.lifecycle_status
      FROM temporary_links tl
      JOIN objects o ON tl.object_id = o.id
      WHERE tl.token = ?
    `, [token]);

    if (!link) {
      return res.status(404).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f9fafb;">
            <div style="border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; background: white; max-width: 450px; text-align: center;">
              <h2 style="color: #ef4444; margin-top: 0;">Access Denied</h2>
              <p style="color: #4b5563;">The shared download link is invalid, malformed, or doesn't exist.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Check expiration (compare as UTC dates)
    const isExpired = new Date(link.expires_at).getTime() < Date.now();
    if (isExpired) {
      return res.status(410).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f9fafb;">
            <div style="border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; background: white; max-width: 450px; text-align: center;">
              <h2 style="color: #f59e0b; margin-top: 0;">Link Expired</h2>
              <p style="color: #4b5563;">This S3-presigned temporary download link has expired. It expired at:</p>
              <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; display: block; margin: 12px 0;">${link.expires_at} UTC</code>
              <p style="color: #9ca3af; font-size: 14px;">Please ask the bucket owner for a new link.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (link.lifecycle_status === 'archived') {
      return res.status(403).send('<h2>Forbidden</h2><p>This file is currently archived in Glacier storage.</p>');
    }

    if (!fs.existsSync(link.storage_path)) {
      return res.status(500).send('<h2>Internal Error</h2><p>The backing file could not be found on disk.</p>');
    }

    // Update download stats
    await run('UPDATE temporary_links SET downloads_count = downloads_count + 1 WHERE id = ?', [link.id]);

    // Log public access
    await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
      ['link_access', link.bucket_id, link.object_id, `Public temporary link used to download "${link.key}".`]
    );

    // Stream the file back
    res.setHeader('Content-Type', link.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${link.filename}"`);
    res.setHeader('Content-Length', link.size);
    fs.createReadStream(link.storage_path).pipe(res);
  } catch (error: any) {
    res.status(500).send(`<h2>Internal Server Error</h2><p>${error.message}</p>`);
  }
});

// 7. Lifecycle Policies: Fetch & Create
app.get('/api/s3/buckets/:bucketName/lifecycle', async (req, res) => {
  const { bucketName } = req.params;

  try {
    const bucket = await get('SELECT id FROM buckets WHERE name = ?', [bucketName]);
    if (!bucket) {
      return res.status(404).json({ error: 'NoSuchBucket', message: 'Bucket not found.' });
    }

    const policies = await all('SELECT * FROM lifecycle_policies WHERE bucket_id = ?', [bucket.id]);
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list lifecycle policies', details: error.message });
  }
});

app.post('/api/s3/buckets/:bucketName/lifecycle', async (req, res) => {
  const { bucketName } = req.params;
  const { prefix, daysToArchive, daysToDelete } = req.body;

  try {
    const bucket = await get('SELECT id FROM buckets WHERE name = ?', [bucketName]);
    if (!bucket) {
      return res.status(404).json({ error: 'NoSuchBucket', message: 'Bucket not found.' });
    }

    // Create policy
    const result = await run(`
      INSERT INTO lifecycle_policies (bucket_id, prefix, days_to_archive, days_to_delete)
      VALUES (?, ?, ?, ?)`,
      [bucket.id, prefix || null, daysToArchive || null, daysToDelete || null]
    );

    await run('INSERT INTO storage_logs (event_type, bucket_id, details) VALUES (?, ?, ?)',
      ['lifecycle_policy_add', bucket.id, `Created lifecycle policy rule for prefix "${prefix || '*'}"`]
    );

    res.status(201).json({
      id: result.lastID,
      bucket_id: bucket.id,
      prefix: prefix || null,
      days_to_archive: daysToArchive || null,
      days_to_delete: daysToDelete || null
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create policy', details: error.message });
  }
});

// 8. Trigger Lifecycle Sweep Manual Action
app.post('/api/s3/lifecycle/run', async (req, res) => {
  try {
    const policies = await all(`
      SELECT lp.*, b.name as bucket_name 
      FROM lifecycle_policies lp
      JOIN buckets b ON lp.bucket_id = b.id
    `);

    let totalArchived = 0;
    let totalDeleted = 0;

    for (const policy of policies) {
      const { bucket_id, prefix, days_to_archive, days_to_delete, bucket_name } = policy;

      // 1. Handle Transitions to Archived (Glacier)
      if (days_to_archive) {
        // Find active files in the bucket matching prefix and older than days_to_archive
        const archiveQuery = `
          SELECT * FROM objects 
          WHERE bucket_id = ? 
            AND lifecycle_status = 'active'
            AND (? IS NULL OR key LIKE ?)
            AND datetime(created_at, '+' || ? || ' days') < datetime('now')
        `;
        const archiveParams = [bucket_id, prefix || null, prefix ? `${prefix}%` : null, days_to_archive];
        const toArchive = await all(archiveQuery, archiveParams);

        for (const obj of toArchive) {
          await run("UPDATE objects SET lifecycle_status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [obj.id]);
          await run('INSERT INTO storage_logs (event_type, bucket_id, object_id, details) VALUES (?, ?, ?, ?)',
            ['lifecycle', bucket_id, obj.id, `Object transitioned to ARCHIVED state via policy (Rule: ${days_to_archive} days)`]
          );
          totalArchived++;
        }
      }

      // 2. Handle Auto-Deletions
      if (days_to_delete) {
        const deleteQuery = `
          SELECT * FROM objects 
          WHERE bucket_id = ? 
            AND (? IS NULL OR key LIKE ?)
            AND datetime(created_at, '+' || ? || ' days') < datetime('now')
        `;
        const deleteParams = [bucket_id, prefix || null, prefix ? `${prefix}%` : null, days_to_delete];
        const toDelete = await all(deleteQuery, deleteParams);

        for (const obj of toDelete) {
          // Delete record from DB
          await run('DELETE FROM objects WHERE id = ?', [obj.id]);
          // Physically delete from disk
          if (fs.existsSync(obj.storage_path)) {
            fs.unlinkSync(obj.storage_path);
          }

          await run('INSERT INTO storage_logs (event_type, bucket_id, details) VALUES (?, ?, ?)',
            ['lifecycle', bucket_id, `Object "${obj.key}" permanently DELETED via policy (Rule: ${days_to_delete} days)`]
          );
          totalDeleted++;
        }
      }
    }

    res.json({
      success: true,
      archivedCount: totalArchived,
      deletedCount: totalDeleted,
      message: `Lifecycle engine swept complete. Transitioned ${totalArchived} objects, deleted ${totalDeleted} objects.`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Lifecycle run failure', details: error.message });
  }
});

// 9. Simulate Passage of Time (Surgically age object keys to test lifecycle policies)
app.post('/api/s3/simulate-time', async (req, res) => {
  const { days } = req.body;
  const daysOffset = parseInt(days, 10);
  if (isNaN(daysOffset) || daysOffset <= 0) {
    return res.status(400).json({ error: 'InvalidRequest', message: 'Please specify a valid count of positive days to age.' });
  }

  try {
    // Subtract days from created_at in sqlite
    await run(`
      UPDATE objects 
      SET created_at = datetime(created_at, '-' || ? || ' days')
    `, [daysOffset]);

    // Also update logs to reflect simulated event
    await run('INSERT INTO storage_logs (event_type, details) VALUES (?, ?)',
      ['lifecycle', `SIMULATOR: Shifted time-offset backward by ${daysOffset} days for all object records.`]
    );

    res.json({
      success: true,
      message: `Successfully aged all object record timestamps backward by ${daysOffset} days. Ready for lifecycle evaluation.`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Simulation failure', details: error.message });
  }
});


// -------------------------------------------------------------
// VITE CLIENT INTEGRATION & PRODUCTION ASSETS
// -------------------------------------------------------------
async function startServer() {
  // Initialize Database before booting webserver
  await initDb();
  console.log('Database initialized successfully.');

  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Use Vite Middleware Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve Compiled Assets from /dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Object Storage Server is listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
