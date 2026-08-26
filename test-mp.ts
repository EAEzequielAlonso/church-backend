import { MercadoPagoConfig, Preference } from 'mercadopago';

async function run() {
  const mpClient = new MercadoPagoConfig({ accessToken: 'APP_USR-4498024442938406-010205-e12c43141478e61d45334039a08c424e-3102975027' });
  const preference = new Preference(mpClient);

  try {
    const res = await preference.create({
      body: {
        items: [{ id: 'test', title: 'Test', quantity: 1, unit_price: 100 }],
        back_urls: {
          success: 'http://127.0.0.1:3000/success',
          pending: 'http://127.0.0.1:3000/pending',
          failure: 'http://127.0.0.1:3000/failure',
        },
        auto_return: 'approved'
      }
    });
    console.log('Success:', res.id);
  } catch (err: any) {
    console.error('Error:', err.message, err.cause);
  }
}

run();
