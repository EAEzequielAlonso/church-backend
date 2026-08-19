import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

// Load env vars if this file is imported outside of Nest context (e.g. CLI)
dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    __dirname + '/../**/*.entity{.ts,.js}',
    __dirname + '/../**/*.entities{.ts,.js}',
  ],
  autoLoadEntities: true,
  logging: false, // Set to true to debug queries
  synchronize: true,
  //dropSchema: true,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,
  extra: {
    max: toNumber(process.env.DB_POOL_MAX, 3),
    idleTimeoutMillis: toNumber(process.env.DB_IDLE_TIMEOUT_MS, 10000),
    connectionTimeoutMillis: toNumber(
      process.env.DB_CONNECTION_TIMEOUT_MS,
      5000,
    ),
  },
});

export default () => ({
  database: getDatabaseConfig(),
});
