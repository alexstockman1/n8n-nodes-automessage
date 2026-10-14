// Copy node icons into dist (tsc only moves .ts files).
// automessage.png = the official brand app-icon tile (256x256, from
// "AutoMessage Assets/ChatGPT Image May 11, 2025, 08_36_35 AM-modified.png",
// Alex-confirmed 2026-10-14 as THE marketplace logo).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const icon = join(root, 'nodes', 'AutoMessage', 'automessage.png');
for (const target of [
    join(root, 'dist', 'nodes', 'AutoMessage', 'automessage.png'),
    join(root, 'dist', 'nodes', 'AutoMessageTrigger', 'automessage.png'),
]) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(icon, target);
}
console.log('assets copied');
