import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../../core/users/entities/person.entity';
import { PublicChurchRelation } from '../church/entities/public_church_relation.entity';
import { EcosystemContribution } from './entities/ecosystem-contribution.entity';
import { PublicPersonProfileDto } from './dto/public-person-profile.dto';
import { EcosystemContributionsService } from './services/ecosystem-contributions.service';

@Controller('public/people')
export class PublicPeopleController {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(PublicChurchRelation)
    private readonly churchRelationRepository: Repository<PublicChurchRelation>,
    @InjectRepository(EcosystemContribution)
    private readonly contributionRepository: Repository<EcosystemContribution>,
    private readonly contributionsService: EcosystemContributionsService,
  ) { }

  @Get(':slug')
  async getPublicProfile(@Param('slug') slug: string): Promise<PublicPersonProfileDto> {
    const person = await this.personRepository.findOne({
      where: { slug, isPublicProfileEnabled: true },
    });

    if (!person) {
      throw new NotFoundException('Public profile not found');
    }

    const relations = await this.churchRelationRepository.find({
      where: { personId: person.id },
      relations: ['church', 'church.publicProfile'],
    });

    let memberChurch = null;
    let visitorChurch = null;
    const followedChurches = [];

    for (const rel of relations) {
      if (!rel.church) continue;
      const churchData = {
        churchId: rel.church.id,
        name: rel.church.canonicalName,
        slug: rel.church.publicProfile?.slug,
        logoUrl: rel.church.publicProfile?.logoUrl,
        city: rel.church.publicProfile?.city,
        country: rel.church.publicProfile?.country,
      };

      if (rel.relationType === 'COMMUNITY_MEMBER') {
        memberChurch = churchData;
      } else if (rel.relationType === 'REGULAR_VISITOR') {
        visitorChurch = churchData;
      }
    }

    const contributionsCount = await this.contributionRepository.count({
      where: { actorPersonId: person.id },
    });

    const visibleContributions = await this.contributionsService.getAggregatedContributionsForPerson(person.id);

    return {
      slug: person.slug,
      avatarUrl: person.avatarUrl,
      firstName: person.firstName,
      lastName: person.lastName,
      city: person.city,
      country: person.country,
      createdAt: person.createdAt,
      memberChurch,
      visitorChurch,
      followedChurches,
      contributionsCount,
      visibleContributions,
    };
  }
}
