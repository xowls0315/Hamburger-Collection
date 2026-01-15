import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionService } from './nutrition.service';
import { Nutrition } from './entities/nutrition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nutrition])],
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
