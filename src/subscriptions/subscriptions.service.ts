import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Payment as PaymentEntity } from './entities/payment.entity';
import { Church } from '../churches/entities/church.entity';
import { SubscriptionStatus } from '../common/enums';
import {
  getNowInTimezone,
  daysInMonth,
  getStartOfMonthUTC,
  getFirstOfNextMonthUTC,
  getGracePeriodEndUTC,
  localMidnightToUTC,
} from '../common/date.helpers';
import { ChurchPerson } from '../members/entities/church-person.entity';
@Injectable()
export class SubscriptionsService {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Plan) private planRep: Repository<Plan>,
    @InjectRepository(Subscription) private subRep: Repository<Subscription>,
    @InjectRepository(PaymentEntity) private payRep: Repository<PaymentEntity>,
    @InjectRepository(Church) private churchRep: Repository<Church>,
    @InjectRepository(ChurchPerson) private churchPersonRep: Repository<ChurchPerson>,
  ) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (accessToken) {
      this.client = new MercadoPagoConfig({ accessToken: accessToken });
    } else {
      this.logger.warn('MP_ACCESS_TOKEN not found');
    }
  }

  async seedPlans() {
    this.logger.log('Seeding/Updating default plans...');

    const plans = [
      {
        name: 'SEMILLA',
        description: 'Ideal para iglesias en sus primeros pasos',
        churchPersonLimit: 100,
        price: 40000,
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Hasta 100 personas asociadas',
          'Acceso completo a todas las funcionalidades',
          'Soporte estándar',
        ],
        isActive: true,
        isRecommended: false,
        isCustom: false,
        displayOrder: 1,
      },
      {
        name: 'CRECIMIENTO',
        description: 'Para iglesias en desarrollo',
        churchPersonLimit: 250,
        price: 70000,
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Hasta 250 personas asociadas',
          'Acceso completo a todas las funcionalidades',
          'Soporte estándar',
        ],
        isActive: true,
        isRecommended: true,
        isCustom: false,
        displayOrder: 2,
      },
      {
        name: 'EXPANSION',
        description: 'Para iglesias consolidadas',
        churchPersonLimit: 400,
        price: 100000,
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Hasta 400 personas asociadas',
          'Acceso completo a todas las funcionalidades',
          'Soporte prioritario',
        ],
        isActive: true,
        isRecommended: false,
        isCustom: false,
        displayOrder: 3,
      },
      {
        name: 'MULTIPLICACION',
        description: 'Para iglesias de gran alcance o múltiples sedes',
        churchPersonLimit: null, // 👈 importante
        price: 0, // 👈 se define externamente / contacto
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Personas asociadas ilimitadas',
          'Acceso completo a todas las funcionalidades',
          'Soporte prioritario',
          'Plan personalizado según necesidad',
        ],
        isActive: true,
        isRecommended: false,
        isCustom: true,
        displayOrder: 4,
      },
    ];

    for (const p of plans) {
      const existing = await this.planRep.findOne({ where: { name: p.name } });
      if (existing) {
        await this.planRep.update(existing.id, p);
      } else {
        await this.planRep.save(this.planRep.create(p));
      }
    }
    this.logger.log('Plans synced successfully');
  }

  async findAllPlans() {
    return this.planRep.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async createSubscriptionLink(
    churchId: string,
    planId: string,
    email: string,
  ) {
    if (!this.client) {
      throw new BadRequestException('Payment gateway not configured');
    }

    const church = await this.churchRep.findOne({ where: { id: churchId } });
    const plan = await this.planRep.findOne({ where: { id: planId } });

    if (!church || !plan)
      throw new NotFoundException('Church or Plan not found');

    if (plan.price === 0) {
      return this.activateFreeSubscription(church, plan);
    }

    // Doble cobro prevention: check if there's already an approved payment this month
    const tz = church.timezone || 'America/Argentina/Buenos_Aires';
    const now = new Date();
    const startOfMonth = getStartOfMonthUTC(tz);
    const endOfMonth = getFirstOfNextMonthUTC(tz); // first of next month = exclusive upper bound

    const sub = await this.subRep.findOne({ where: { churchId }, order: { createdAt: 'DESC' } });
    if (sub) {
       const existingPayment = await this.payRep.createQueryBuilder('payment')
         .where('payment.subscriptionId = :subId', { subId: sub.id })
         .andWhere('payment.status = :status', { status: 'approved' })
         .andWhere('payment.date >= :start', { start: startOfMonth })
         .andWhere('payment.date < :end', { end: endOfMonth })
         .getOne();
         
       if (existingPayment) {
          throw new BadRequestException('Este mes ya se encuentra abonado');
       }
    }

    // Calculate Prorating using church timezone
    const tzNow = getNowInTimezone(tz);
    const totalDaysInMonth = daysInMonth(tzNow.year, tzNow.month);
    const currentDay = tzNow.day;
    const remainingDays = totalDaysInMonth - currentDay + 1;
    
    // Prorated amount: (remaining / total) * price
    const proportionalAmount = Math.round((remainingDays / totalDaysInMonth) * Number(plan.price));
    
    // Month name in Spanish (no OS locale dependency)
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const capitalizedMonth = MESES[tzNow.month - 1];

    const preference = new Preference(this.client);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .trim()
      .replace(/\/$/, '');

    try {
      const body: any = {
        items: [
          {
            id: plan.name,
            title: `Plan ${plan.name} - Proporcional ${capitalizedMonth}`,
            quantity: 1,
            unit_price: proportionalAmount,
            currency_id: 'ARS',
            description: `Abono proporcional por los ${remainingDays} días de ${capitalizedMonth}`,
          },
        ],
        payer: {
          email: email.trim(),
        },
        external_reference: `${church.id}:${plan.id}`,
        metadata: {
          church_id: church.id,
          plan_id: plan.id,
        },
        back_urls: {
          success: `${frontendUrl}/payment/success`,
          failure: `${frontendUrl}/payment/failure`,
          pending: `${frontendUrl}/payment/pending`,
        },
        auto_return: 'approved',
      };

      const result = await preference.create({ body });

      return {
        init_point: result.init_point,
        id: result.id,
      };
    } catch (error: any) {
      this.logger.error('MP Preference Error', error);
      let msg = 'Error creating payment link';
      if (
        error.message?.includes(
          'payer and collector must be real or test users',
        )
      ) {
        msg =
          'No puedes pagar usando el mismo email que tu cuenta de MercadoPago (Vendedor). Intenta con otro email o usa una ventana de incógnito.';
      }
      throw new BadRequestException(msg);
    }
  }

  async cancelSubscription(churchId: string) {
    const sub = await this.subRep.findOne({
      where: { churchId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!sub) {
       throw new BadRequestException('No active subscription found');
    }

    sub.status = SubscriptionStatus.CANCELLED;
    await this.subRep.save(sub);
    return { success: true, message: 'Local subscription cancelled' };
  }

  async validatePayment(paymentId: string) {
    if (!this.client) {
      throw new BadRequestException('Payment gateway not configured');
    }

    const paymentClient = new Payment(this.client);
    try {
      const existingPayment = await this.payRep.findOne({
        where: { externalId: paymentId.toString() },
      });

      if (existingPayment) {
        return { success: true, message: 'Payment already processed' };
      }

      const payment = await paymentClient.get({ id: paymentId });
      
      if (payment.status !== 'approved') {
         return { success: false, status: payment.status };
      }

      let churchId, planId;
      if (payment.metadata?.church_id && payment.metadata?.plan_id) {
        churchId = payment.metadata.church_id;
        planId = payment.metadata.plan_id;
      } else if (payment.external_reference && payment.external_reference.includes(':')) {
        [churchId, planId] = payment.external_reference.split(':');
      }

      if (!churchId || !planId) {
         throw new Error('Missing metadata');
      }

      const church = await this.churchRep.findOne({ where: { id: churchId } });
      const plan = await this.planRep.findOne({ where: { id: planId } });

      if (!church || !plan) {
         throw new Error('Church or Plan not found');
      }

      if (Number(payment.transaction_amount) <= 0 && plan.price > 0) {
         throw new Error('Invalid payment amount');
      }

      let sub = await this.subRep.findOne({ 
        where: { churchId: church.id },
        order: { createdAt: 'DESC' } 
      });

      // ALIGN TO CALENDAR: nextPaymentDate = 1st of next month in church's timezone
      const tz = church.timezone || 'America/Argentina/Buenos_Aires';
      const nextPaymentDate = getFirstOfNextMonthUTC(tz);

      if (sub) {
        sub.plan = plan;
        sub.nextPaymentDate = nextPaymentDate;
        sub.status = SubscriptionStatus.ACTIVE;
        sub.mercadopagoId = paymentId.toString();
        await this.subRep.save(sub);
      } else {
        sub = this.subRep.create({
          church,
          plan,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          nextPaymentDate: nextPaymentDate,
          mercadopagoId: paymentId.toString(),
          payerEmail: payment.payer?.email || 'unknown',
        });
        await this.subRep.save(sub);
      }

      church.subscriptionStatus = SubscriptionStatus.ACTIVE;
      church.plan = plan.name as any;
      await this.churchRep.save(church);

      const logPayment = this.payRep.create({
        subscription: sub,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        status: 'approved',
        externalId: paymentId.toString(),
      });
      await this.payRep.save(logPayment);
      
      console.log('[MP] Payment validated:', paymentId);
      console.log('[MP] Subscription activated:', churchId);

      return { success: true, planName: plan.name };
    } catch (error) {
       this.logger.error(`Error validando pago ${paymentId}`, error);
       throw new BadRequestException('Hubo un problema validando el pago');
    }
  }

  async handleWebhook(body: any) {
    this.logger.log(`[WEBHOOK FULL PAYLOAD] ${JSON.stringify(body)}`);
    const type = body.type || body.topic;
    if (type === 'payment') {
      const paymentId = body.data?.id || body.resource?.split('/').pop();
      if (paymentId) {
        await this.validatePayment(paymentId);
      }
    }
    return { received: true };
  }

  private async activateFreeSubscription(church: Church, plan: Plan) {
    await this.subRep.update(
      { churchId: church.id, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELLED, endDate: new Date() },
    );

    const sub = this.subRep.create({
      church,
      plan,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      payerEmail: 'system@free.plan',
    });

    await this.subRep.save(sub);
    return { message: 'Free plan activated', subscription: sub };
  }

  async getCurrentSubscription(churchId: string) {
    const church = await this.churchRep.findOne({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const sub = await this.subRep.findOne({
      where: {
        churchId: churchId,
        status: SubscriptionStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
      relations: ['plan'],
    });

    return {
      church: {
        id: church.id,
        name: church.name,
      },
      subscription: sub ? {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        nextPaymentDate: sub.nextPaymentDate,
        mercadopagoId: sub.mercadopagoId,
      } : null,
      fallbackPlan: church.plan,
      fallbackStatus: church.subscriptionStatus,
    };
  }

  async getPayments(churchId: string) {
    return this.payRep.find({
      where: {
        subscription: {
          churchId: churchId,
        },
      },
      order: { date: 'DESC' },
      relations: ['subscription'],
    }).then(payments => payments.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      date: p.date,
      externalId: p.externalId,
    })));
  }

  async getChurchSubscriptionStatus(churchId: string) {
    const church = await this.churchRep.findOne({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const currentMembers = await this.churchPersonRep.count({ where: { churchId } });
    let recommendedPlan = null;
    const allPlans = await this.planRep.find({ where: { isActive: true }, order: { price: 'ASC' } });
    
    // Suggest the most affordable plan where churchPersonLimit >= currentMembers or limit is null (unlimited)
    for (const p of allPlans) {
       if (p.churchPersonLimit === null || p.churchPersonLimit >= currentMembers) {
           recommendedPlan = p;
           break;
       }
    }

    const sub = await this.subRep.findOne({
      where: { churchId },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    let status = church.subscriptionStatus;
    
    let isTrialExpired = false;
    if (church.trialEndsAt) {
      isTrialExpired = now > church.trialEndsAt;
    }

    let isSubscriptionExpired = false;
    let graceUntil = null;
    let warning = null;

    // Default basic status logic
    if (status === SubscriptionStatus.TRIAL && isTrialExpired) {
        status = SubscriptionStatus.EXPIRED;
    }

    if (sub && sub.status === SubscriptionStatus.CANCELLED) {
        status = SubscriptionStatus.EXPIRED;
    } else if (sub && sub.nextPaymentDate) {
        // Evaluate monthly cycle logic
        const tz = church.timezone || 'America/Argentina/Buenos_Aires';
        // Get month/year from the nextPaymentDate as seen in the church's timezone
        const npdParts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz, year: 'numeric', month: 'numeric',
        }).formatToParts(sub.nextPaymentDate);
        const targetMonth = parseInt(npdParts.find(p => p.type === 'month')!.value);
        const targetYear = parseInt(npdParts.find(p => p.type === 'year')!.value);
        graceUntil = getGracePeriodEndUTC(targetYear, targetMonth, tz);

        if (now > graceUntil) {
           isSubscriptionExpired = true;
           status = SubscriptionStatus.EXPIRED;
        } else if (now > sub.nextPaymentDate && now <= graceUntil) {
           status = SubscriptionStatus.PAYMENT_PENDING;
        } else {
           status = SubscriptionStatus.ACTIVE;
        }
    }

    // Days remaining calculations
    let daysRemaining = null;
    if (status === SubscriptionStatus.TRIAL && church.trialEndsAt) {
      daysRemaining = Math.max(0, Math.ceil((church.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      if (daysRemaining <= 3) {
        warning = 'TRIAL_EXPIRING';
      }
    } else if (status === SubscriptionStatus.PAYMENT_PENDING && graceUntil) {
      daysRemaining = Math.max(0, Math.ceil((graceUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      warning = 'PAYMENT_PENDING';
    } else if (status === SubscriptionStatus.ACTIVE && sub?.nextPaymentDate) {
      daysRemaining = Math.max(0, Math.ceil((sub.nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (status === SubscriptionStatus.EXPIRED) {
      daysRemaining = 0;
      warning = 'EXPIRED';
    }

    return {
      status,
      trialEndsAt: church.trialEndsAt,
      nextPaymentDate: sub?.nextPaymentDate || null,
      graceUntil,
      subscriptionEndsAt: sub?.nextPaymentDate || null,
      daysRemaining,
      warning,
      currentMembers,
      recommendedPlan,
    };
  }

  async getSubscriptionUsage(churchId: string) {
    const data = await this.getCurrentSubscription(churchId);
    let plan = data.subscription?.plan;
    
    if (!plan && data.fallbackPlan) {
      plan = await this.planRep.findOne({ where: { name: data.fallbackPlan } });
    }

    const statusData = await this.getChurchSubscriptionStatus(churchId);
    const limit = plan?.churchPersonLimit;
    const isUnlimited = limit === null || limit === undefined;
    const percentage = isUnlimited ? 0 : Math.min(100, Math.round((statusData.currentMembers / limit) * 100));

    return {
      currentMembers: statusData.currentMembers,
      limit: isUnlimited ? null : limit,
      percentage: percentage,
      planName: plan?.name || 'TRIAL',
      status: statusData.status,
      trialEndsAt: statusData.trialEndsAt,
      nextPaymentDate: statusData.nextPaymentDate,
      daysRemaining: statusData.daysRemaining,
      warning: statusData.warning,
      recommendedPlan: statusData.recommendedPlan
    };
  }
}
