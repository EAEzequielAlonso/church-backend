import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import { PublicRateLimit } from '../../../core/auth/decorators/public-rate-limit.decorator';
import { IsOptional, IsString } from 'class-validator';
import { ViewportQueryDto } from './dto/viewport-query.dto';

class GeocodeChurchAddressDto {
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
}

@Controller('public/geo')
export class GeoController {
  constructor(private readonly geo: GeoService) { }

  @Post('geocode-church-address')
  @UseGuards(PublicRateLimit(20, 60))
  geocodeChurchAddress(@Body() body: GeocodeChurchAddressDto) { return this.geo.geocodeChurchAddress(body); }

  @Get('locations/autocomplete')
  @UseGuards(PublicRateLimit(50, 60))
  autocompleteLocations(@Query('query') query?: string) {
    return this.geo.autocompleteLocations(query);
  }

  @Get('viewport')
  @UseGuards(PublicRateLimit(30, 60))
  getViewport(@Query() query: ViewportQueryDto) {
    return this.geo.getViewport(query);
  }

  @Get('need-heatmap')
  @UseGuards(PublicRateLimit(30, 60))
  heatmap() { return this.geo.needHeatmap(); }
}
