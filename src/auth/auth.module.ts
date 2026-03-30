import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { Auth0Strategy } from './strategies/auth0.strategy';
import { User } from '../users/entities/user.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { JoinRequest } from '../members/entities/join-request.entity';
import { UsersModule } from '../users/users.module';
import { Person } from 'src/users/entities/person.entity';
import { EmailService } from './email.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([User, Church, ChurchPerson, JoinRequest, Person]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' }, // Token valid for 7 days
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, Auth0Strategy, EmailService],
  exports: [AuthService, EmailService],
})
export class AuthModule {}
