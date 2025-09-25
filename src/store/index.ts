import { configureStore } from '@reduxjs/toolkit';
import transactionReducer from './slices/transactionSlice';
import categoryReducer from './slices/categorySlice';
import budgetReducer from './slices/budgetSlice';
import goalReducer from './slices/goalSlice';

export const store = configureStore({
  reducer: {
    transactions: transactionReducer,
    categories: categoryReducer,
    budgets: budgetReducer,
    goals: goalReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
        ignoredActionsPaths: ['payload.date', 'payload.createdAt', 'payload.updatedAt'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;