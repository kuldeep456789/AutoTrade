import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  variant: {
    color: string;
    size: string;
  };
  increment?: boolean;
}

interface CartState {
  cartItems: CartItem[];
  shippingAddress: any;
  paymentMethod: string;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  couponDiscount: number;
  appliedCoupon: string;
}

const initialState: CartState = {
  cartItems: localStorage.getItem('cartItems') 
    ? JSON.parse(localStorage.getItem('cartItems') as string).map((item: any) => {
        const { increment: _increment, ...rest } = item;
        return rest;
      })
    : [],
  shippingAddress: localStorage.getItem('shippingAddress') 
    ? JSON.parse(localStorage.getItem('shippingAddress') as string) 
    : {},
  paymentMethod: 'Razorpay',
  itemsPrice: 0,
  shippingPrice: 0,
  taxPrice: 0,
  totalPrice: 0,
  couponDiscount: localStorage.getItem('couponDiscount')
    ? Number(localStorage.getItem('couponDiscount'))
    : 0,
  appliedCoupon: localStorage.getItem('appliedCoupon')
    ? (localStorage.getItem('appliedCoupon') as string)
    : '',
};

/** Calculates shipping cost based on discounted subtotal. */
const calcShipping = (itemsPrice: number, couponDiscount: number): number => {
  if (itemsPrice === 0) return 0;
  const discountedTotal = itemsPrice - couponDiscount;
  if (discountedTotal >= 5000) return 0;
  if (discountedTotal >= 999) return 49;
  if (discountedTotal >= 499) return 99;
  return 150;
};

/** Available discount coupons and discount rules. */
export const COUPONS: Record<string, { discount: (price: number) => number; min: number; desc: string }> = {
  AETHER10: {
    discount: (p) => Math.round(p * 0.1),
    min: 0,
    desc: '10% OFF on all items',
  },
  AUTOTRADE10: {
    discount: (p) => Math.round(p * 0.1),
    min: 0,
    desc: '10% OFF on all items',
  },
  FREE100: {
    discount: () => 100,
    min: 1000,
    desc: 'Flat $1.20 OFF on orders above $12.05',
  },
  SUPER500: {
    discount: () => 500,
    min: 4000,
    desc: 'Flat $6.02 OFF on orders above $48.19',
  },
  NEWUSER: {
    discount: (p) => Math.round(p * 0.15),
    min: 500,
    desc: '15% OFF for first-time users',
  },
};

const parsePrice = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Helper function to update prices
const updateCart = (state: CartState) => {
  state.itemsPrice = state.cartItems.reduce((acc, item) => {
    const price = Math.round(parsePrice(item.price));
    return acc + price * item.qty;
  }, 0);

  // Calculate coupon discount
  const couponDef = COUPONS[state.appliedCoupon];
  if (couponDef && state.itemsPrice >= couponDef.min) {
    state.couponDiscount = couponDef.discount(state.itemsPrice);
  } else {
    state.couponDiscount = 0;
    if (state.appliedCoupon && !couponDef) {
      state.appliedCoupon = ''; // reset invalid coupons
    }
  }

  state.shippingPrice = calcShipping(state.itemsPrice, state.couponDiscount);

  // No tax calculation (set to 0 as per user request)
  const taxableAmount = Math.max(0, state.itemsPrice - state.couponDiscount);
  state.taxPrice = 0;

  // Grand total (without tax)
  state.totalPrice = Number((taxableAmount + state.shippingPrice).toFixed(2));

  localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
  localStorage.setItem('appliedCoupon', state.appliedCoupon);
  localStorage.setItem('couponDiscount', String(state.couponDiscount));
};

// Calculate initial prices for persisted cart items
updateCart(initialState);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const { increment, ...itemData } = action.payload;
      const existItem = state.cartItems.find(
        (x) => x._id === itemData._id && x.variant.size === itemData.variant.size && x.variant.color === itemData.variant.color
      );

      if (existItem) {
        state.cartItems = state.cartItems.map((x) =>
          x._id === existItem._id && x.variant.size === existItem.variant.size && x.variant.color === existItem.variant.color 
            ? (increment ? { ...itemData, qty: x.qty + itemData.qty } : { ...itemData, qty: itemData.qty }) 
            : x
        );
      } else {
        state.cartItems = [...state.cartItems, itemData as CartItem];
      }
      updateCart(state);
    },
    removeFromCart: (state, action: PayloadAction<{id: string, size: string, color: string}>) => {
      state.cartItems = state.cartItems.filter(
        (x) => !(x._id === action.payload.id && x.variant.size === action.payload.size && x.variant.color === action.payload.color)
      );
      updateCart(state);
    },
    saveShippingAddress: (state, action) => {
      state.shippingAddress = action.payload;
      localStorage.setItem('shippingAddress', JSON.stringify(action.payload));
    },
    savePaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
      localStorage.setItem('paymentMethod', JSON.stringify(action.payload));
    },
    clearCartItems: (state) => {
      state.cartItems = [];
      state.appliedCoupon = '';
      state.couponDiscount = 0;
      localStorage.removeItem('appliedCoupon');
      localStorage.removeItem('couponDiscount');
      updateCart(state);
    },
    clearShippingAddress: (state) => {
      state.shippingAddress = {};
      localStorage.removeItem('shippingAddress');
    },
    applyCoupon: (state, action: PayloadAction<string>) => {
      state.appliedCoupon = action.payload;
      updateCart(state);
    },
    removeCoupon: (state) => {
      state.appliedCoupon = '';
      state.couponDiscount = 0;
      updateCart(state);
    },
  },
});

export const { 
  addToCart, 
  removeFromCart, 
  saveShippingAddress, 
  savePaymentMethod, 
  clearCartItems,
  clearShippingAddress,
  applyCoupon,
  removeCoupon
} = cartSlice.actions;

export default cartSlice.reducer;
