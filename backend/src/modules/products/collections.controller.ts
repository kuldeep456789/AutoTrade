import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('all')
  async getAllCollection(@Query() query: any) {
    return this.productsService.getProducts(query);
  }

  @Get(':collectionSlug')
  async getCollection(
    @Param('collectionSlug') collectionSlug: string,
    @Query() query: any,
  ) {
    const subcategoryName = collectionSlug.replace(/-/g, ' ');
    return this.productsService.getProducts({
      ...query,
      subcategoryName,
    });
  }

  @Get(':parentCategory/:subcategorySlug')
  async getSubcategoryCollection(
    @Param('parentCategory') parentCategory: string,
    @Param('subcategorySlug') subcategorySlug: string,
    @Query() query: any,
  ) {
    const subcategoryName = subcategorySlug.replace(/-/g, ' ');
    return this.productsService.getProducts({
      ...query,
      collectionType: parentCategory.replace(/-/g, ' '),
      subcategoryName,
    });
  }
}
