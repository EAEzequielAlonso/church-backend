import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-auth0';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(configService: ConfigService) {
    super({
      domain: configService
        .get<string>('AUTH0_ISSUER_URL')
        .replace('https://', '')
        .replace('/', ''),
      clientID: configService.get<string>('AUTH0_CLIENT_ID'),
      clientSecret: configService.get<string>('AUTH0_CLIENT_SECRET'),
      callbackURL: 'http://localhost:3003/auth/auth0/callback',
      state: false,
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: any,
    done: Function,
  ): Promise<any> {
    // profile contains user info
    // We pass it to the request handler
    return done(null, profile);
  }
}
