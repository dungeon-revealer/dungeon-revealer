const createState = () => ({
  loadingIds: [],
  isLoading: state => {
    return Boolean(state.loadingIds.length) || state.isLoadingAll;
  },
  isLoadingAll: false,
  notes: {}
});

export const state = createState();
