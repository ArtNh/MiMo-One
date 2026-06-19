import fs from 'node:fs';

// Polyfill Bun-specific APIs for tests running in Node.js environment
(globalThis as any).Bun = {
  file: (filePath: string) => ({
    text: async () => fs.readFileSync(filePath, 'utf8'),
  }),
};
