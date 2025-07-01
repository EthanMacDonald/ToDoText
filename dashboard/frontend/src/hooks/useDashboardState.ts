import { useState, useEffect } from 'react';
import StateStorage, { type DashboardState } from '../utils/stateStorage';

export function useDashboardState() {
  const [state, setState] = useState<DashboardState>({
    filters: { area: '', context: '', project: '' },
    sortBy: 'due',
    taskTypeFilter: 'all',
    recurringFilter: 'today',
    panelStates: {
      isCommitExpanded: false,
      isStatisticsExpanded: false,
      isTimeSeriesExpanded: false,
      isListsExpanded: false,
    },
    formStates: {
      isCreateTaskExpanded: false,
      editingTaskId: null,
      addingSubtaskToId: null,
    },
    listsState: {
      selectedList: '',
    },
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const loadedState = await StateStorage.loadState();
        setState(loadedState);
      } catch (error) {
        console.warn('Failed to load dashboard state:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadState();
  }, []);

  // Save state whenever it changes (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      const saveState = async () => {
        try {
          await StateStorage.saveState(state);
        } catch (error) {
          console.warn('Failed to save dashboard state:', error);
        }
      };

      // Debounce the save operation
      const timeoutId = setTimeout(saveState, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [state, isLoaded]);

  const updateState = (updates: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const updateFilters = (filters: Partial<DashboardState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters }
    }));
  };

  const updatePanelStates = (panelStates: Partial<DashboardState['panelStates']>) => {
    setState(prev => ({
      ...prev,
      panelStates: { ...prev.panelStates, ...panelStates }
    }));
  };

  const updateFormStates = (formStates: Partial<DashboardState['formStates']>) => {
    setState(prev => ({
      ...prev,
      formStates: { ...prev.formStates, ...formStates }
    }));
  };

  const updateListsState = (listsState: Partial<DashboardState['listsState']>) => {
    setState(prev => ({
      ...prev,
      listsState: { ...prev.listsState, ...listsState }
    }));
  };

  return {
    state,
    updateState,
    updateFilters,
    updatePanelStates,
    updateFormStates,
    updateListsState,
    isLoaded,
  };
}
