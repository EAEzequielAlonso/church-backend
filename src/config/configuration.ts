import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

// Load env vars if this file is imported outside of Nest context (e.g. CLI)
dotenv.config();

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Enable for dev/POC as per user context. In prod, set to false.
  dropSchema: true,
  autoLoadEntities: true,
  logging: false, // Set to true to debug queries
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,
});

export default () => ({
  database: getDatabaseConfig(),
});
