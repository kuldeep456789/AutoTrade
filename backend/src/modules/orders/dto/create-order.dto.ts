export class CreateOrderDto {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  totalAmount: number;
  paymentMethod?: 'Razorpay';
}
