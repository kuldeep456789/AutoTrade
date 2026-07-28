import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('men')
  async getMenCollection(@Query() query: any) {
    return this.productsService.getProducts({ ...query, gender: 'men' });
  }

  @Get('women')
  async getWomenCollection(@Query() query: any) {
    return this.productsService.getProducts({ ...query, gender: 'women' });
  }

  @Get(':gender/:categorySlug')
  async getCategoryCollection(
    @Param('gender') gender: string,
    @Param('categorySlug') categorySlug: string,
    @Query() query: any,
  ) {
    if (
      gender.toLowerCase() === 'men' &&
      categorySlug.toLowerCase() === 'jeans'
    ) {
      throw new (require('@nestjs/common').NotFoundException)(
        'The /jeans API endpoint is removed. Please use /men-jeans instead.',
      );
    }

    let resolvedCategorySlug = categorySlug;
    if (
      gender.toLowerCase() === 'men' &&
      categorySlug.toLowerCase() === 'men-jeans'
    ) {
      resolvedCategorySlug = 'jeans';
    }

    return this.productsService.getProducts({
      ...query,
      gender,
      subcategoryName: resolvedCategorySlug.replace(/-/g, ' '),
    });
  }
}
