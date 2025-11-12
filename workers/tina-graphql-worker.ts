import { createTinaHandler } from 'tinacms/graphql';
import { createSchema } from '@tinacms/schema-tools';
import type { ExecutionContext } from '@cloudflare/workers-types';
import tinaConfig from '../tina/config';

type Env = {
  GITHUB_TOKEN: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
  R2_BUCKET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
};

type TinaHandler = (
  request: Request,
  context?: { env: Env; executionCtx: ExecutionContext }
) => Promise<Response>;

const schema = createSchema(tinaConfig as any);

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tina-commit-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function buildHandler(env: Env): Promise<TinaHandler> {
  const [owner, repo] = (env.GITHUB_REPOSITORY ?? 'gatishil/GatishilNepal').split('/');
  const branch = env.GITHUB_BRANCH ?? (tinaConfig as any).branch ?? 'main';

  return createTinaHandler({
    config: tinaConfig as any,
    schema,
    context: {
      env: {
        github: {
          token: env.GITHUB_TOKEN,
          owner,
          repo,
          branch,
        },
        media: {
          r2: {
            bucket: env.R2_BUCKET,
            accountId: env.R2_ACCOUNT_ID,
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        },
      },
    },
  } as any);
}

export default {
  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/tina/graphql') {
      return withCors(
        new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const handler = await buildHandler(env);
      const response = await handler(request, { env, executionCtx });
      const type = response.headers.get('content-type');
      if (!type) {
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'application/json');
        return withCors(
          new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          })
        );
      }
      return withCors(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return withCors(
        new Response(
          JSON.stringify({ error: message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    }
  },
};
