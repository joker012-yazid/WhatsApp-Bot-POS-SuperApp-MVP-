import createClient, { type ClientOptions, type FetchResponse, type Fetcher } from 'openapi-fetch';

export type Paginated<T> = {
  data: T[];
  total: number;
};

type Paths = {
  '/health': {
    get: {
      response: {
        200: {
          status: 'ok';
          gitSha: string;
        };
      };
    };
  };
  '/tickets': {
    get: {
      query?: {
        status?: string;
      };
      response: {
        200: Paginated<{
          id: string;
          subject: string;
          status: string;
        }>;
      };
    };
  };
};

export type ApiClient = Fetcher<Paths>;

export function createApiClient(options: ClientOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
  return createClient<Paths>({ baseUrl, ...options });
}

export type HealthResponse = FetchResponse<Paths['/health']['get']>;
