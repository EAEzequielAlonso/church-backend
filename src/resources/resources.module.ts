import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller';
import { StudyResource } from './entities/study-resource.entity';
import { StudyTopic } from './entities/study-topic.entity';
import { StudyCollection } from './entities/study-collection.entity';
import { Book } from '../library/entities/book.entity';

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

const UseCases = [
  GetCollectionsUseCase,
  GetCollectionUseCase,
  CreateCollectionUseCase,
  UpdateCollectionUseCase,
  DeleteCollectionUseCase,
  ReorderCollectionsUseCase,
  GetTopicUseCase,
  CreateTopicUseCase,
  UpdateTopicUseCase,
  DeleteTopicUseCase,
  ReorderTopicsUseCase,
  GetResourcesUseCase,
  GetResourceUseCase,
  CreateResourceUseCase,
  UpdateResourceUseCase,
  DeleteResourceUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([StudyResource, StudyTopic, StudyCollection, Book]),
  ],
  controllers: [ResourcesController],
  providers: [...UseCases],
  exports: [...UseCases],
})
export class ResourcesModule {}
