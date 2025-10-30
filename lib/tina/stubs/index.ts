export type TinaConfig = Record<string, unknown>;

export function defineConfig<T extends TinaConfig>(config: T): T {
  return config;
}
