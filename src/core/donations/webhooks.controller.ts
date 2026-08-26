import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { MercadoPagoWebhookDto } from './dto/mercadopago-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('mercadopago')
  @HttpCode(200)
  async handleMercadoPagoWebhook(
    @Body() payload: MercadoPagoWebhookDto,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    // We pass the payload and signature headers to the service.
    // We always return 200 OK to Mercado Pago to acknowledge receipt.
    await this.donationsService.handleMercadoPagoWebhook(
      payload,
      signature,
      requestId,
    );
    return { received: true };
  }
}
