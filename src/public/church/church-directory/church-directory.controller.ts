import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../../core/auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ChurchDirectoryService } from './services/church-directory.service';
import { CreatePublicChurchUseCase } from './use-cases/create-public-church.use-case';
import { ChurchDirectoryQueryDto } from './dto/church-directory-query.dto';
import { CreatePublicChurchDto } from './dto/create-public-church.dto';
import { MapViewportDto } from 'src/shared/dtos/map-viewport.dto';

@Controller('public/church-directory')
@UseGuards(OptionalJwtAuthGuard)
export class ChurchDirectoryController {
  constructor(
    private readonly directoryService: ChurchDirectoryService,
    private readonly createUseCase: CreatePublicChurchUseCase,
  ) {}

  @Get('map') mapMarkers(@Query() viewport: MapViewportDto) {
    return this.directoryService.mapMarkers(viewport);
  }

  @Get() find(@Query() query: ChurchDirectoryQueryDto) {
    return this.directoryService.find(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Requires a logged-in user to contribute
  create(
    @Body() dto: CreatePublicChurchDto,
    @Req() req: Request & { user: any },
  ) {
    return this.createUseCase.execute(dto, req.user.personId);
  }
}
