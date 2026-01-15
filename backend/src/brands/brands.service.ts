import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
  ) {}

  async findAll(): Promise<Brand[]> {
    return await this.brandsRepository.find();
  }

  async findOneBySlug(slug: string): Promise<Brand | null> {
    return await this.brandsRepository.findOne({ where: { slug } });
  }

  async findOne(id: string): Promise<Brand | null> {
    return await this.brandsRepository.findOne({ where: { id } });
  }
}
