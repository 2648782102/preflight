const CLIENT_EXT = /\.(?:js|jsx|mjs|ts|tsx|vue|svelte|html|astro)$/;
const SERVER_PATH = /(?:^|\/)(?:api|server|scripts|functions|edge-functions|backend|migrations)\/|\.server\.|(?:^|\/)supabase\/functions\//;
const CLIENT_ROOTS = /^(?:src|app|pages|components|public|lib|static|assets|web|frontend|client)\//;

/** True for code that ends up in the browser or the app bundle. */
export function isClientFile(path) {
  if (!CLIENT_EXT.test(path) || SERVER_PATH.test(path)) return false;
  return CLIENT_ROOTS.test(path) || !path.includes('/');
}
