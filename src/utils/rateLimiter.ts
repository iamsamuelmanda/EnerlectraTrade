import { RateLimiterMemory } from 'rate-limiter-flexible';

// Production rate limiter configuration
const rateLimiter = new RateLimiterMemory({
  points: 100,    // 100 requests
  duration: 60,   // per 60 seconds (1 minute)
  blockDuration: 300 // Block for 5 minutes if exceeded
});

// More aggressive rate limiter for sensitive endpoints (device reporting)
const sensitiveLimiter = new RateLimiterMemory({
  points: 30,     // 30 requests
  duration: 60,   // per 60 seconds
  blockDuration: 600 // Block for 10 minutes if exceeded
});

/**
 * Consume rate limit points for an identifier
 * @param identifier - IP address, API key, or user ID
 * @param sensitive - Whether this is for a sensitive endpoint
 */
export const consumeRateLimit = async (identifier: string, sensitive: boolean = false): Promise<void> => {
  try {
    if (sensitive) {
      await sensitiveLimiter.consume(identifier);
    } else {
      await rateLimiter.consume(identifier);
    }
  } catch (rejRes: any) {
    if (rejRes instanceof Error) {
      throw rejRes;
    } else {
      const error = new Error('Rate limit exceeded');
      (error as any).statusCode = 429;
      (error as any).remainingPoints = rejRes.remainingPoints;
      (error as any).msBeforeNext = rejRes.msBeforeNext;
      throw error;
    }
  }
};

/**
 * Get rate limit info for an identifier
 */
export const getRateLimitInfo = async (identifier: string, sensitive: boolean = false) => {
  try {
    const limiter = sensitive ? sensitiveLimiter : rateLimiter;
    const res = await limiter.get(identifier);
    return {
      remainingPoints: res?.remainingPoints || 0,
      msBeforeNext: res?.msBeforeNext || 0,
      consumedPoints: res?.consumedPoints || 0
    };
  } catch (error) {
    return { remainingPoints: 0, msBeforeNext: 0, consumedPoints: 0 };
  }
};

/**
 * Middleware factory for rate limiting
 */
export const createRateLimitMiddleware = (options: { sensitive?: boolean } = {}) => {
  return async (req: any, res: any, next: any) => {
    const identifier = req.headers['x-api-key'] || req.ip || 'unknown';
    
    try {
      await consumeRateLimit(identifier, options.sensitive);
      
      // Add rate limit headers
      const info = await getRateLimitInfo(identifier, options.sensitive);
      res.setHeader('X-RateLimit-Limit', options.sensitive ? 30 : 100);
      res.setHeader('X-RateLimit-Remaining', info.remainingPoints);
      res.setHeader('X-RateLimit-Reset', Math.ceil(info.msBeforeNext / 1000));
      
      next();
    } catch (error: any) {
      if (error.statusCode === 429) {
        res.setHeader('Retry-After', Math.ceil(error.msBeforeNext / 1000));
        return res.status(429).json({
          status: 'error',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(error.msBeforeNext / 1000)
        });
      }
      next(error);
    }
  };
};

// Export rate limiter instances for direct use if needed
export { rateLimiter, sensitiveLimiter };