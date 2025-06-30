export type Task = {
  id: string;
  description: string;
  completed: boolean;
  status?: 'incomplete' | 'done' | 'followup';  // New field for follow-up functionality
  area?: string;
  context?: string;
  project?: string;
  due_date?: string;
  done_date?: string;  // For form editing
  priority?: string;
  recurring?: string;
  indent_level?: number;
  subtasks?: Task[];
  notes?: Note[];
  type?: string;
  // Additional metadata fields
  done_date_obj?: string;
  followup_date?: string;  // New field for follow-up date
  extra_projects?: string[];
  extra_contexts?: string[];
  metadata?: Record<string, string>;
};

export type Note = {
  type: 'note';
  content: string;
  indent: string;
};

export type TaskGroup = {
  type: 'group' | 'area';
  title?: string;  // For regular tasks (type: 'group')
  area?: string;   // For recurring tasks (type: 'area')
  content?: string; // For recurring tasks
  tasks: Task[];
};

export type TaskData = TaskGroup[] | Task[];
