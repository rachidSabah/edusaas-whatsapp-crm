// Database client using libsql directly (for Turso - Cloudflare Edge compatible)
import { createClient, type Client } from '@libsql/client/web';

/**
 * Get a database client with the provided credentials
 * This function should be called inside the request handler with credentials from Cloudflare's context
 */
export function getDb(databaseUrl: string, authToken: string): Client {
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL');
  }

  // Convert libsql:// to https:// for HTTP connections (libsql client needs https)
  const url = databaseUrl.startsWith('libsql://') 
    ? databaseUrl.replace('libsql://', 'https://')
    : databaseUrl;

  console.log('Connecting to Turso:', url);
  
  return createClient({
    url,
    authToken: authToken || '',
  });
}

// For backward compatibility with non-Edge environments
let _cachedDb: Client | null = null;

export function getDbFromEnv(): Client {
  if (_cachedDb) return _cachedDb;
  
  const tursoUrl = process.env.TURSO_DATABASE_URL || 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
  const tursoToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

  if (tursoUrl && tursoToken) {
    const url = tursoUrl.startsWith('libsql://') 
      ? tursoUrl.replace('libsql://', 'https://')
      : tursoUrl;
    _cachedDb = createClient({ url, authToken: tursoToken });
    return _cachedDb;
  }
  
  throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
}

export default { getDb, getDbFromEnv };
