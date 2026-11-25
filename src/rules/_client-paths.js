const CLIENT_EXT = /\.(?:js|jsx|mjs|ts|tsx|vue|svelte|html|astro)$/;
const SERVER_PATH = new RegExp([
  '(?:^|/)(?:api|server|servers|scripts|functions|edge-functions|backend|migrations|cron|workers)/',
  '\\.server\\.', '(?:^|/)\\+server\\.', '(?:^|/)\\+page\\.server\\.', '(?:^|/)route\\.(?:js|ts|mjs)$',
  '(?:^|/)middleware\\.', '(?:^|/)(?:next|nuxt|vite|astro|svelte|tailwind|postcss|webpack|babel|metro|jest|vitest|eslint)\\.config\\.',
  '(?:^|/)server\\.(?:js|ts|mjs|cjs)$', '(?:^|/)(?:actions|instrumentation)\\.(?:js|ts)$',
].join('|'));
const CLIENT_DIR = /(?:^|\/)(?:src|app|pages|components|public|lib|static|assets|web|frontend|client|screens|hooks|services|utils|views|features|store|context|navigation)\//;
const ROOT_CLIENT = /^(?:App|main|index)\.(?:jsx|tsx|ts|js|vue|svelte)$|\.html$/;

/**
 * True for code that ends up in the browser or the app bundle. Pass the file's
 * text to also honour a 'use server' directive.
 */
export function isClientFile(path, text = '') {
  if (!CLIENT_EXT.test(path) || SERVER_PATH.test(path)) return false;
  if (/^\s*['"]use server['"]/.test(text)) return false;
  return path.includes('/') ? CLIENT_DIR.test(path) : ROOT_CLIENT.test(path);
}
