import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type QueryVariables = {
  relativePath: string;
};

type HomePageResponse = {
  pages: Record<string, any>;
};

class TinaLocalClient {
  async requestPages(variables: QueryVariables) {
    const filePath = join(process.cwd(), 'content/pages', variables.relativePath);
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    return {
      data: { pages: data } as HomePageResponse,
      query: 'pagesDocument',
      variables,
    };
  }

  public readonly queries = {
    pages: (variables: QueryVariables) => this.requestPages(variables),
  };
}

export const client = new TinaLocalClient();
export type PagesQueryResponse = Awaited<ReturnType<TinaLocalClient['requestPages']>>;
