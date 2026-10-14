// Copy icons into dist (tsc only moves .ts files).
// automessage.svg = the official brand app-icon tile wrapped in an SVG
// container (n8n's lint requires SVG icons; art is the Alex-confirmed tile).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const rel of [
    'nodes/AutoMessage/automessage.svg',
    'nodes/AutoMessageTrigger/automessage.svg',
    'credentials/automessage.svg',
]) {
    const target = join(root, 'dist', rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, rel), target);
}
console.log('assets copied');
