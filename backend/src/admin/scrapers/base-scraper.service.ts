import { Repository } from 'typeorm';
import { IngestLog } from '../entities/ingest-log.entity';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';
import { Nutrition } from '../../nutrition/entities/nutrition.entity';

export abstract class BaseScraperService {
  constructor(
    protected ingestLogsRepository: Repository<IngestLog>,
    protected menuItemsRepository: Repository<MenuItem>,
    protected nutritionRepository: Repository<Nutrition>,
  ) {}

  protected async createIngestLog(logData: {
    brandId: string;
    status: string;
    changedCount?: number;
    error?: string;
  }): Promise<IngestLog> {
    const log = this.ingestLogsRepository.create(logData);
    return await this.ingestLogsRepository.save(log);
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
