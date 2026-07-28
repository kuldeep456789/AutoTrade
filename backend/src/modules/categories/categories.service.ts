import { Injectable } from '@nestjs/common';
import { Automobiles } from '../cj/collections';

@Injectable()
export class CategoriesService {
  /**
   * Returns curated automobile categories derived directly from the
   * Automobiles map in collections.ts — single source of truth.
   */
  async getCategories() {
    const result: { name: string; group: string }[] = [];
    for (const [parent, items] of Object.entries(Automobiles)) {
      for (const item of items) {
        result.push({ name: item.name, group: parent });
      }
    }
    return result;
  }
}
