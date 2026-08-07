export class CreateReturnItemDto {
  productId: string;

  productName: string;

  productImage?: string;

  productSize?: string;

  productColor?: string;

  quantity: number;

  price?: number;

  sku?: string;

  variantId?: string;
}

export class CreateReturnDto {
  // Order Information
  orderId: string;

  // All products included in this return request
  items: CreateReturnItemDto[];

  // Return Information
  reason: string;

  description?: string;

  // Uploaded images
  images?: string[];

  // Exchange Details
  exchangeSize?: string;

  // Pickup Address
  pickupAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
}
