export type Task = {
  id: string;
  description: string;
  completed: boolean;
  area?: string;
  context?: string;
  project?: string;
  due_date?: string;
  priority?: string;
  recurring?: string;
  indent_level?: number;
  subtasks?: Task[];
  notes?: Note[];
  type?: string;
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
