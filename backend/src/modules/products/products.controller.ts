import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { ProductsService } from './products.service';

type ProductQueryDto = {
  categoryId?: string;
  collectionType?: string;
  gender?: string;
  subcategoryName?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  colors?: string;
  sizes?: string;
  minRating?: string;
  page?: string;
  pageSize?: string;
  keyword?: string;
  sort?: string;
};

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Query() query: ProductQueryDto, @Body() body?: any) {
    const finalQuery = { ...query, ...(body || {}) };
    return await this.productsService.getProducts(finalQuery);
  }

  @Post('search')
  async searchProductsPost(
    @Query() query: ProductQueryDto,
    @Body() body?: any,
  ) {
    const finalQuery = { ...query, ...(body || {}) };
    return await this.productsService.getProducts(finalQuery);
  }

  @Get('category/:categoryId')
  async getProductsByCategory(
    @Param('categoryId') categoryId: string,
    @Query() query: ProductQueryDto,
  ) {
    if (!categoryId?.trim()) {
      throw new BadRequestException('Category ID is required');
    }

    return await this.productsService.getProducts({
      ...query,
      categoryId,
    });
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    if (!id?.trim()) {
      throw new BadRequestException('Product ID is required');
    }

    return await this.productsService.getProduct(id);
  }

  @Get(':id/related')
  async getRelatedProducts(@Param('id') id: string) {
    if (!id?.trim()) {
      throw new BadRequestException('Product ID is required');
    }

    return await this.productsService.getRelatedProducts(id);
  }

  @Post(':id/reviews')
  async createReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @Headers('authorization') authorization?: string,
  ) {
    if (!id?.trim()) {
      throw new BadRequestException('Product ID is required');
    }

    const token = authorization?.replace(/^Bearer\s+/i, '') || '';

    return await this.productsService.createReview(id, token, dto);
  }
}
