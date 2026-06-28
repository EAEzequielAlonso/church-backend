import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuth0Guard extends AuthGuard('auth0') {
  getAuthenticateOptions(context: ExecutionContext) {
    return {
      connection: 'google-oauth2',
    };
  }
}
