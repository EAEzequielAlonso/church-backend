import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, IsUUID } from 'class-validator';

export class CreateCollectionDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsInt() @IsOptional() order?: number;
  @IsArray() @IsUUID('4', { each: true }) @IsOptional() topicIds?: string[];
}

export class UpdateCollectionDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsInt() @IsOptional() order?: number;
  @IsArray() @IsUUID('4', { each: true }) @IsOptional() topicIds?: string[];
}
