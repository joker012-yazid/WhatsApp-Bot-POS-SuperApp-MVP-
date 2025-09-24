import IORedis from 'ioredis';

const TOKEN_BUCKET_SCRIPT = `
local bucketKey = KEYS[1]
local timestampKey = KEYS[2]
local minuteKey = KEYS[3]

local ratePerSecond = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local maxPerMinute = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local tokensRequested = tonumber(ARGV[5])

local tokens = tonumber(redis.call('get', bucketKey))
local lastRefill = tonumber(redis.call('get', timestampKey))

if tokens == nil then
  tokens = capacity
end

if lastRefill == nil then
  lastRefill = now
end

local deltaSeconds = math.max(0, (now - lastRefill) / 1000)
local refill = deltaSeconds * ratePerSecond
if refill > 0 then
  tokens = math.min(capacity, tokens + refill)
  lastRefill = now
end

if tokens < tokensRequested then
  return {0, tokens}
end

local minuteCount = tonumber(redis.call('get', minuteKey))
if minuteCount == nil then
  minuteCount = 0
end

if (minuteCount + tokensRequested) > maxPerMinute then
  return {0, tokens}
end

tokens = tokens - tokensRequested
redis.call('set', bucketKey, tokens, 'PX', math.ceil((capacity / ratePerSecond) * 2000))
redis.call('set', timestampKey, now, 'PX', 120000)
redis.call('set', minuteKey, minuteCount + tokensRequested, 'EX', 60)

return {1, tokens}
`;

export class TokenBucket {
  private scriptSha?: string;

  constructor(
    private readonly redis: IORedis.Redis,
    private readonly key: string,
    private readonly ratePerSecond: number,
    private readonly burst: number,
    private readonly maxPerMinute: number
  ) {}

  private async loadScript() {
    if (!this.scriptSha) {
      this.scriptSha = await this.redis.script('LOAD', TOKEN_BUCKET_SCRIPT);
    }
    return this.scriptSha;
  }

  async consume(tokens = 1) {
    const now = Date.now();
    const bucketKey = `${this.key}:bucket`;
    const timestampKey = `${this.key}:timestamp`;
    const minuteKey = `${this.key}:minute`;

    try {
      const sha = await this.loadScript();
      const [allowed] = (await this.redis.evalsha(
        sha,
        3,
        bucketKey,
        timestampKey,
        minuteKey,
        this.ratePerSecond,
        this.burst,
        this.maxPerMinute,
        now,
        tokens
      )) as unknown as [number, number];

      if (allowed !== 1) {
        throw new Error('Rate limit exceeded');
      }
    } catch (error) {
      if ((error as Error).message.includes('NOSCRIPT')) {
        this.scriptSha = undefined;
        return this.consume(tokens);
      }
      throw error;
    }
  }
}
