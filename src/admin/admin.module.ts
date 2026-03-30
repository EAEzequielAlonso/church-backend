import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Church } from '../churches/entities/church.entity';
import { Payment } from '../subscriptions/entities/payment.entity';
import { Plan } from '../subscriptions/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Church, Payment, Plan])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
