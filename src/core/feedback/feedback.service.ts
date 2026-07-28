import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackStatus } from './enums/feedback.enums';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    userId: string,
    churchId: string | null,
  ): Promise<Feedback> {
    // 1. Anti-spam check: 1 per 30 seconds
    const lastFeedback = await this.feedbackRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (lastFeedback) {
      const now = new Date();
      const lastCreated = new Date(lastFeedback.createdAt);
      const diffInSeconds = (now.getTime() - lastCreated.getTime()) / 1000;

      if (diffInSeconds < 30) {
        throw new HttpException(
          'Por favor, espera 30 segundos antes de enviar otro comentario.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Create entity
    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      userId,
    });

    // 3. Save
    return await this.feedbackRepository.save(feedback);
  }

  async findAll(queryDto: FeedbackQueryDto) {
    const { status, type, module, page, limit } = queryDto;

    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback');

    // Filters
    if (status) {
      queryBuilder.andWhere('feedback.status = :status', { status });
    }
    if (type) {
      queryBuilder.andWhere('feedback.type = :type', { type });
    }
    if (module) {
      queryBuilder.andWhere('feedback.module = :module', { module });
    }

    // Fixed order: createdAt DESC
    queryBuilder.orderBy('feedback.createdAt', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      limit,
    };
  }

  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback with id ${id} not found`);
    }
    return feedback;
  }

  async update(id: string, updateDto: UpdateFeedbackDto): Promise<Feedback> {
    const feedback = await this.findOne(id);

    // Partially update fields
    Object.assign(feedback, updateDto);

    return await this.feedbackRepository.save(feedback);
  }

  async countNew(): Promise<{ count: number }> {
    const count = await this.feedbackRepository.count({
      where: { status: FeedbackStatus.NEW },
    });
    return { count };
  }
}
