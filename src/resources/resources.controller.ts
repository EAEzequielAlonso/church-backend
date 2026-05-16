import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { CurrentChurch } from '../common/decorators';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';

import { CreateResourceDto, UpdateResourceDto } from './dto/create-resource.dto';
import { CreateTopicDto, UpdateTopicDto } from './dto/create-topic.dto';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/create-collection.dto';
import { ReorderDto } from './dto/reorder.dto';

import { GetCollectionsUseCase } from './use-cases/get-collections.use-case';
import { GetCollectionUseCase } from './use-cases/get-collection.use-case';
import { CreateCollectionUseCase } from './use-cases/create-collection.use-case';
import { UpdateCollectionUseCase } from './use-cases/update-collection.use-case';
import { DeleteCollectionUseCase } from './use-cases/delete-collection.use-case';
import { ReorderCollectionsUseCase } from './use-cases/reorder-collections.use-case';

import { GetTopicUseCase } from './use-cases/get-topic.use-case';
import { CreateTopicUseCase } from './use-cases/create-topic.use-case';
import { UpdateTopicUseCase } from './use-cases/update-topic.use-case';
import { DeleteTopicUseCase } from './use-cases/delete-topic.use-case';
import { ReorderTopicsUseCase } from './use-cases/reorder-topics.use-case';

import { GetResourcesUseCase } from './use-cases/get-resources.use-case';
import { GetResourceUseCase } from './use-cases/get-resource.use-case';
import { CreateResourceUseCase } from './use-cases/create-resource.use-case';
import { UpdateResourceUseCase } from './use-cases/update-resource.use-case';
import { DeleteResourceUseCase } from './use-cases/delete-resource.use-case';

@Controller('study')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class ResourcesController {
  constructor(
    private readonly getCollectionsUc: GetCollectionsUseCase,
    private readonly getCollectionUc: GetCollectionUseCase,
    private readonly createCollectionUc: CreateCollectionUseCase,
    private readonly updateCollectionUc: UpdateCollectionUseCase,
    private readonly deleteCollectionUc: DeleteCollectionUseCase,
    private readonly reorderCollectionsUc: ReorderCollectionsUseCase,

    private readonly getTopicUc: GetTopicUseCase,
    private readonly createTopicUc: CreateTopicUseCase,
    private readonly updateTopicUc: UpdateTopicUseCase,
    private readonly deleteTopicUc: DeleteTopicUseCase,
    private readonly reorderTopicsUc: ReorderTopicsUseCase,

    private readonly getResourcesUc: GetResourcesUseCase,
    private readonly getResourceUc: GetResourceUseCase,
    private readonly createResourceUc: CreateResourceUseCase,
    private readonly updateResourceUc: UpdateResourceUseCase,
    private readonly deleteResourceUc: DeleteResourceUseCase,
  ) {}

  // --- COLLECTIONS ---
  @Get('collections')
  getCollections(@CurrentChurch() churchId: string) {
    return this.getCollectionsUc.execute(churchId);
  }

  @Post('collections')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  createCollection(@CurrentChurch() churchId: string, @Body() dto: CreateCollectionDto) {
    return this.createCollectionUc.execute(churchId, dto);
  }

  @Patch('collections/reorder')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  reorderCollections(@CurrentChurch() churchId: string, @Body() dto: ReorderDto) {
    return this.reorderCollectionsUc.execute(churchId, dto);
  }

  @Get('collections/:id')
  getCollection(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getCollectionUc.execute(churchId, id);
  }

  @Patch('collections/:id')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  updateCollection(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectionDto) {
    return this.updateCollectionUc.execute(churchId, id, dto);
  }

  @Delete('collections/:id')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  deleteCollection(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteCollectionUc.execute(churchId, id);
  }

  // --- TOPICS ---
  @Post('topics')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  createTopic(@CurrentChurch() churchId: string, @Body() dto: CreateTopicDto) {
    return this.createTopicUc.execute(churchId, dto);
  }

  @Patch('topics/reorder')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  reorderTopics(@CurrentChurch() churchId: string, @Body() dto: ReorderDto) {
    return this.reorderTopicsUc.execute(churchId, dto);
  }

  @Get('topics/:id')
  getTopic(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getTopicUc.execute(churchId, id);
  }

  @Patch('topics/:id')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  updateTopic(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTopicDto) {
    return this.updateTopicUc.execute(churchId, id, dto);
  }

  @Delete('topics/:id')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  deleteTopic(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteTopicUc.execute(churchId, id);
  }

  // --- RESOURCES ---
  @Get('resources')
  getResources(@CurrentChurch() churchId: string) {
    return this.getResourcesUc.execute(churchId);
  }

  @Post('resources')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  createResource(@CurrentChurch() churchId: string, @Body() dto: CreateResourceDto) {
    return this.createResourceUc.execute(churchId, dto);
  }

  @Get('resources/:id')
  getResource(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getResourceUc.execute(churchId, id);
  }

  @Patch('resources/:id')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  updateResource(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateResourceDto) {
    return this.updateResourceUc.execute(churchId, id, dto);
  }

  @Delete('resources/:id')
  @RequirePermissions(AppPermission.RESOURCE_MANAGE)
  deleteResource(@CurrentChurch() churchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteResourceUc.execute(churchId, id);
  }
}
