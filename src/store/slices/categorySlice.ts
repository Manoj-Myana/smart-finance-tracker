import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Category } from '../../types';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Food & Dining', color: '#FF6B6B', type: 'expense', icon: '🍽️' },
  { id: '2', name: 'Transportation', color: '#4ECDC4', type: 'expense', icon: '🚗' },
  { id: '3', name: 'Shopping', color: '#45B7D1', type: 'expense', icon: '🛍️' },
  { id: '4', name: 'Entertainment', color: '#96CEB4', type: 'expense', icon: '🎬' },
  { id: '5', name: 'Bills & Utilities', color: '#FFEAA7', type: 'expense', icon: '💡' },
  { id: '6', name: 'Healthcare', color: '#DDA0DD', type: 'expense', icon: '🏥' },
  { id: '7', name: 'Salary', color: '#98D8C8', type: 'income', icon: '💼' },
  { id: '8', name: 'Freelance', color: '#F7DC6F', type: 'income', icon: '💻' },
  { id: '9', name: 'Investment', color: '#BB8FCE', type: 'income', icon: '📈' },
];

const initialState: CategoryState = {
  categories: defaultCategories,
  loading: false,
  error: null,
};

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.push(action.payload);
    },
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
  },
});

export const {
  addCategory,
  updateCategory,
  deleteCategory,
  setCategories,
} = categorySlice.actions;

export default categorySlice.reducer;