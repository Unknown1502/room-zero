// Tests run the pure domain in Node. They deliberately do not load the IWSDK Vite plugin.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts', 'tests/model/**/*.test.ts'], environment: 'node' },
});