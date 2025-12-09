import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

type RequestWithCookies = Request & {
  cookies?: {
    accessToken?: string;
    [key: string]: string | undefined;
  };
};

const cookieExtractor = (request: RequestWithCookies) => request.cookies?.accessToken ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-me'),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
