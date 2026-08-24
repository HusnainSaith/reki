import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

export const CACHE_TTL_KEY = 'cache_ttl';
export const NO_CACHE_KEY = 'no_cache';

/**
 * Decorator to set cache TTL (in seconds) on a route handler.
 * Usage: @CacheTTL(300) → Cache-Control: max-age=300
 */
export const CacheTTL = (seconds: number) => SetMetadata(CACHE_TTL_KEY, seconds);

/**
 * Decorator to disable caching on a route handler.
 * Usage: @NoCache()
 */
export const NoCache = () => SetMetadata(NO_CACHE_KEY, true);

@Injectable()
export class CacheHeadersInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const noCache = this.reflector.get<boolean>(NO_CACHE_KEY, context.getHandler());
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());

    return next.handle().pipe(
      tap((data) => {
        // Skip SSE and WebSocket responses
        if (!res.setHeader) return;

        // X-Data-Freshness header on all responses
        res.setHeader('X-Data-Freshness', 'live');

        if (noCache) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          return;
        }

        // Generate ETag from response data
        const body = JSON.stringify(data);
        const etag = `"${crypto.createHash('md5').update(body).digest('hex')}"`;
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', new Date().toUTCString());

        // Check If-None-Match → 304 Not Modified
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
          res.status(304);
          return;
        }

        if (ttl) {
          res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        } else {
          // Default: 60 seconds
          res.setHeader('Cache-Control', 'public, max-age=60');
        }
      }),
    );
  }
}
