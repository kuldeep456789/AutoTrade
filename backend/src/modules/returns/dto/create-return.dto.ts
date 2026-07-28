export class CreateReturnDto {
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  productSize?: string;
  productColor?: string;
  reason: string;
  description?: string;
  images?: string[];
  exchangeSize?: string;
  pickupAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
}
