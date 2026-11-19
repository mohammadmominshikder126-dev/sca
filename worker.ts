interface AssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({ ok: true, mode: 'cloudflare-worker', timestamp: new Date().toISOString() }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    if (url.pathname === '/api/events') {
      // Return 204 so browser EventSource cleanly closes without MIME errors in static/worker mode
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'API route unavailable in static worker runtime; using client fallback.',
          fallback: true,
        }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    return env.ASSETS.fetch(request);
  },
};
