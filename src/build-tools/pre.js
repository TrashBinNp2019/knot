import * as fs from 'fs';

if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true, force: true });
}