import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayersService } from './prayers.service';
import { PrayersController } from './prayers.controller';
import { PrayerRequest } from './entities/prayer-request.entity';
import { PrayerUpdate } from './entities/prayer-update.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrayerRequest, PrayerUpdate, ChurchPerson])],
    controllers: [PrayersController],
    providers: [PrayersService],
    exports: [PrayersService]
})
export class PrayersModule { }
