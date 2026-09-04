import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Req,
  UnauthorizedException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ChurchPublicAdminService } from '../services/church-public-admin.service';
import { UpdatePublicChurchProfileDto } from '../dto/update-public-church-profile.dto';
import { ManagePublicRelationUseCase } from '../use-cases/manage-public-relation.use-case';
import { UpdatePublicChurchProfileUseCase } from '../use-cases/update-public-church-profile.use-case';

@Controller('public/admin')
@UseGuards(JwtAuthGuard)
export class ChurchPublicAdminController {
  constructor(
    private readonly service: ChurchPublicAdminService,
    private readonly manageRelationUseCase: ManagePublicRelationUseCase,
    private readonly updateProfileUseCase: UpdatePublicChurchProfileUseCase,
  ) {}
  private personId(req: any) {
    const id = req.user?.personId;
    if (!id) throw new UnauthorizedException('Missing person context');
    return id;
  }

  @Get('my-churches') myChurches(@Req() req: any) {
    return this.service.myChurches(this.personId(req));
  }
  @Get('dashboard/:churchId') dashboard(
    @Req() req: any,
    @Param('churchId') churchId: string,
  ) {
    return this.service.dashboard(this.personId(req), churchId);
  }
  @Get('dashboard/:churchId/activity') activity(
    @Req() req: any,
    @Param('churchId') churchId: string,
  ) {
    return this.service.activity(this.personId(req), churchId);
  }
  @Get('relations/:churchId/pending') pending(
    @Req() req: any,
    @Param('churchId') churchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.service.listPending(this.personId(req), churchId, p, l);
  }
  @Post('relations/:id/approve') approve(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.manageRelationUseCase.approve(this.personId(req), id);
  }
  @Post('relations/:id/reject') reject(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.manageRelationUseCase.reject(this.personId(req), id);
  }
  @Delete('relations/:id') remove(@Req() req: any, @Param('id') id: string) {
    return this.manageRelationUseCase.remove(this.personId(req), id);
  }
  @Get('relations/:churchId/community') community(
    @Req() req: any,
    @Param('churchId') churchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.service.listCommunity(
      this.personId(req),
      churchId,
      p,
      l,
      search,
      type as any,
    );
  }
  @Patch('relations/:id/ecclesial-role') updateRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { role: string },
  ) {
    return this.manageRelationUseCase.updateEcclesialRole(
      this.personId(req),
      id,
      dto.role,
    );
  }

  @Patch('relations/:id/make-admin') makeAdmin(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.manageRelationUseCase.makeAdmin(this.personId(req), id);
  }

  @Patch('relations/:id/remove-admin') removeAdmin(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.manageRelationUseCase.removeAdmin(this.personId(req), id);
  }
  @Get('church-profile/:churchId') getProfile(
    @Req() req: any,
    @Param('churchId') churchId: string,
  ) {
    return this.service.getProfileForAdmin(this.personId(req), churchId);
  }

  @Get('church-profile/:churchId/slug/check')
  checkSlug(
    @Req() req: any,
    @Param('churchId') churchId: string,
    @Query('slug') slug: string,
  ) {
    return this.service.checkSlug(this.personId(req), churchId, slug);
  }


  @Patch('church-profile/:churchId') patch(
    @Req() req: any,
    @Param('churchId') churchId: string,
    @Body() dto: UpdatePublicChurchProfileDto,
  ) {
    return this.updateProfileUseCase.execute(this.personId(req), churchId, dto);
  }
}
