import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Church } from '../../../../core/churches/entities/church.entity';

@Injectable()
export class ChurchSlugService {
  constructor(
    @InjectRepository(Church) private readonly churchRepo: Repository<Church>,
  ) { }

  async detectDuplicate(name: string, city: string): Promise<void> {
    const normalizedName = name.trim().toLowerCase();
    const existing = await this.churchRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.publicProfile', 'p')
      .where('LOWER(c.canonicalName) = :name', { name: normalizedName })
      .andWhere('LOWER(p.city) = :city', { city: city.trim().toLowerCase() })
      .getOne();

    if (existing) {
      throw new ConflictException({
        message: 'This church may already exist in the network.',
        existingChurchSlug: existing.publicProfile?.slug,
      });
    }
  }

  async generateSlug(name: string): Promise<string> {
    const normalizedName = name.trim().toLowerCase();
    const baseSlug = normalizedName.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let count = 1;

    while (await this.churchRepo.findOne({ where: { publicProfile: { slug } } })) {
      slug = `${baseSlug}-${count++}`;
    }

    return slug;
  }
}
