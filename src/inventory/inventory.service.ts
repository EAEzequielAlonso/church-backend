import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import {
  CreateInventoryItemDto,
  CreateInventoryMovementDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { User } from '../users/entities/user.entity';
import { Church } from '../churches/entities/church.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import {
  InventoryMovementType,
  InventoryInReason,
} from './enums/inventory.enums';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private itemRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryMovement)
    private movementRepository: Repository<InventoryMovement>,
    @InjectRepository(Ministry)
    private ministryRepository: Repository<Ministry>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  private async getUserWithChurch(
    userId: string,
  ): Promise<{ user: User; church: Church }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person', 'person.memberships', 'person.memberships.church'],
    });
    if (!user) throw new NotFoundException('User not found');

    const church = user.person?.memberships?.[0]?.church;
    if (!church)
      throw new BadRequestException('User does not belong to any church');
    return { user, church };
  }

  async createItem(createDto: CreateInventoryItemDto, userId: string) {
    const { user, church } = await this.getUserWithChurch(userId);

    let ministry = null;
    if (createDto.ministryId) {
      ministry = await this.ministryRepository.findOne({
        where: { id: createDto.ministryId },
      });
      if (!ministry) throw new NotFoundException('Ministry not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = this.itemRepository.create({
        ...createDto,
        church: church,
        ministry: ministry,
        quantity: 0,
      });
      const savedItem = await queryRunner.manager.save(item);

      // Handle initial stock
      if (createDto.initialQuantity > 0) {
        const movement = this.movementRepository.create({
          item: savedItem,
          type: InventoryMovementType.IN,
          quantity: createDto.initialQuantity,
          reason: InventoryInReason.ADJUSTMENT,
          observation: 'Inventario Inicial',
          registeredBy: user,
        });
        await queryRunner.manager.save(movement);

        savedItem.quantity = createDto.initialQuantity;
        await queryRunner.manager.save(savedItem);
      }

      await queryRunner.commitTransaction();
      return savedItem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: string, filters?: any) {
    const { church } = await this.getUserWithChurch(userId);

    const query = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.ministry', 'ministry')
      .where('item.churchId = :churchId', { churchId: church.id })
      .orderBy('item.name', 'ASC');

    if (filters?.category) {
      query.andWhere('item.category = :category', {
        category: filters.category,
      });
    }
    if (filters?.ministryId) {
      query.andWhere('item.ministryId = :ministryId', {
        ministryId: filters.ministryId,
      });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: [
        'ministry',
        'movements',
        'movements.registeredBy',
        'movements.registeredBy.person',
      ],
    });
    if (!item) throw new NotFoundException('Inventory Item not found');

    if (item.movements) {
      item.movements.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    return item;
  }

  async updateItem(id: string, updateDto: UpdateInventoryItemDto) {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    if (updateDto.ministryId) {
      const ministry = await this.ministryRepository.findOne({
        where: { id: updateDto.ministryId },
      });
      if (!ministry) throw new NotFoundException('Ministry not found');
      item.ministry = ministry;
    }

    Object.assign(item, updateDto);
    return this.itemRepository.save(item);
  }

  async registerMovement(dto: CreateInventoryMovementDto, userId: string) {
    // We assume user can manipulate inventory of their church.
    // In detailed world we'd check if asset belongs to same church, but for now:
    const { user } = await this.getUserWithChurch(userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(InventoryItem, {
        where: { id: dto.itemId },
      });
      if (!item) throw new NotFoundException('Item not found');

      if (dto.type === InventoryMovementType.OUT) {
        if (item.quantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Current: ${item.quantity}, Requested: ${dto.quantity}`,
          );
        }
        item.quantity -= dto.quantity;
      } else {
        item.quantity += dto.quantity;
      }

      const movement = this.movementRepository.create({
        item: item,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
        observation: dto.observation,
        registeredBy: user,
      });

      await queryRunner.manager.save(movement);
      await queryRunner.manager.save(item);

      await queryRunner.commitTransaction();
      return movement;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
