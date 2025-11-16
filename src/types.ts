export interface User {
  id: string;
  name: string;
  email: string;
}

export type ReminderOption = 'none' | '5m' | '10m' | '15m' | '30m' | '1h' | '1d';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[]; // ['all'] or an array of User['id']
  dueDate: string | null;
  isRepeating: boolean;
  completed: boolean;
  reminder: ReminderOption;
  syncWithCalendar: boolean;
}

export interface TaskFormData {
  title: string;
  description: string;
  assigneeIds: string[];
  dueDate: string;
  isRepeating: boolean;
  reminder: ReminderOption;
  syncWithCalendar: boolean;
}