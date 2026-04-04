// Minimal test endpoint for Cloudflare Pages Edge Runtime
export const runtime = 'edge';

export async function GET() {
  return new Response('OK', {
    headers: { 'Content-Type': 'text/plain' }
  });
}
