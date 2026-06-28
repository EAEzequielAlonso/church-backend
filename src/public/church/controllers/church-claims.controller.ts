import { Body, Controller, Post, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { SubmitChurchClaimUseCase } from '../use-cases/church-claims/submit-church-claim.use-case';
import { PublicRateLimit } from '../../../core/auth/decorators/public-rate-limit.decorator';
import { CreateChurchClaimDto } from '../dto/church-claim/create-church-claim.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChurchClaim } from '../entities/church_claim.entity';
import { ChurchClaimStatus } from 'src/public/enums/public.enums';
import { ChurchClaimResponseDto } from '../dto/church-claim/church-claim-response.dto';

@Controller('public/claims')
export class ChurchClaimsController {
  constructor(
    private readonly submitUseCase: SubmitChurchClaimUseCase,
    @InjectRepository(ChurchClaim) private readonly claimsRepo: Repository<ChurchClaim>
  ) { }

  @Post('claim')
  @UseGuards(JwtAuthGuard, PublicRateLimit(5, 60))
  claim(@Req() req: any, @Body() dto: CreateChurchClaimDto) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.submitUseCase.execute(personId, dto);
  }

  @Get('my-claims')
  @UseGuards(JwtAuthGuard)
  async myClaims(@Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');

    const activeClaim = await this.claimsRepo.findOne({
      where: { 
        claimantPersonId: personId,
        status: In([ChurchClaimStatus.PENDING, ChurchClaimStatus.APPROVED])
      },
      relations: ['church', 'church.publicProfile'],
      order: { createdAt: 'DESC' }
    });

    return activeClaim ? ChurchClaimResponseDto.fromEntity(activeClaim) : null;
  }
}
