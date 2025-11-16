import type { Task, User, ReminderOption } from '../types';

const reminderMinutes: Record<ReminderOption, number | null> = {
  'none': null,
  '5m': 5,
  '10m': 10,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '1d': 1440,
};

/**
 * Generates a Google Calendar link for a given task.
 * @param task The task object.
 * @param users The list of all users.
 * @returns A URL string for creating a Google Calendar event.
 */
export const generateGoogleCalendarLink = (task: Task, users: User[]): string => {
  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';

  const params = new URLSearchParams();
  params.append('text', task.title);
  
  if (task.description) {
    params.append('details', task.description);
  }

  if (task.dueDate) {
    const startDate = new Date(task.dueDate);
    // Assuming a 1-hour duration for the event
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatISO = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, '');
    params.append('dates', `${formatISO(startDate)}/${formatISO(endDate)}`);
  }
  
  const attendees: string[] = [];
  if (task.assigneeIds?.includes('all')) {
    users.forEach(user => attendees.push(user.email));
  } else if (task.assigneeIds) {
    task.assigneeIds.forEach(assigneeId => {
      const assignee = users.find(u => u.id === assigneeId);
      if (assignee) {
        attendees.push(assignee.email);
      }
    });
  }

  const uniqueAttendees = [...new Set(attendees)];
  if (uniqueAttendees.length > 0) {
      params.append('add', uniqueAttendees.join(','));
  }

  if (task.isRepeating) {
    params.append('recur', 'RRULE:FREQ=WEEKLY');
  }

  const minutes = reminderMinutes[task.reminder];
  if (minutes !== null) {
      params.append('reminders.useDefault', 'false');
      params.append('reminders.method', 'popup');
      params.append('reminders.minutes', String(minutes));
  }


  return `${baseUrl}&${params.toString()}`;
};