import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_CDN_PREFIX = 'https://mvsnmwznonupjypacswj.supabase.co/storage/v1/object/public/catalog-images/';

const datasetPath = path.resolve(__dirname, '../../frontend/src/lib/catalog-dataset.json');

function main() {
  console.log(`Reading dataset from: ${datasetPath}`);
  const raw = fs.readFileSync(datasetPath, 'utf8');
  const dataset = JSON.parse(raw);

  let updatedCount = 0;

  for (const item of dataset) {
    if (item.cover && item.cover.startsWith('/catalog-images/')) {
      item.cover = item.cover.replace('/catalog-images/', SUPABASE_CDN_PREFIX);
    }
    if (Array.isArray(item.mediaUrls)) {
      item.mediaUrls = item.mediaUrls.map((url: string) => {
        if (url.startsWith('/catalog-images/')) {
          return url.replace('/catalog-images/', SUPABASE_CDN_PREFIX);
        }
        return url;
      });
    }
    updatedCount++;
  }

  // Backup original
  fs.writeFileSync(datasetPath + '.local-backup', raw, 'utf8');
  // Write updated
  fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf8');

  console.log(`Successfully updated ${updatedCount} experiences in dataset with Supabase CDN URLs!`);
  console.log(`Sample updated cover: ${dataset[0]?.cover}`);
}

main();
