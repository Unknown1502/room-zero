import { defineAssets } from '@iwsdk/core';

// The chapter is built in code from the chapter content (src/world), and its sounds are loaded by path,
// so there is nothing to place from a manifest. This module must stay deterministic and side-effect free.
export default defineAssets({});
