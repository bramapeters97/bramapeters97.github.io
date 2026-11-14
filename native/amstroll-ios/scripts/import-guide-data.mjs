import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const web = join(root, 'projects/amstroll/portfolio-embed');
const resources = join(root, 'native/amstroll-ios/Amstroll/Resources');
const raw = readFileSync(join(web, 'guide-data.js'), 'utf8');
const match = raw.match(/window\.AmstrollGuideData = ([\s\S]+);\s*$/);
if (!match) throw new Error('Missing web guide bundle');
const guide = JSON.parse(match[1]);
const photos = readFileSync(join(resources, 'photos.json'), 'utf8');
const metadata = Object.fromEntries(Object.entries(JSON.parse(photos)).filter(([key]) => !key.startsWith('guide-')));

function importPhoto(photo) {
  if (!photo) return;
  const source = basename(photo.src);
  const key = 'guide-' + basename(source, extname(source));
  const imageName = 'photo-' + key;
  const directory = join(resources, 'Assets.xcassets', imageName + '.imageset');
  mkdirSync(directory, { recursive: true });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', join(web, photo.src),
    '--out', join(directory, imageName + '.jpg')], { stdio: 'ignore' });
  writeFileSync(join(directory, 'Contents.json'), JSON.stringify({
    images: [{ filename: imageName + '.jpg', idiom: 'universal' }],
    info: { author: 'xcode', version: 1 },
  }, null, 2) + '\n');
  metadata[key] = { imageName, alt: photo.alt, credit: photo.credit, source: photo.sourceUrl,
    license: photo.license, licenseUrl: photo.licenseUrl,
    modifications: photo.modifications + ' Re-encoded as JPEG for iPhone.' };
  photo.key = key;
}

if (guide.places.some(place => !place.photo)) throw new Error('Every guide stop needs a photo');
importPhoto({
  src: 'hero/amsterdam-canals-portrait.webp',
  alt: 'Canal houses and water along Prinsengracht in Amsterdam.',
  credit: 'Diliff',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Amsterdam_Canals_-_July_2006.jpg',
  license: 'CC BY 2.5',
  licenseUrl: 'https://creativecommons.org/licenses/by/2.5/',
  modifications: 'Cropped and resized by Amstroll from the original photograph.',
});
metadata['guide-hero'] = metadata['guide-amsterdam-canals-portrait'];
delete metadata['guide-amsterdam-canals-portrait'];

for (const place of guide.places) {
  importPhoto(place.photo);
  importPhoto(place.thenAndNow?.then);
  importPhoto(place.thenAndNow?.now);
}
writeFileSync(join(resources, 'guide-data.json'), JSON.stringify(guide) + '\n');
writeFileSync(join(resources, 'photos.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log('Imported shared route and photo data for iPhone');
