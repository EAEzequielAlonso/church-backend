import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Donation, DonationStatus } from './entities/donation.entity';
import { Church } from '../churches/entities/church.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DonationsService {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    @InjectRepository(Donation) private donationRepo: Repository<Donation>,
    @InjectRepository(Church) private churchRepo: Repository<Church>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (accessToken) {
      this.client = new MercadoPagoConfig({ accessToken: accessToken });
    } else {
      this.logger.warn('MP_ACCESS_TOKEN not found for DonationsModule');
    }
  }

  async createPreference(
    amount: number,
    userId: string,
    churchId: string,
    email: string,
  ) {
    if (!this.client) {
      throw new BadRequestException('Payment gateway not configured');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    const church = await this.churchRepo.findOneBy({ id: churchId });

    // Create Donation Record (Pending)
    const donation = this.donationRepo.create({
      amount,
      user: user || null,
      church: church || null,
      status: DonationStatus.PENDING,
    });
    await this.donationRepo.save(donation);

    const preference = new Preference(this.client);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .trim()
      .replace(/\/$/, '');

    try {
      const result = await preference.create({
        body: {
          items: [
            {
              id: `donation-${donation.id}`,
              title: 'Apoyo a la Visión - Ecclesia SaaS',
              quantity: 1,
              unit_price: Number(amount),
              currency_id: 'ARS',
              description:
                'Donación voluntaria para el desarrollo de la plataforma',
            },
          ],
          payer: {
            email: email || 'unknown@donor.com',
          },
          external_reference: donation.id,
          back_urls: {
            success: `${frontendUrl}/dashboard?donation=success`,
            failure: `${frontendUrl}/dashboard?donation=failure`,
            pending: `${frontendUrl}/dashboard?donation=pending`,
          },
          // auto_return: 'approved',
          statement_descriptor: 'ECCLESIA DONACION',
        },
      });

      // Save preference ID
      donation.externalReference = result.id;
      await this.donationRepo.save(donation);

      return {
        init_point: result.init_point,
        id: result.id,
      };
    } catch (error: any) {
      this.logger.error('MP Donation Error', error);
      throw new BadRequestException('Error al crear la solicitud de donación');
    }
  }
  async handleWebhook(id: string, topic: string) {
    if (topic !== 'payment') {
      return;
    }

    try {
      // Fetch Payment Data
      // We use the client we already have.
      // Method: client.payment.get({ id }) (using v2 syntax or just fetch)
      // Actually mercadopago v2 nodejs sdk uses: import { Payment } from 'mercadopago'; const payment = new Payment(client); payment.get({ id })

      // Dynamic import or use what we have.
      // We have MercadoPagoConfig. We need Payment class.
      const { Payment } = await import('mercadopago');
      const payment = new Payment(this.client);
      const paymentData = await payment.get({ id });

      if (!paymentData) return;

      const externalRef = paymentData.external_reference;
      const status = paymentData.status; // approved, pending, rejected

      if (!externalRef) return;

      const donation = await this.donationRepo.findOneBy({ id: externalRef });
      if (!donation) {
        this.logger.warn(
          `Donation not found for external_reference: ${externalRef}`,
        );
        return;
      }

      // Update Status
      let newStatus = DonationStatus.PENDING;
      if (status === 'approved') newStatus = DonationStatus.APPROVED;
      else if (status === 'rejected' || status === 'cancelled')
        newStatus = DonationStatus.REJECTED;

      if (donation.status !== newStatus) {
        donation.status = newStatus;
        // If we want to store the Payment ID, we could.
        // donation.externalReference = id; // Or keep preference ID?
        // Let's keep preference ID in externalReference or maybe use a new field?
        // Creating a new field 'paymentId' would be better but requires migration.
        // For MVP, we just update status.

        await this.donationRepo.save(donation);
        this.logger.log(
          `Donation ${donation.id} status updated to ${newStatus}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling webhook for payment ${id}`, error);
    }
  }
}
