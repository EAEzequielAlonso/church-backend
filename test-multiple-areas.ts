import { AppDataSource } from './src/config/typeorm.config';
import { UnreachedArea } from './src/public/need/entities/unreached-area.entity';
import { NeedLocation } from './src/public/need/entities/need-location.entity';
import { Person } from './src/core/users/entities/person.entity';
import { UnreachedAreaStatus } from './src/public/need/enums/need-signals.enum';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
  await AppDataSource.initialize();
  const repoArea = AppDataSource.getRepository(UnreachedArea);
  const repoLoc = AppDataSource.getRepository(NeedLocation);
  const repoPerson = AppDataSource.getRepository(Person);

  try {
    // 1. Create a dummy person
    let person = repoPerson.create({
      firstName: 'Test',
      lastName: 'Person',
      email: 'test-' + Date.now() + '@example.com',
    });
    person = await repoPerson.save(person);

    // 2. Create a dummy location
    let location = repoLoc.create({
      country: 'Test Country',
      state: 'Test State',
      city: 'Test City',
      latitude: 0,
      longitude: 0,
    });
    location = await repoLoc.save(location);

    // 3. Create Area 1
    let area1 = repoArea.create({
      title: 'Area 1',
      description: 'Test area 1',
      reporterPersonId: person.id,
      needLocationId: location.id,
      status: UnreachedAreaStatus.OPEN
    });
    area1 = await repoArea.save(area1);
    console.log('Successfully created Area 1:', area1.id);

    // 4. Create Area 2 with SAME person and SAME location
    let area2 = repoArea.create({
      title: 'Area 2',
      description: 'Test area 2',
      reporterPersonId: person.id,
      needLocationId: location.id,
      status: UnreachedAreaStatus.OPEN
    });
    area2 = await repoArea.save(area2);
    console.log('Successfully created Area 2 (same person and location):', area2.id);

    console.log('✅ TEST PASSED: Multiple areas can share the same reporter and location.');

    // Cleanup
    await repoArea.remove([area1, area2]);
    await repoLoc.remove(location);
    await repoPerson.remove(person);
    console.log('Cleanup completed.');
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
  } finally {
    await AppDataSource.destroy();
  }
}

runTest();
