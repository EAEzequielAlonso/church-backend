import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Type,
  mixin,
} from '@nestjs/common';

type Bucket = { count: number; resetAt: number };
const BUCKETS = new Map<string, Bucket>();

export function PublicRateLimit(
  limit: number,
  windowSeconds: number,
): Type<CanActivate> {
  @Injectable()
  class PublicRateLimitGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const key = `${req.ip}:${req.route?.path ?? req.url}`;
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      const bucket = BUCKETS.get(key);
      if (!bucket || bucket.resetAt <= now) {
        BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (bucket.count >= limit)
        throw new HttpException('Rate limit exceeded', 429);
      bucket.count += 1;
      return true;
    }
  }

  return mixin(PublicRateLimitGuard);
}
