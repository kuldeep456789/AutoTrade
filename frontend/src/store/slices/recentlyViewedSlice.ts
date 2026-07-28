import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface RecentlyViewedItem {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images: string[];
  averageRating: number;
  numReviews: number;
  variants?: { color: string; size: string }[];
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
}

const initialState: RecentlyViewedState = {
  items: localStorage.getItem('recentlyViewed')
    ? JSON.parse(localStorage.getItem('recentlyViewed') as string)
    : [],
};

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState,
  reducers: {
    addRecentlyViewed: (state, action: PayloadAction<RecentlyViewedItem>) => {
      const item = action.payload;
      const existItemIndex = state.items.findIndex((x) => x._id === item._id);

      if (existItemIndex >= 0) {
        // If it exists, remove it from its current position
        state.items.splice(existItemIndex, 1);
      }
      
      // Add it to the beginning of the array (most recent)
      state.items.unshift(item);

      // Keep only the last 10 items
      if (state.items.length > 10) {
        state.items.pop();
      }

      localStorage.setItem('recentlyViewed', JSON.stringify(state.items));
    },
  },
});

export const { addRecentlyViewed } = recentlyViewedSlice.actions;

export default recentlyViewedSlice.reducer;
