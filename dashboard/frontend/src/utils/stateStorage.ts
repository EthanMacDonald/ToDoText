// State storage utility for persisting dashboard settings

export interface DashboardState {
  filters: {
    area: string;
    context: string;
    project: string;
  };
  sortBy: string;
  taskTypeFilter: string;
  recurringFilter: string;
  panelStates: {
    isCommitExpanded: boolean;
    isStatisticsExpanded: boolean;
    isTimeSeriesExpanded: boolean;
    isListsExpanded: boolean;
  };
  formStates: {
    isCreateTaskExpanded: boolean;
    editingTaskId: string | null;
    addingSubtaskToId: string | null;
  };
  listsState: {
    selectedList: string;
  };
}

const DEFAULT_STATE: DashboardState = {
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
};

class StateStorage {
  private static readonly STORAGE_KEY = 'dashboard-state';

  // Save state to localStorage as fallback and to server
  static async saveState(state: DashboardState): Promise<void> {
    try {
      // Save to localStorage as immediate fallback
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      
      // Save to server file
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      });
      
      if (!response.ok) {
        console.warn('Failed to save state to server, using localStorage only');
      }
    } catch (error) {
      console.warn('Failed to save state to server:', error);
      // localStorage save already happened above as fallback
    }
  }

  // Load state from server, fallback to localStorage, then default
  static async loadState(): Promise<DashboardState> {
    try {
      // Try to load from server first
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/state`);
      
      if (response.ok) {
        const serverState = await response.json();
        // Validate that the server state has all required properties
        if (this.isValidState(serverState)) {
          return { ...DEFAULT_STATE, ...serverState };
        }
      }
    } catch (error) {
      console.warn('Failed to load state from server, trying localStorage:', error);
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        if (this.isValidState(parsedState)) {
          return { ...DEFAULT_STATE, ...parsedState };
        }
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
    }

    // Return default state if all else fails
    return DEFAULT_STATE;
  }

  // Validate state structure
  private static isValidState(state: any): state is Partial<DashboardState> {
    return (
      typeof state === 'object' &&
      state !== null &&
      (state.filters === undefined || 
        (typeof state.filters === 'object' && 
         typeof state.filters.area === 'string' &&
         typeof state.filters.context === 'string' &&
         typeof state.filters.project === 'string')) &&
      (state.panelStates === undefined ||
        (typeof state.panelStates === 'object' &&
         state.panelStates !== null)) &&
      (state.formStates === undefined ||
        (typeof state.formStates === 'object' &&
         state.formStates !== null)) &&
      (state.listsState === undefined ||
        (typeof state.listsState === 'object' &&
         state.listsState !== null))
    );
  }

  // Clear stored state
  static async clearState(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/state`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to clear state from server:', error);
    }
  }
}

export default StateStorage;
