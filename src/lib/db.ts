// Database client using libsql directly (for Turso - Cloudflare Edge compatible)
import { createClient, type Client } from '@libsql/client/web';

// Default Turso credentials (used as fallback when env vars are not available)
const DEFAULT_TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

/**
 * Get a database client with the provided credentials
 * This function should be called inside the request handler with credentials from Cloudflare's context
 */
export function getDb(databaseUrl: string, authToken: string): Client {
  const url = databaseUrl || DEFAULT_TURSO_URL;
  const token = authToken || DEFAULT_TURSO_TOKEN;

  if (!url) {
    throw new Error('Missing DATABASE_URL');
  }

  // Convert libsql:// to https:// for HTTP connections (libsql client needs https)
  const httpsUrl = url.startsWith('libsql://') 
    ? url.replace('libsql://', 'https://')
    : url;

  console.log('Connecting to Turso:', httpsUrl);
  
  return createClient({
    url: httpsUrl,
    authToken: token || '',
  });
}

// For backward compatibility with non-Edge environments
let _cachedDb: Client | null = null;

export function getDbFromEnv(): Client {
  if (_cachedDb) return _cachedDb;
  
  const tursoUrl = process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_TOKEN;

  if (tursoUrl && tursoToken) {
    const url = tursoUrl.startsWith('libsql://') 
      ? tursoUrl.replace('libsql://', 'https://')
      : tursoUrl;
    _cachedDb = createClient({ url, authToken: tursoToken });
    return _cachedDb;
  }
  
  throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
}

// Get database credentials from environment or defaults
export function getDbCredentials() {
  return {
    url: process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL,
    token: process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_TOKEN,
  };
}

export default { getDb, getDbFromEnv, getDbCredentials };
