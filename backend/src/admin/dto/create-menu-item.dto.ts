import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NutritionDto {
  @IsOptional()
  @IsNumber()
  kcal?: number;

  @IsOptional()
  @IsNumber()
  carbohydrate?: number;

  @IsOptional()
  @IsNumber()
  protein?: number;

  @IsOptional()
  @IsNumber()
  fat?: number;

  @IsOptional()
  @IsNumber()
  saturatedFat?: number;

  @IsOptional()
  @IsNumber()
  sodium?: number;

  @IsOptional()
  @IsNumber()
  sugar?: number;
}

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string; // 'burger'만 사용

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  detailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionDto)
  nutrition?: NutritionDto;
}

export class BulkCreateMenuItemDto {
  @IsString()
  brandSlug: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemDto)
  menuItems: CreateMenuItemDto[];
}
