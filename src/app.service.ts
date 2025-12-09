import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      status: 'ok',
      service: 'vistra-be',
      timestamp: new Date().toISOString(),
    };
  }
}
