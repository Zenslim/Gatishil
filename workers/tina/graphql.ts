import tinaConfig from "../../tina/config";

export interface Env {
  CONTENT: R2Bucket;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
  REVALIDATE_URL?: string;
  REVALIDATE_TOKEN?: string;
}

const CONTENT_PREFIX = "content/";
const MEDIA_PREFIX = "content/media/";

class R2Store {
  constructor(private bucket: R2Bucket, private prefix: string) {}

  private toKey(target: string) {
    const clean = target.replace(/^\/+/, "");
    return `${this.prefix}${clean}`.replace(/\\/g, "/");
  }

  async getItem(filePath: string) {
    const object = await this.bucket.get(this.toKey(filePath));
    if (!object) return null;
    return await object.text();
  }

  async putItem(filePath: string, contents: string) {
    await this.bucket.put(this.toKey(filePath), contents);
  }

  async deleteItem(filePath: string) {
    await this.bucket.delete(this.toKey(filePath));
  }

  async list(prefix = "") {
    const listed = await this.bucket.list({ prefix: this.toKey(prefix) });
    return listed.objects.map((obj) => obj.key.replace(this.prefix, ""));
  }
}

const handlerCache = new WeakMap<R2Bucket, Promise<any>>();

async function getGraphQLHandler(env: Env) {
  let cached = handlerCache.get(env.CONTENT);
  if (!cached) {
    cached = createHandler(env);
    handlerCache.set(env.CONTENT, cached);
  }
  return cached;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function createHandler(env: Env) {
  const [{ createDatalayer }] = await Promise.all([
    import("@tinacms/datalayer") as Promise<any>,
  ]);
  const { createAPIServer } = (await import("@tinacms/graphql")) as any;

  const datalayer = await createDatalayer({
    config: tinaConfig,
    database: new R2Store(env.CONTENT, CONTENT_PREFIX),
    mediaStore: new R2Store(env.CONTENT, MEDIA_PREFIX),
  } as any);

  const server = createAPIServer({
    config: tinaConfig,
    datalayer,
  } as any);

  return server;
}

function collectTouchedPaths(body: unknown, acc: Set<string>) {
  if (typeof body === "string") {
    if (/\.mdx?$/.test(body)) {
      acc.add(body);
    }
    return;
  }
  if (Array.isArray(body)) {
    body.forEach((entry) => collectTouchedPaths(entry, acc));
    return;
  }
  if (body && typeof body === "object") {
    Object.values(body).forEach((value) => collectTouchedPaths(value, acc));
  }
}

async function syncToGithub(env: Env, paths: Set<string>) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY || paths.size === 0) {
    return;
  }

  const branch = env.GITHUB_BRANCH ?? "main";
  const repo = env.GITHUB_REPOSITORY;

  await Promise.all(
    Array.from(paths).map(async (relativePath) => {
      const key = `${CONTENT_PREFIX}${relativePath}`;
      const object = await env.CONTENT.get(key);
      if (!object) return;
      const content = await object.arrayBuffer();
      const encoded = arrayBufferToBase64(content);

      const url = new URL(`https://api.github.com/repos/${repo}/contents/${key}`);
      const existing = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      });
      let sha: string | undefined;
      if (existing.ok) {
        const json = await existing.json();
        sha = json.sha;
      }

      await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `chore: sync ${relativePath}`,
          content: encoded,
          branch,
          sha,
        }),
      });
    })
  );
}

async function revalidate(env: Env) {
  if (!env.REVALIDATE_URL) return;
  await fetch(env.REVALIDATE_URL, {
    method: "POST",
    headers: {
      "X-Revalidate-Token": env.REVALIDATE_TOKEN ?? "",
    },
  }).catch(() => undefined);
}

async function handleMutationSideEffects(request: Request, env: Env) {
  try {
    const bodyText = await request.text();
    const parsed = JSON.parse(bodyText);
    const touched = new Set<string>();
    collectTouchedPaths(parsed?.variables, touched);
    await Promise.all([syncToGithub(env, touched), revalidate(env)]);
  } catch (error) {
    console.warn("[tina-worker] failed to run mutation side-effects", error);
  }
}

type WorkerContext = { waitUntil(promise: Promise<unknown>): void };

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext) {
    const handler = await getGraphQLHandler(env);
    const cloned = request.clone();

    const responder =
      typeof handler === "function"
        ? handler
        : typeof handler?.fetch === "function"
        ? handler.fetch.bind(handler)
        : null;

    if (!responder) {
      return new Response("Tina handler unavailable", { status: 500 });
    }

    const response = await responder(request);

    if (request.method === "POST") {
      ctx.waitUntil(handleMutationSideEffects(cloned, env));
    }

    return response;
  },
};
