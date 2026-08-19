import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    join(__dirname, 'src/**/*.entity{.ts,.js}'),
    join(__dirname, 'src/**/*.entities{.ts,.js}')
  ],
  migrations: [
    join(__dirname, 'src/migrations/*{.ts,.js}')
  ],
  synchronize: false,
});
