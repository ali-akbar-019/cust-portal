import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Applied per-route (or globally via APP_GUARD) to require a valid JWT.
// Runs the 'jwt' strategy registered in JwtStrategy.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
