import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';

// Use Cases
import { CreateFamilyUseCase } from './use-cases/create-family.use-case';
import { UpdateFamilyUseCase } from './use-cases/update-family.use-case';
import { DeleteFamilyUseCase } from './use-cases/delete-family.use-case';
import { GetFamilyUseCase } from './use-cases/get-family.use-case';
import { ListFamiliesUseCase } from './use-cases/list-families.use-case';
import { AddFamilyMemberUseCase } from './use-cases/add-family-member.use-case';
import { RemoveFamilyMemberUseCase } from './use-cases/remove-family-member.use-case';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@Controller('families')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class FamiliesController {
  constructor(
    private readonly createFamilyUseCase: CreateFamilyUseCase,
    private readonly updateFamilyUseCase: UpdateFamilyUseCase,
    private readonly deleteFamilyUseCase: DeleteFamilyUseCase,
    private readonly getFamilyUseCase: GetFamilyUseCase,
    private readonly listFamiliesUseCase: ListFamiliesUseCase,
    private readonly addFamilyMemberUseCase: AddFamilyMemberUseCase,
    private readonly removeFamilyMemberUseCase: RemoveFamilyMemberUseCase,
  ) {}

  @Post()
  @RequirePermissions(AppPermission.FAMILY_CREATE)
  create(@Body() createFamilyDto: CreateFamilyDto, @CurrentChurch() churchId: string) {
    return this.createFamilyUseCase.execute(createFamilyDto, churchId);
  }

  @Get()
  @RequirePermissions(AppPermission.FAMILY_VIEW)
  findAll(@CurrentChurch() churchId: string) {
    return this.listFamiliesUseCase.execute(churchId);
  }

  @Get('my-family')
  @RequirePermissions(AppPermission.FAMILY_VIEW)
  findMyFamily(@CurrentUser() securityContext: SecurityContext) {
    if (!securityContext.churchPersonId) return null;
    return this.getFamilyUseCase.byMember(securityContext.churchPersonId);
  }

  @Get(':id')
  @RequirePermissions(AppPermission.FAMILY_VIEW)
  findOne(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.getFamilyUseCase.byId(id, churchId);
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.FAMILY_UPDATE)
  update(@Param('id') id: string, @Body() updateFamilyDto: UpdateFamilyDto, @CurrentChurch() churchId: string) {
    return this.updateFamilyUseCase.execute(id, updateFamilyDto, churchId);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.FAMILY_DELETE)
  remove(@Param('id') id: string, @CurrentChurch() churchId: string) {
    return this.deleteFamilyUseCase.execute(id, churchId);
  }

  @Post(':id/members')
  @RequirePermissions(AppPermission.FAMILY_MANAGE_MEMBERS)
  addMember(
    @Param('id') id: string,
    @Body() body: { memberId: string; role: string },
    @CurrentChurch() churchId: string
  ) {
    return this.addFamilyMemberUseCase.execute(id, body.memberId, body.role, churchId);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(AppPermission.FAMILY_MANAGE_MEMBERS)
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentChurch() churchId: string) {
    return this.removeFamilyMemberUseCase.execute(id, memberId, churchId);
  }
}
