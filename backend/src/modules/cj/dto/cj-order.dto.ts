export interface CjOrderProductItem {
  vid: string;
  quantity: number;
}

export interface CjCreateOrderDto {
  orderNumber: string;
  shippingCustomerName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingZip: string;
  shippingPhone: string;
  logisticName?: string;
  fromCountryCode?: string;
  platform?: string;
  products: CjOrderProductItem[];
}
