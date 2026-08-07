import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CjService } from './cj.service';

@Controller('cj')
export class CjController {
  constructor(private readonly cjService: CjService) {}

  @Post('sync-order/:orderId')
  syncOrder(@Param('orderId') orderId: string) {
    return this.cjService.syncOrderById(orderId);
  }

  @Post('authentication')
  authenticate() {
    return this.cjService.getAccessToken();
  }

  @Get('categories')
  getCategories() {
    return this.cjService.getCategories();
  }

  @Get('product-count')
  async productCount() {
    const count = await this.cjService.getProductCount();
    return { count };
  }

  @Get('sync-status')
  async syncStatus() {
    const count = await this.cjService.getProductCount();
    return { status: 'active', productCount: count };
  }

  @Post('clear-cache')
  clearCache() {
    return this.cjService.clearApiCache();
  }

  @Post('sync-now')
  triggerSync() {
    this.cjService.runCatalogSync().catch((err) => {
      console.error('[CJ] Manual sync failed:', err);
    });
    return {
      message:
        'Catalog sync started in the background. Check /cj/sync-status for progress.',
    };
  }

  @Get('products')
  getProducts(@Query() query: Record<string, string | undefined>) {
    return this.cjService.getProducts(query);
  }

  @Get('products/by-category')
  getProductsByCategory(
    @Query('categoryId') categoryId: string,
    @Query('pid') pid?: string,
  ) {
    return this.cjService.getProductsByCategory(categoryId, pid);
  }

  @Post('sync-all')
  async syncAll(@Query('categoryId') categoryId?: string) {
    const products = await this.cjService.getAllProducts(categoryId);
    return { total: products.length };
  }
}
