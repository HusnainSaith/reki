import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const requestId = randomUUID();
    const userAgent = req.get('user-agent') || '';
    const userId = req.user?.id || req.user?.sub || 'anonymous';

    req.requestId = requestId;

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${res.statusCode} ${duration}ms — user:${userId} — rid:${requestId}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${err.status || 500} ${duration}ms — user:${userId} — rid:${requestId} — ${err.message}`,
          );
        },
      }),
    );
  }
}
