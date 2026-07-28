import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  Patch,
  Param,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../core/auth/guards/optional-jwt-auth.guard';
import { GetMapAggregatedNeedSignalsUseCase } from '../use-cases/get-map-aggregated-need-signals.use-case';
import { CreateOrUpdatePersonalNeedSignalUseCase } from '../use-cases/create-or-update-personal-need-signal.use-case';
import { ClosePersonalNeedSignalUseCase } from '../use-cases/close-personal-need-signal.use-case';
import { GetActivePersonalNeedSignalUseCase } from '../use-cases/get-active-personal-need-signal.use-case';
import { RecordNeedSignalContactAttemptUseCase } from '../use-cases/record-need-signal-contact-attempt.use-case';
import { AddNeedSignalInformationUseCase } from '../use-cases/add-need-signal-information.use-case';
import { ListNeedSignalInformationUseCase } from '../use-cases/list-need-signal-information.use-case';
import { GetNeedSignalMapSummaryUseCase } from '../use-cases/get-need-signal-map-summary.use-case';
import { GetLocationPublicNeedSignalsUseCase } from '../use-cases/get-location-public-need-signals.use-case';
import { ListReceivedContactRequestsUseCase } from '../use-cases/list-received-contact-requests.use-case';
import { ListSentContactRequestsUseCase } from '../use-cases/list-sent-contact-requests.use-case';
import { AcceptPersonalNeedSignalContactUseCase } from '../use-cases/accept-personal-need-signal-contact.use-case';
import { RejectPersonalNeedSignalContactUseCase } from '../use-cases/reject-personal-need-signal-contact.use-case';
import { GetNeedEngagementContactDetailsUseCase } from '../use-cases/get-need-engagement-contact-details.use-case';
import { CreateOrUpdateNeedSignalDto } from '../dto/need-signal.dto';
import { AddNeedInformationDto } from '../dto/church-need-signals/add-need-information.dto';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { NeedSignalResponseDto } from '../dto/need-signal-response.dto';

@Controller('public/need-signals')
export class NeedSignalsController {
  constructor(
    private readonly getMapAggregatedNeedSignalsUseCase: GetMapAggregatedNeedSignalsUseCase,
    private readonly createOrUpdatePersonalNeedSignalUseCase: CreateOrUpdatePersonalNeedSignalUseCase,
    private readonly closePersonalNeedSignalUseCase: ClosePersonalNeedSignalUseCase,
    private readonly getActivePersonalNeedSignalUseCase: GetActivePersonalNeedSignalUseCase,
    private readonly recordNeedSignalContactAttemptUseCase: RecordNeedSignalContactAttemptUseCase,
    private readonly addNeedSignalInformationUseCase: AddNeedSignalInformationUseCase,
    private readonly listNeedSignalInformationUseCase: ListNeedSignalInformationUseCase,
    private readonly getNeedSignalMapSummaryUseCase: GetNeedSignalMapSummaryUseCase,
    private readonly getLocationPublicNeedSignalsUseCase: GetLocationPublicNeedSignalsUseCase,
    private readonly listReceivedContactRequestsUseCase: ListReceivedContactRequestsUseCase,
    private readonly listSentContactRequestsUseCase: ListSentContactRequestsUseCase,
    private readonly acceptPersonalNeedSignalContactUseCase: AcceptPersonalNeedSignalContactUseCase,
    private readonly rejectPersonalNeedSignalContactUseCase: RejectPersonalNeedSignalContactUseCase,
    private readonly getNeedEngagementContactDetailsUseCase: GetNeedEngagementContactDetailsUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrUpdate(
    @Req() req: any,
    @Body() dto: CreateOrUpdateNeedSignalDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.createOrUpdatePersonalNeedSignalUseCase.execute(personId, dto);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  async closeSignal(@Req() req: any, @Param('id') id: string) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.closePersonalNeedSignalUseCase.execute(personId, id);
  }

  @Post(':id/contact')
  @UseGuards(JwtAuthGuard)
  async recordContact(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { method: string },
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.recordNeedSignalContactAttemptUseCase.execute(
      personId,
      id,
      body.method,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMySignals(@Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');

    const activeSignal =
      await this.getActivePersonalNeedSignalUseCase.execute(personId);
    return activeSignal ? NeedSignalResponseDto.fromEntity(activeSignal) : null;
  }

  @Get('me/received-contact-requests')
  @UseGuards(JwtAuthGuard)
  async getReceivedContactRequests(@Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.listReceivedContactRequestsUseCase.execute(personId);
  }

  @Get('me/sent-contact-requests')
  @UseGuards(JwtAuthGuard)
  async getSentContactRequests(@Req() req: any) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.listSentContactRequestsUseCase.execute(personId);
  }

  @Patch('engagements/:engagementId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptContactRequest(
    @Req() req: any,
    @Param('engagementId') engagementId: string,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.acceptPersonalNeedSignalContactUseCase.execute(
      personId,
      engagementId,
    );
  }

  @Patch('engagements/:engagementId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectContactRequest(
    @Req() req: any,
    @Param('engagementId') engagementId: string,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.rejectPersonalNeedSignalContactUseCase.execute(
      personId,
      engagementId,
    );
  }

  @Get('engagements/:engagementId/contact')
  @UseGuards(JwtAuthGuard)
  async getContactDetails(
    @Req() req: any,
    @Param('engagementId') engagementId: string,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.getNeedEngagementContactDetailsUseCase.execute(
      personId,
      engagementId,
    );
  }

  @Get('map')
  async getMapSignals() {
    return this.getMapAggregatedNeedSignalsUseCase.execute();
  }

  @Get('location/:locationId')
  @UseGuards(OptionalJwtAuthGuard)
  async getLocationSignals(
    @Req() req: any,
    @Param('locationId') locationId: string,
  ) {
    const personId = req.user?.personId;
    return this.getLocationPublicNeedSignalsUseCase.execute(
      locationId,
      personId,
    );
  }

  @Get(':id/map-summary')
  async mapSummary(@Param('id') id: string) {
    const result = await this.getNeedSignalMapSummaryUseCase.execute(id);
    if (!result) throw new NotFoundException('Need Signal not found');
    return result;
  }

  @Post(':id/information')
  @UseGuards(JwtAuthGuard)
  async addInformation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddNeedInformationDto,
  ) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Missing person context');
    return this.addNeedSignalInformationUseCase.execute(personId, id, dto);
  }

  @Get(':id/information')
  async listInformation(
    @Param('id') id: string,
    @Query() filterDto: InformationFilterDto,
  ) {
    return this.listNeedSignalInformationUseCase.execute(id, filterDto);
  }
}
