declare module 'ioredis' {
  export default class Redis {
    constructor(options?: Record<string, unknown>);
    on(event: string, listener: (...args: any[]) => void): this;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<void>;
    del(...keys: string[]): Promise<void>;
    quit(): Promise<void>;
  }
}
