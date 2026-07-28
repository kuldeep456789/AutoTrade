import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  private readonly CURATED_CATEGORIES = [
    // Men Categories
    { name: 'T-Shirts', group: 'Men' },
    { name: 'Shirts', group: 'Men' },
    { name: 'Polo Shirts', group: 'Men' },
    { name: 'Cargo Pants', group: 'Men' },
    { name: 'Jeans', group: 'Men' },
    { name: 'Joggers', group: 'Men' },
    { name: 'Shorts', group: 'Men' },
    { name: 'Hoodies', group: 'Men' },
    { name: 'Sweatshirts', group: 'Men' },
    { name: 'Jackets', group: 'Men' },
    { name: 'Sweaters', group: 'Men' },
    { name: 'Co-Ord Sets', group: 'Men' },
    { name: 'Ethnic Wear', group: 'Men' },

    // Women Categories
    { name: 'Tops', group: 'Women' },
    { name: 'T-Shirts', group: 'Women' },
    { name: 'Shirts', group: 'Women' },
    { name: 'Jeans', group: 'Women' },
    { name: 'Pants', group: 'Women' },
    { name: 'Shorts', group: 'Women' },
    { name: 'Skirts', group: 'Women' },
    { name: 'Dresses', group: 'Women' },
    { name: 'Hoodies', group: 'Women' },
    { name: 'Sweatshirts', group: 'Women' },
    { name: 'Jackets', group: 'Women' },
    { name: 'Activewear', group: 'Women' },
    { name: 'Co-Ord Sets', group: 'Women' },
    { name: 'Ethnic Wear', group: 'Women' },
  ];

  async getCategories() {
    return this.CURATED_CATEGORIES;
  }
}
