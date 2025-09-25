import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FinancialGoal } from '../../types';

interface GoalState {
  goals: FinancialGoal[];
  loading: boolean;
  error: string | null;
}

const initialState: GoalState = {
  goals: [],
  loading: false,
  error: null,
};

const goalSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    addGoal: (state, action: PayloadAction<FinancialGoal>) => {
      state.goals.push(action.payload);
    },
    updateGoal: (state, action: PayloadAction<FinancialGoal>) => {
      const index = state.goals.findIndex(g => g.id === action.payload.id);
      if (index !== -1) {
        state.goals[index] = action.payload;
      }
    },
    deleteGoal: (state, action: PayloadAction<string>) => {
      state.goals = state.goals.filter(g => g.id !== action.payload);
    },
    setGoals: (state, action: PayloadAction<FinancialGoal[]>) => {
      state.goals = action.payload;
    },
  },
});

export const {
  addGoal,
  updateGoal,
  deleteGoal,
  setGoals,
} = goalSlice.actions;

export default goalSlice.reducer;