import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, IsUUID } from 'class-validator';

export class CreateTopicDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsInt() @IsOptional() order?: number;
  @IsArray() @IsUUID('4', { each: true }) @IsOptional() resourceIds?: string[];
}

export class UpdateTopicDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsInt() @IsOptional() order?: number;
  @IsArray() @IsUUID('4', { each: true }) @IsOptional() resourceIds?: string[];
}
