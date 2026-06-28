import { Controller, Delete, Get, Param, Post, Body, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { PublicRelationsService } from '../services/public-relations.service';
import { CreatePublicRelationDto } from '../dto/create-public-relation.dto';
import { PublicRateLimit } from '../../../core/auth/decorators/public-rate-limit.decorator';

@Controller('public/relations')
@UseGuards(JwtAuthGuard)
export class PublicRelationsController {
  constructor(private readonly service: PublicRelationsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, PublicRateLimit(20, 60))
  create(@Req() req: any, @Body() dto: CreatePublicRelationDto) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.service.create(personId, dto);
  }

  @Get('my') my(@Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.service.my(personId);
  }

  @Delete(':id') remove(@Req() req: any, @Param('id') id: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.service.remove(personId, id);
  }
}
