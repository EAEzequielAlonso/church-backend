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

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Plan) private planRep: Repository<Plan>,
    @InjectRepository(Subscription) private subRep: Repository<Subscription>,
    @InjectRepository(PaymentEntity) private payRep: Repository<PaymentEntity>,
    @InjectRepository(Church) private churchRep: Repository<Church>,
  ) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (accessToken) {
      this.client = new MercadoPagoConfig({ accessToken: accessToken });
    } else {
      this.logger.warn('MP_ACCESS_TOKEN not found');
    }
  }

  async onModuleInit() {
    await this.seedPlans();
  }

  async seedPlans() {
    this.logger.log('Seeding/Updating default plans...');

    const plans = [
      {
        name: 'BASIC',
        description: 'Ideal para iglesias pequeñas o departamentos',
        price: 35000, // ARS
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Hasta 100 miembros',
          'Gestión de Células',
          'Finanzas Básicas',
          'App para miembros',
        ],
        isActive: true,
      },
      {
        name: 'PRO',
        description: 'Para iglesias en expansión',
        price: 65000, // ARS
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Hasta 500 miembros',
          'Gestión Financiera Avanzada',
          'Seguimiento de visitas',
          'Reportes PDF',
          'Soporte Prioritario',
        ],
        isActive: true,
      },
      {
        name: 'ELITE',
        description: 'La solución definitiva para grandes ministerios',
        price: 100000, // ARS
        currency: 'ARS',
        interval: 'MONTHLY',
        features: [
          'Miembros ilimitados',
          'Múltiples sedes',
          'API dedicada',
          'Asesor personalizado',
          'Bots con IA ilimitados',
        ],
        isActive: true,
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

    const preference = new Preference(this.client);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .trim()
      .replace(/\/$/, '');

    try {
      const body: any = {
        items: [
          {
            id: plan.name,
            title: `Plan ${plan.name} - Iglesia App`,
            quantity: 1,
            unit_price: Number(plan.price),
            currency_id: 'ARS',
            description: plan.description,
          },
        ],
        payer: {
          email: email.trim(),
        },
        external_reference: `${church.id}:${plan.id}`,
        back_urls: {
          success: `${frontendUrl}/subscription?status=success`,
          failure: `${frontendUrl}/subscription?status=failure`,
          pending: `${frontendUrl}/subscription?status=pending`,
        },
        // auto_return: 'approved', // Sometimes causes issues with localhost URLs
      };

      // Remove payer_email if it causes issues, but user code has it. We'll try to keep it but catch error if needed?
      // Actually, for Preference, passing email is usually fine and helps pre-fill.
      // The "Both payer and collector..." error is less strict on Preference usually since it's a checkout cart.
      // BUT if it fails, the user knows this flow works for them.

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

  async handleWebhook(body: any) {
    // Handling 'payment' topic as per user reference
    const type = body.type || body.topic;

    if (type === 'payment') {
      const paymentId = body.data?.id || body.resource?.split('/').pop();
      const paymentClient = new Payment(this.client);

      try {
        const payment = await paymentClient.get({ id: paymentId });
        this.logger.log(
          `[Webhook] Processing payment ${paymentId}. Status: ${payment.status}`,
        );

        if (payment.status === 'approved') {
          const externalRef = payment.external_reference;
          if (externalRef && externalRef.includes(':')) {
            const [churchId, planId] = externalRef.split(':');

            const church = await this.churchRep.findOne({
              where: { id: churchId },
            });
            const plan = await this.planRep.findOne({ where: { id: planId } });

            if (church && plan) {
              // Deactivate old active subscriptions
              await this.subRep.update(
                {
                  churchId: church.id,
                  status: SubscriptionStatus.ACTIVE,
                },
                { status: SubscriptionStatus.CANCELLED, endDate: new Date() },
              );

              const nextPaymentDate = new Date();
              nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // 30 days validity

              const sub = this.subRep.create({
                church,
                plan,
                status: SubscriptionStatus.ACTIVE,
                startDate: new Date(),
                nextPaymentDate: nextPaymentDate,
                mercadopagoId: paymentId.toString(),
                payerEmail: payment.payer?.email || 'unknown',
              });

              await this.subRep.save(sub);

              // Log payment
              const logPayment = this.payRep.create({
                subscription: sub,
                amount: payment.transaction_amount,
                currency: payment.currency_id,
                status: 'approved',
                externalId: paymentId.toString(),
              });
              await this.payRep.save(logPayment);

              this.logger.log(
                `[Webhook] Plan ${plan.name} activated for church ${church.name}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `[Webhook] Error processing payment ${paymentId}`,
          error,
        );
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
    const sub = await this.subRep.findOne({
      where: {
        churchId: churchId,
      },
      order: { createdAt: 'DESC' },
      relations: ['plan'],
    });

    if (!sub) return null;
    return sub;
  }
}
