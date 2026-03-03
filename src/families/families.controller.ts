import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Use Cases
import { CreateFamilyUseCase } from './use-cases/create-family.use-case';
import { UpdateFamilyUseCase } from './use-cases/update-family.use-case';
import { DeleteFamilyUseCase } from './use-cases/delete-family.use-case';
import { GetFamilyUseCase } from './use-cases/get-family.use-case';
import { ListFamiliesUseCase } from './use-cases/list-families.use-case';
import { AddFamilyMemberUseCase } from './use-cases/add-family-member.use-case';
import { RemoveFamilyMemberUseCase } from './use-cases/remove-family-member.use-case';

@Controller('families')
@UseGuards(JwtAuthGuard)
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
  create(@Body() createFamilyDto: CreateFamilyDto, @Request() req) {
    return this.createFamilyUseCase.execute(createFamilyDto, req.user.churchId);
  }

  @Get()
  findAll(@Request() req) {
    return this.listFamiliesUseCase.execute(req.user.churchId);
  }

  @Get('my-family')
  findMyFamily(@Request() req) {
    if (!req.user.memberId) return null;
    return this.getFamilyUseCase.byMember(req.user.memberId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getFamilyUseCase.byId(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFamilyDto: UpdateFamilyDto) {
    return this.updateFamilyUseCase.execute(id, updateFamilyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteFamilyUseCase.execute(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { memberId: string; role: string },
  ) {
    return this.addFamilyMemberUseCase.execute(id, body.memberId, body.role);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.removeFamilyMemberUseCase.execute(id, memberId);
  }
}
