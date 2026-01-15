import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { IngestLog } from './entities/ingest-log.entity';
import { MenuItem } from '../menu-items/entities/menu-item.entity';
import { Nutrition } from '../nutrition/entities/nutrition.entity';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngestLog, MenuItem, Nutrition]),
    BrandsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
