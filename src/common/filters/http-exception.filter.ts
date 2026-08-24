import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/node';
import { ErrorCode } from '../enums';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        errorCode = (resp.code as ErrorCode) || (resp.errorCode as ErrorCode) || errorCode;
      } else {
        message = exception.message;
      }
    }

    // Report 5xx errors to Sentry
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setExtra('url', request?.url);
        scope.setExtra('method', request?.method);
        scope.setExtra('statusCode', status);
        Sentry.captureException(exception);
      });
      this.logger.error(`${request?.method} ${request?.url} ${status} — ${message}`);
      if (exception instanceof Error) {
        this.logger.error(exception.stack);
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
      },
      statusCode: status,
    });
  }
}
