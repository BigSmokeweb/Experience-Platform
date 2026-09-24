import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.MEDIA_SUPABASE_URL || 'https://mvsnmwznonupjypacswj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.MEDIA_SUPABASE_KEY || process.argv[2];
const BUCKET_NAME = 'catalog-images';
const LOCAL_IMAGES_DIR = 'C:\\Users\\Kunal\\Downloads\\catalog-images';

if (!SUPABASE_KEY) {
  console.error('Error: Please provide Supabase API key (service_role or anon) via process.env.SUPABASE_SECRET_KEY or command line argument:');
  console.error('  npx tsx scripts/upload-images-to-supabase.ts <SUPABASE_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else if (entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadFile(filePath: string, relativePath: string): Promise<boolean> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const storagePath = relativePath.replace(/\\/g, '/');
  
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error(`Failed to upload ${storagePath}:`, error.message);
    return false;
  }
  return true;
}

async function main() {
  console.log(`Scanning local images from: ${LOCAL_IMAGES_DIR}`);
  if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
    console.error(`Directory not found: ${LOCAL_IMAGES_DIR}`);
    process.exit(1);
  }

  const allFiles = await getAllFiles(LOCAL_IMAGES_DIR);
  console.log(`Found ${allFiles.length} images to upload.`);

  // Upload with concurrency pool of 10
  const CONCURRENCY = 10;
  let completed = 0;
  let failed = 0;
  const startTime = Date.now();

  const queue = [...allFiles];
  const workers = Array.from({ length: CONCURRENCY }, async (_, workerId) => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const relPath = path.relative(LOCAL_IMAGES_DIR, file);
      const success = await uploadFile(file, relPath);
      if (success) {
        completed++;
      } else {
        failed++;
      }

      if (completed % 50 === 0 || completed === allFiles.length) {
        const percent = ((completed / allFiles.length) * 100).toFixed(1);
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`[${completed}/${allFiles.length}] (${percent}%) - ${elapsedSec}s elapsed - Current: ${relPath}`);
      }
    }
  });

  await Promise.all(workers);
  console.log(`\nUpload finished! Total: ${allFiles.length}, Success: ${completed}, Failed: ${failed}`);
  console.log(`Public CDN Base URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);
}

main().catch(console.error);
