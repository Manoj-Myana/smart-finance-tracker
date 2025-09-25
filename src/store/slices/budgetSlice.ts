import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Budget } from '../../types';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
}

const initialState: BudgetState = {
  budgets: [],
  loading: false,
  error: null,
};

const budgetSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {
    addBudget: (state, action: PayloadAction<Budget>) => {
      state.budgets.push(action.payload);
    },
    updateBudget: (state, action: PayloadAction<Budget>) => {
      const index = state.budgets.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.budgets[index] = action.payload;
      }
    },
    deleteBudget: (state, action: PayloadAction<string>) => {
      state.budgets = state.budgets.filter(b => b.id !== action.payload);
    },
    setBudgets: (state, action: PayloadAction<Budget[]>) => {
      state.budgets = action.payload;
    },
  },
});

export const {
  addBudget,
  updateBudget,
  deleteBudget,
  setBudgets,
} = budgetSlice.actions;

export default budgetSlice.reducer;