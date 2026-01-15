import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';

@Controller('brands/:slug/menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get()
  findAll(
    @Param('slug') slug: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.menuItemsService.findAllByBrandSlug(slug, {
      category,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}

@Controller('menu-items')
export class MenuItemsDetailController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }
}
