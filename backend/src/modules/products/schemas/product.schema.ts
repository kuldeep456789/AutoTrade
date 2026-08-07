import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  pid!: string;

  @Prop({ default: '' })
  productName!: string;

  @Prop({ default: '' })
  brand!: string;

  @Prop({ default: '' })
  collectionType!: string;

  @Prop({ default: '' })
  categoryId!: string;

  @Prop({ default: '' })
  categoryName!: string;

  @Prop({ default: '' })
  subcategoryName!: string;

  @Prop({ default: '' })
  subcategoryId!: string;

  @Prop({ default: 0 })
  price!: number;

  @Prop({ default: 0 })
  discountPrice!: number;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: [String], default: [] })
  colors!: string[];

  @Prop({ type: [String], default: [] })
  sizes!: string[];

  @Prop({ type: Array, default: [] })
  variants!: Array<Record<string, any>>;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '' })
  name!: string;

  @Prop({ default: '' })
  title!: string;
}

export type ProductDocument = HydratedDocument<Product>;

export const ProductSchema = SchemaFactory.createForClass(Product);

// Compound index for category queries
ProductSchema.index({
  collectionType: 1,
  categoryId: 1,
});

// Unique index for CJ Product ID
ProductSchema.index(
  {
    pid: 1,
  },
  {
    unique: true,
  },
);

// Indexes for brand, subcategory, and updatedAt query optimization
ProductSchema.index({ subcategoryName: 1 });
ProductSchema.index({ categoryName: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ updatedAt: -1 });
