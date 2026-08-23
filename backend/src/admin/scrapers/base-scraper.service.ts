import { In, Not, Repository } from 'typeorm';
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

  protected async deactivateStaleMenuItems(
    brandId: string,
    activeMenuNames: string[],
    category = 'burger',
  ): Promise<number> {
    const uniqueActiveMenuNames = [...new Set(activeMenuNames)];
    if (uniqueActiveMenuNames.length === 0) {
      return 0;
    }

    const result = await this.menuItemsRepository.update(
      {
        brandId,
        category,
        isActive: true,
        name: Not(In(uniqueActiveMenuNames)),
      },
      { isActive: false },
    );

    return result.affected ?? 0;
  }
}
