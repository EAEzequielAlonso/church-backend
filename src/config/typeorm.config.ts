import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './configuration';

const dbConfig = getDatabaseConfig() as any; // Cast to any to access generic properties for DataSource

export const AppDataSource = new DataSource({
    ...dbConfig,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    // TypeORM CLI specific overwrites if needed
    dropSchema: false,
});
