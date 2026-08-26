import { AppDataSource } from './src/config/typeorm.config';

async function check() {
  await AppDataSource.initialize();
  
  const queryRunner = AppDataSource.createQueryRunner();
  
  console.log('--- TABLES ---');
  const tables = await queryRunner.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'unreached_areas'
  `);
  console.log(tables);

  if (tables.length > 0) {
    console.log('\n--- CONSTRAINTS ---');
    const constraints = await queryRunner.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'unreached_areas'
    `);
    console.log(constraints);

    console.log('\n--- DATA COUNT ---');
    const count = await queryRunner.query(`SELECT COUNT(*) FROM unreached_areas`);
    console.log('Total unreached_areas:', count[0].count);
  } else {
    console.log('unreached_areas table does not exist. Is the DB synchronized?');
  }

  await AppDataSource.destroy();
}

check().catch(console.error);
