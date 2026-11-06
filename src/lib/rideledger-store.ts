import { create } from 'zustand';

type RideLedgerState = {
  refreshIndex: number;
  triggerRefresh: () => void;
};

export const useRideLedgerStore = create<RideLedgerState>(set => ({
  refreshIndex: 0,
  triggerRefresh: () => set(state => ({ refreshIndex: state.refreshIndex + 1 })),
}));
