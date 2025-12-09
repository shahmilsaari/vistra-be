import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ensureError } from '../utils/errors';

type HttpErrorResponse = {
  message?: string | string[];
};

const isHttpErrorResponse = (value: unknown): value is HttpErrorResponse =>
  typeof value === 'object' && value !== null && 'message' in value;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? (exception.getStatus() as HttpStatus)
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const payload =
      typeof rawResponse === 'string'
        ? rawResponse
        : isHttpErrorResponse(rawResponse)
          ? rawResponse.message
          : undefined;

    const normalizedMessage =
      typeof payload === 'string'
        ? payload
        : Array.isArray(payload) && payload.length
          ? payload.join(', ')
          : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: normalizedMessage,
      ...(Array.isArray(payload) ? { errors: payload } : {}),
    };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('Internal Server Error:', ensureError(exception));
    }

    response.status(status).json(errorResponse);
  }
}
