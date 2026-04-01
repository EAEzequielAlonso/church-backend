import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

// Load env vars if this file is imported outside of Nest context (e.g. CLI)
dotenv.config();

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  autoLoadEntities: true,
  //synchronize: true,
  //dropSchema: true,
  logging: false, // Set to true to debug queries
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,
});

export default () => ({
  database: getDatabaseConfig(),
});
