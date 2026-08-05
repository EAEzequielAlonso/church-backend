import { PartialType } from '@nestjs/mapped-types';
import { CreateMissionReportDto } from './create-mission-report.dto';

export class UpdateMissionReportDto extends PartialType(CreateMissionReportDto) {}
