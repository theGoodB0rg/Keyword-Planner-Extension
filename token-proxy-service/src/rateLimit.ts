import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';

const points = Number(process.env.RL_POINTS || 60); // 60 reqs
const duration = Number(process.env.RL_DURATION || 60); // per 60s

const limiter = new RateLimiterMemory({ points, duration });

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'anon';
  limiter.consume(key)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too Many Requests' }));
}
