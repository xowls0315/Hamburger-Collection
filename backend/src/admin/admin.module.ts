import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { IngestLog } from './entities/ingest-log.entity';
import { MenuItem } from '../menu-items/entities/menu-item.entity';
import { Nutrition } from '../nutrition/entities/nutrition.entity';
import { BrandsModule } from '../brands/brands.module';
import { McDonaldsScraperService } from './scrapers/mcdonalds-scraper.service';
import { BurgerKingScraperService } from './scrapers/burgerking-scraper.service';
import { LotteriaScraperService } from './scrapers/lotteria-scraper.service';
import { MomstouchScraperService } from './scrapers/momstouch-scraper.service';
import { NobrandScraperService } from './scrapers/nobrand-scraper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngestLog, MenuItem, Nutrition]),
    BrandsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    McDonaldsScraperService,
    BurgerKingScraperService,
    LotteriaScraperService,
    MomstouchScraperService,
    NobrandScraperService,
  ],
})
export class AdminModule {}
