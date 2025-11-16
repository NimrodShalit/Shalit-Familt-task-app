import React from 'react';
import type { Task, User, ReminderOption } from '../types';
import { generateGoogleCalendarLink } from '../utils/calendar';
import { CalendarIcon, EditIcon, TrashIcon } from './Icons';

interface TaskCardProps {
  task: Task;
  users: User[];
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const reminderLabels: Record<ReminderOption, string> = {
    'none': '',
    '5m': '5 דק\' לפני',
    '10m': '10 דק\' לפני',
    '15m': '15 דק\' לפני',
    '30m': '30 דק\' לפני',
    '1h': 'שעה לפני',
    '1d': 'יום לפני'
};

const getAssigneeDetails = (assigneeId: string, users: User[]) => {
    if (assigneeId === 'all') {
        return { name: 'כולם', color: 'bg-purple-100 text-purple-800' };
    }
    const user = users.find(u => u.id === assigneeId);
    if (user) {
        // Simple color hashing for dynamic users
        const colorIndex = user.id.charCodeAt(user.id.length - 1) % 4;
        const colors = [
            'bg-blue-100 text-blue-800',
            'bg-pink-100 text-pink-800',
            'bg-green-100 text-green-800',
            'bg-yellow-100 text-yellow-800',
        ];
        return { name: user.name, color: colors[colorIndex] };
    }
    return { name: 'לא ידוע', color: 'bg-gray-100 text-gray-800' };
}


export const TaskCard: React.FC<TaskCardProps> = ({ task, users, onToggleComplete, onEdit, onDelete }) => {
    
    const formattedDate = task.dueDate 
    ? new Date(task.dueDate).toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }) : '';

    const assigneeDetails = getAssigneeDetails(task.assigneeId, users);
    const reminderText = reminderLabels[task.reminder];

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 flex flex-col space-y-3 transition-opacity ${task.completed ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 space-x-reverse">
                 <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={onToggleComplete}
                    className="mt-1 h-6 w-6 text-blue-600 border-gray-300 rounded-full focus:ring-blue-500 cursor-pointer"
                />
                <div>
                    <h3 className={`text-lg font-bold text-gray-800 ${task.completed ? 'line-through' : ''}`}>{task.title}</h3>
                    {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
                </div>
            </div>
            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${assigneeDetails.color} whitespace-nowrap`}>
                {assigneeDetails.name}
            </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-y-1">
                {task.dueDate && (
                    <div className="flex items-center space-x-1 space-x-reverse">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formattedDate}</span>
                    </div>
                )}
                 {task.isRepeating && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">שבועי</span>}
                 {reminderText && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{reminderText}</span>}
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
                 {task.syncWithCalendar && (
                    <a href={generateGoogleCalendarLink(task, users)} target="_blank" rel="noopener noreferrer" title="הוסף ליומן גוגל" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <i className="fa-brands fa-google"></i> הוסף ליומן
                    </a>
                 )}
                 <button onClick={onEdit} title="ערוך משימה" className="text-gray-400 hover:text-green-600 transition-colors"><EditIcon className="w-5 h-5"/></button>
                 <button onClick={onDelete} title="מחק משימה" className="text-gray-400 hover:text-red-600 transition-colors"><TrashIcon className="w-5 h-5"/></button>
            </div>
        </div>
    </div>
  );
};