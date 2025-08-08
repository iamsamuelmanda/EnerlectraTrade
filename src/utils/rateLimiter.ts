import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100,    // 100 requests
  duration: 60,   // per 60 seconds
});

export const consumeRateLimit = (ip: string) => {
  return rateLimiter.consume(ip);
};
