import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctrinalOpinion } from 'src/public/church/entities/doctrinal-opinion.entity';
import { CreateOrUpdateDoctrinalOpinionDto } from './dto/create-or-update-doctrinal-opinion.dto';
import { DoctrinalOpinionResponseDto } from './dto/doctrinal-opinion-response.dto';
import { EcosystemContributionsService } from 'src/public/ecosystem/services/ecosystem-contributions.service';
import { EcosystemActivitiesService } from 'src/public/ecosystem/services/ecosystem-activities.service';
import {
  EcosystemContributionType,
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from 'src/public/ecosystem/enums/ecosystem.enums';

@Injectable()
export class DoctrinalOpinionsService {
  constructor(
    @InjectRepository(DoctrinalOpinion)
    private readonly doctrinalOpinionRepo: Repository<DoctrinalOpinion>,
    private readonly ecosystemContributionsService: EcosystemContributionsService,
    private readonly ecosystemActivitiesService: EcosystemActivitiesService,
  ) {}

  async createOrUpdateOpinion(
    personId: string,
    churchId: string,
    dto: CreateOrUpdateDoctrinalOpinionDto,
  ): Promise<DoctrinalOpinionResponseDto> {
    let opinion = await this.doctrinalOpinionRepo.findOne({
      where: { personId, churchId },
    });

    let isNew = false;

    if (opinion) {
      opinion.opinion = dto.opinion;
      if (dto.comment !== undefined) {
        opinion.comment = dto.comment;
      }
      opinion.reviewedByAdmin = false; // Reset review status if updated
    } else {
      opinion = this.doctrinalOpinionRepo.create({
        personId,
        churchId,
        opinion: dto.opinion,
        comment: dto.comment,
      });
      isNew = true;
    }

    const savedOpinion = await this.doctrinalOpinionRepo.save(opinion);

    if (isNew) {
      await this.ecosystemContributionsService.recordContribution({
        actorPersonId: personId,
        targetChurchId: churchId,
        type: EcosystemContributionType.DOCTRINAL_OPINION_SUBMITTED,
      });

      await this.ecosystemActivitiesService.logActivity({
        actorPersonId: personId,
        relatedChurchId: churchId,
        activityType: EcosystemActivityType.DOCTRINAL_OPINION_ADDED,
        entityId: savedOpinion.id,
        entityType: EcosystemActivityEntityType.DOCTRINAL_OPINION,
      });
    }

    return DoctrinalOpinionResponseDto.fromEntity(savedOpinion);
  }

  async getMyOpinion(
    personId: string,
    churchId: string,
  ): Promise<DoctrinalOpinionResponseDto> {
    const opinion = await this.doctrinalOpinionRepo.findOne({
      where: { personId, churchId },
    });

    if (!opinion) {
      throw new NotFoundException('Opinion not found');
    }

    return DoctrinalOpinionResponseDto.fromEntity(opinion);
  }

  async getMyOpinions(personId: string): Promise<DoctrinalOpinionResponseDto[]> {
    const opinions = await this.doctrinalOpinionRepo.find({
      where: { personId },
      relations: ['church', 'church.publicProfile'],
      order: { createdAt: 'DESC' },
    });

    return opinions.map((o) => DoctrinalOpinionResponseDto.fromEntity(o));
  }

  async deleteMyOpinion(personId: string, churchId: string): Promise<void> {
    const opinion = await this.doctrinalOpinionRepo.findOne({
      where: { personId, churchId },
    });

    if (!opinion) {
      throw new NotFoundException('Opinion not found');
    }

    await this.doctrinalOpinionRepo.remove(opinion);
  }
}
