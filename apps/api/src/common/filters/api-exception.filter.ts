import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';

const STATUS_CODE_MAPPING: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
  [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE'
};

const ERROR_EXAMPLE = {
  code: 'VALIDATION_ERROR',
  message: 'Request validation failed',
  details: {
    errors: [
      {
        field: 'fieldName',
        constraints: ['must not be empty']
      }
    ]
  }
};

function isPrismaKnownError(error: unknown): error is { code: string; message: string } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; message?: unknown; constructor?: { name?: string }; name?: string };
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    (candidate.constructor?.name === 'PrismaClientKnownRequestError' || candidate.name === 'PrismaClientKnownRequestError')
  );
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request & { sanitizedLogPayload?: unknown }>();

    const { status, body } = this.buildErrorResponse(exception, request);

    httpAdapter.reply(response, body, status);
  }

  private buildErrorResponse(exception: unknown, request: Request | undefined) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = STATUS_CODE_MAPPING[status];
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_CODE_MAPPING[status] ?? `HTTP_${status}`;
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const res = response as Record<string, unknown>;
        message = (res.message as string) || message;
        if (res['code']) {
          code = String(res['code']);
        }
        details = res['details'] ?? res['message'] ?? res;
      } else {
        message = exception.message;
      }

      if (exception instanceof BadRequestException) {
        code = 'VALIDATION_ERROR';
        const responseBody = exception.getResponse();
        if (
          typeof responseBody === 'object' &&
          responseBody !== null &&
          'message' in responseBody &&
          Array.isArray((responseBody as Record<string, unknown>)['message'])
        ) {
          details = {
            errors: (responseBody as Record<string, unknown>)['message']
          };
        }
      }
    } else if (isPrismaKnownError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      code = `PRISMA_${exception.code}`;
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const timestamp = new Date().toISOString();
    const path = request?.url;

    return {
      status,
      body: {
        code,
        message,
        details,
        timestamp,
        path,
        example: ERROR_EXAMPLE,
        requestId: (request?.headers?.['x-request-id'] as string | undefined) ?? undefined
      }
    };
  }
}
