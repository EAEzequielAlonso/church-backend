import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Church } from '../churches/entities/church.entity';
import { Payment } from '../subscriptions/entities/payment.entity';
import { Plan } from '../subscriptions/entities/plan.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Church)
    private readonly churchRepo: Repository<Church>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async getDashboardStats() {
    const totalUsers = await this.userRepo.count();
    const totalChurches = await this.churchRepo.count();
    
    // SUM Payment.amount (status = approved)
    const revenueResult = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'approved' })
      .getRawOne();
    
    const totalRevenue = parseFloat(revenueResult?.total || '0');

    // Group churches by plan
    const churchesByPlan = await this.churchRepo
      .createQueryBuilder('church')
      .select('church.plan', 'plan')
      .addSelect('COUNT(church.id)', 'count')
      .groupBy('church.plan')
      .getRawMany();

    // Calculate Estimated Monthly Revenue (MRR)
    const plans = await this.planRepo.find();
    const estimatedMonthlyRevenue = churchesByPlan.reduce((acc, item) => {
      const plan = plans.find(p => p.name === item.plan);
      if (plan && plan.price > 0) {
        return acc + (plan.price * parseInt(item.count, 10));
      }
      return acc;
    }, 0);

    return {
      totalUsers,
      totalChurches,
      totalRevenue,
      estimatedMonthlyRevenue,
      churchesByPlan: churchesByPlan.map(item => ({
        plan: item.plan,
        count: parseInt(item.count, 10),
      })),
    };
  }

  async getChurches() {
    return this.churchRepo.find({
      select: ['id', 'name', 'plan', 'subscriptionStatus'],
    });
  }

  async getUsers() {
    return this.userRepo.find({
      select: ['id', 'email', 'systemRole', 'createdAt'],
    });
  }

  async getPlans() {
    return this.planRepo.find({
      select: ['id', 'name', 'price', 'currency', 'interval', 'isActive'],
    });
  }

  async updatePlan(id: string, updateData: { price?: number; isActive?: boolean }) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    if (updateData.price !== undefined) plan.price = updateData.price;
    if (updateData.isActive !== undefined) plan.isActive = updateData.isActive;

    return this.planRepo.save(plan);
  }
}
