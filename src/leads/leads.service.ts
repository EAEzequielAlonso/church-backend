import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, FindOptionsWhere } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    // Anti-spam check: same email in last 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentLead = await this.leadRepository.findOne({
      where: {
        email: createLeadDto.email,
        createdAt: MoreThan(oneMinuteAgo),
      },
    });

    if (recentLead) {
      throw new BadRequestException(
        'Please wait at least 1 minute before submitting another lead.',
      );
    }

    const lead = this.leadRepository.create(createLeadDto);
    return await this.leadRepository.save(lead);
  }

  async findAll(query: QueryLeadsDto) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Lead> = { isDeleted: false };
    if (status) {
      where.status = status;
    }

    const [data, total] = await this.leadRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOneBy({ id, isDeleted: false });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  async updateStatus(
    id: string,
    updateLeadStatusDto: UpdateLeadStatusDto,
  ): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.status = updateLeadStatusDto.status;
    return await this.leadRepository.save(lead);
  }

  async remove(id: string): Promise<void> {
    const lead = await this.findOne(id);
    lead.isDeleted = true;
    await this.leadRepository.save(lead);
  }
}
