export default class IORedis {
  constructor(_options?: any) {}
  async get(_key?: string) {
    return null;
  }
  async set(_key: string, _value: string, _mode?: string, _ttl?: number) {
    return 'OK';
  }
  async del(..._keys: string[]) {
    return _keys.length;
  }
  async quit() {
    return 'OK';
  }
  multi() {
    return {
      zremrangebyscore: () => this.multi(),
      zadd: () => this.multi(),
      zcard: () => this.multi(),
      exec: async () => [null, null, [null, '0']]
    };
  }
}

export type Redis = IORedis;
