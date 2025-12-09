import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface HttpResponseWithStatus {
  statusCode?: number;
}

const hasStatusCode = (value: unknown): value is HttpResponseWithStatus =>
  typeof value === 'object' && value !== null && 'statusCode' in value;

export interface TransformResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<TransformResponse<T>> {
    const httpResponse = context.switchToHttp().getResponse<HttpResponseWithStatus>();
    const statusCode = hasStatusCode(httpResponse) ? (httpResponse.statusCode ?? 200) : 200;

    return next.handle().pipe(
      map((data: T) => ({
        data,
        statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
