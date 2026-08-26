import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Donation } from './entities/donation.entity';
import { CreateDonationPreferenceDto } from './dto/create-donation-preference.dto';
import { DonationStatus } from '../../common/enums';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { MercadoPagoWebhookDto } from './dto/mercadopago-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class DonationsService {
  private mpClient: MercadoPagoConfig;
  private readonly logger = new Logger(DonationsService.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN is not defined in the environment.');
    }
    this.mpClient = new MercadoPagoConfig({ accessToken });
    this.webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET');
  }

  async createPreference(userId: string, dto: CreateDonationPreferenceDto) {
    const donation = this.donationRepository.create({
      amount: dto.amount,
      status: DonationStatus.PENDING,
      userId,
    });
    const savedDonation = await this.donationRepository.save(donation);

    try {
      const preference = new Preference(this.mpClient);
      const backendUrl = this.configService.get<string>('backendPublicUrl');

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        throw new Error(
          'FRONTEND_URL environment variable is required to create a Mercado Pago preference',
        );
      }
      const mpResponse = await preference.create({
        body: {
          items: [
            {
              id: savedDonation.id,
              title: 'Apoyo a Telyon',
              quantity: 1,
              unit_price: Number(dto.amount),
              currency_id: 'ARS',
            },
          ],
          external_reference: savedDonation.id,
          back_urls: {
            success: `${frontendUrl.replace('http://localhost', 'https://localhost').replace('http://127.0.0.1', 'https://127.0.0.1')}/donations/success`,
            pending: `${frontendUrl.replace('http://localhost', 'https://localhost').replace('http://127.0.0.1', 'https://127.0.0.1')}/donations/pending`,
            failure: `${frontendUrl.replace('http://localhost', 'https://localhost').replace('http://127.0.0.1', 'https://127.0.0.1')}/donations/failure`,
          },
          auto_return: 'approved',
          ...(backendUrl && {
            notification_url: `${backendUrl}/webhooks/mercadopago`,
          }),
        },
      });

      return {
        donationId: savedDonation.id,
        initPoint: mpResponse.init_point,
        sandboxInitPoint: mpResponse.sandbox_init_point,
      };
    } catch (error) {
      this.logger.error('Error creating MP preference', error);
      await this.donationRepository.update(savedDonation.id, {
        status: DonationStatus.CANCELLED,
      });
      throw new InternalServerErrorException(
        'No se pudo generar la preferencia de Mercado Pago',
      );
    }
  }

  async handleMercadoPagoWebhook(
    payload: MercadoPagoWebhookDto,
    signature?: string,
    requestId?: string,
  ) {
    // Handle both MP action payload and legacy type payload
    const isPaymentEvent =
      payload.type === 'payment' ||
      (payload.action && payload.action.startsWith('payment.'));

    if (!isPaymentEvent) {
      return; // We only care about payment events
    }

    const dataId = payload.data?.id;
    if (!dataId) {
      return;
    }

    // Optional: Validate Signature if secret is configured
    if (this.webhookSecret && signature && requestId) {
      if (
        !this.isValidSignature(
          this.webhookSecret,
          signature,
          requestId,
          String(dataId),
        )
      ) {
        this.logger.warn(`Invalid signature for payment event ${dataId}`);
        // We still proceed with Pull strategy as the ultimate truth.
      }
    }

    // Pull strategy: Always query Mercado Pago to get the real status
    let paymentData;
    try {
      const payment = new Payment(this.mpClient);
      paymentData = await payment.get({ id: String(dataId) });
    } catch (err) {
      this.logger.error(`Could not fetch payment ${dataId} from MP`, err);
      return;
    }

    const donationId = paymentData.external_reference;
    if (!donationId) {
      return; // Not our donation
    }

    // Enforce idempotency and concurrency locks via TypeORM Transaction
    await this.dataSource.transaction(async (manager) => {
      const donation = await manager.findOne(Donation, {
        where: { id: donationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!donation) {
        this.logger.warn(
          `Donation ${donationId} not found for payment ${dataId}`,
        );
        return;
      }

      // Check if this specific payment ID was already processed and assigned to ANOTHER donation
      // (This is an edge case, but good for structural safety).
      const existingAssignment = await manager.findOne(Donation, {
        where: { externalPaymentId: String(dataId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (existingAssignment && existingAssignment.id !== donation.id) {
        this.logger.error(
          `Payment ${dataId} is already assigned to another donation!`,
        );
        return;
      }

      // Idempotency: Ignore if we already resolved it with this exact payment ID
      if (
        donation.externalPaymentId === String(dataId) &&
        (donation.status === DonationStatus.APPROVED ||
          donation.status === DonationStatus.REJECTED ||
          donation.status === DonationStatus.CANCELLED)
      ) {
        return;
      }

      // Status resolution
      let nextStatus = donation.status;
      const mpStatus = paymentData.status;

      if (mpStatus === 'approved') {
        nextStatus = DonationStatus.APPROVED;
      } else if (mpStatus === 'rejected') {
        nextStatus = DonationStatus.REJECTED;
      } else if (mpStatus === 'cancelled') {
        nextStatus = DonationStatus.CANCELLED;
      } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
        nextStatus = DonationStatus.PENDING;
      } else {
        // We do not assume rejection for unknown statuses, just stay pending.
        nextStatus = DonationStatus.PENDING;
      }

      donation.status = nextStatus;
      donation.externalPaymentId = String(dataId);
      await manager.save(donation);
      this.logger.log(`Donation ${donation.id} transitioned to ${nextStatus}`);
    });
  }

  private isValidSignature(
    secret: string,
    signatureHeader: string,
    requestId: string,
    dataId: string,
  ): boolean {
    try {
      const parts = signatureHeader.split(',');
      let ts = '';
      let hash = '';
      parts.forEach((part) => {
        const [k, v] = part.split('=');
        if (k === 'ts') ts = v;
        if (k === 'v1') hash = v;
      });

      if (!ts || !hash) return false;

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const computedHash = hmac.digest('hex');

      return computedHash === hash;
    } catch {
      return false;
    }
  }
}
