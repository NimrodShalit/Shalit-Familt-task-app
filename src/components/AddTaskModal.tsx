import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Task, User, TaskFormData, ReminderOption } from '../types';
import { parseTaskFromText, parseTaskUpdateFromText } from '../services/geminiService';
import { MicrophoneIcon, StopIcon, ProcessingIcon } from './Icons';

interface AddTaskModalProps {
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'completed'> & { id?: string }) => Promise<void>;
  taskToEdit: Task | null;
  users: User[];
}

// Extend the global Window interface for webkitSpeechRecognition
declare global {
    interface Window {
        webkitSpeechRecognition: any;
    }
}

const reminderOptions: { value: ReminderOption; label: string }[] = [
    { value: 'none', label: 'ללא תזכורת' },
    { value: '5m', label: '5 דקות לפני' },
    { value: '10m', label: '10 דקות לפני' },
    { value: '15m', label: '15 דקות לפני' },
    { value: '30m', label: '30 דקות לפני' },
    { value: '1h', label: 'שעה לפני' },
    { value: '1d', label: 'יום לפני' },
];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onSave, taskToEdit, users }) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    assigneeIds: users.length > 0 ? [users[0].id] : ['all'],
    dueDate: '',
    isRepeating: false,
    reminder: '10m',
    syncWithCalendar: true,
  });
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        title: taskToEdit.title,
        description: taskToEdit.description,
        assigneeIds: taskToEdit.assigneeIds || ['all'],
        dueDate: taskToEdit.dueDate || '',
        isRepeating: taskToEdit.isRepeating,
        reminder: taskToEdit.reminder,
        syncWithCalendar: taskToEdit.syncWithCalendar,
      });
    }
  }, [taskToEdit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
            setIsAssigneeDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
        setError('שם המשימה הוא שדה חובה.');
        return;
    }
    if (!formData.assigneeIds || formData.assigneeIds.length === 0) {
        setError('חובה לבחור למי מיועדת המשימה.');
        return;
    }
    setError('');
    await onSave({
      id: taskToEdit?.id,
      ...formData,
      dueDate: formData.dueDate || null
    });
  };
  
  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setError('');
    try {
      const parsedData = taskToEdit
        ? await parseTaskUpdateFromText(text, users, taskToEdit)
        : await parseTaskFromText(text, users);

      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          title: parsedData.title ?? prev.title,
          description: parsedData.description ?? prev.description,
          assigneeIds: parsedData.assigneeIds ?? prev.assigneeIds,
          dueDate: parsedData.dateTime ? new Date(parsedData.dateTime).toISOString().slice(0, 16) : prev.dueDate,
          isRepeating: parsedData.isRepeating ?? prev.isRepeating,
          reminder: parsedData.reminder ?? prev.reminder,
          syncWithCalendar: parsedData.syncWithCalendar ?? prev.syncWithCalendar,
        }));
      }
    } catch (err) {
      setError('לא הצלחנו לעבד את הבקשה הקולית. נסו שוב.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [users, taskToEdit]);
  
  const handleVoiceInput = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("דפדפן זה אינו תומך בזיהוי קולי. נסו להשתמש בכרום.");
      return;
    }
    
    transcriptRef.current = ''; // Reset transcript before starting

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'he-IL';
    recognition.continuous = true; // Allow continuous speech until manually stopped
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Process the accumulated transcript only when recording ends
      if (transcriptRef.current) {
        processTranscript(transcriptRef.current);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      setError(`שגיאת זיהוי קולי: ${event.error}`);
      setIsRecording(false); // Ensure recording state is reset on error
    };

    recognition.onresult = (event: any) => {
        // Concatenate all final results from the continuous recognition
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
        }
        transcriptRef.current = fullTranscript.trim();
    };
    
    recognition.start();
  }, [isRecording, processTranscript]);

  const handleAssigneeChange = (assigneeId: string) => {
    setFormData(prev => {
        const currentAssignees = prev.assigneeIds || [];
        
        if (assigneeId === 'all') {
            const newAssignees = currentAssignees.includes('all') ? [] : ['all'];
            return { ...prev, assigneeIds: newAssignees.length > 0 ? newAssignees : (users.length > 0 ? [users[0].id] : []) };
        }
        
        let newAssignees = currentAssignees.filter(id => id !== 'all');

        if (newAssignees.includes(assigneeId)) {
            newAssignees = newAssignees.filter(id => id !== assigneeId);
        } else {
            newAssignees.push(assigneeId);
        }

        if (newAssignees.length === 0 && users.length > 0) {
            return { ...prev, assigneeIds: [users[0].id] };
        }
        
        return { ...prev, assigneeIds: newAssignees };
    });
  };

  const getAssigneeNames = () => {
      const { assigneeIds } = formData;
      if (!assigneeIds || assigneeIds.length === 0) return 'בחר...';
      if (assigneeIds.includes('all')) return 'כולם';
      
      return assigneeIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">{taskToEdit ? 'עריכת משימה' : 'משימה חדשה'}</h2>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

            <div>
              <label htmlFor="title" className="block text-gray-700 font-semibold mb-2">שם המשימה</label>
              <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">תיאור</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div ref={assigneeRef}>
                <label className="block text-gray-700 font-semibold mb-2">למי מיועד?</label>
                <div className="relative">
                  <button type="button" onClick={() => setIsAssigneeDropdownOpen(prev => !prev)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center">
                    <span className="truncate">{getAssigneeNames()}</span>
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-600 transition-transform ${isAssigneeDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </button>
                  {isAssigneeDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <ul role="listbox" aria-multiselectable="true">
                          <li role="option" aria-selected={formData.assigneeIds?.includes('all')} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleAssigneeChange('all')}>
                              <label className="flex items-center space-x-2 space-x-reverse w-full cursor-pointer">
                              <input type="checkbox" checked={formData.assigneeIds?.includes('all')} readOnly className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"/>
                              <span>כולם</span>
                              </label>
                          </li>
                          <li className="border-t border-gray-200"></li>
                        {users.map(user => (
                          <li key={user.id} role="option" aria-selected={formData.assigneeIds?.includes(user.id)} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleAssigneeChange(user.id)}>
                            <label className="flex items-center space-x-2 space-x-reverse w-full cursor-pointer">
                              <input type="checkbox" checked={!formData.assigneeIds?.includes('all') && formData.assigneeIds?.includes(user.id)} disabled={formData.assigneeIds?.includes('all')} readOnly className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none disabled:opacity-50"/>
                              <span>{user.name}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-gray-700 font-semibold mb-2">תאריך ושעה</label>
                <input type="datetime-local" id="dueDate" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
                <label htmlFor="reminder" className="block text-gray-700 font-semibold mb-2">תזכורת</label>
                <select id="reminder" name="reminder" value={formData.reminder} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {reminderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-3 space-x-reverse">
                <input type="checkbox" name="isRepeating" checked={formData.isRepeating} onChange={handleChange} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-gray-700 font-semibold">משימה חוזרת (שבועית)</span>
              </label>
               <label className="flex items-center space-x-3 space-x-reverse">
                <input type="checkbox" name="syncWithCalendar" checked={formData.syncWithCalendar} onChange={handleChange} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-gray-700 font-semibold">הוסף ליומן גוגל</span>
              </label>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
               <button type="button" onClick={handleVoiceInput} disabled={isProcessing} className={`w-full flex items-center justify-center p-3 rounded-md text-white font-bold transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : ''}`}>
                  {isProcessing ? <ProcessingIcon /> : isRecording ? <StopIcon /> : <MicrophoneIcon />}
                  <span className="mr-2">
                    {isProcessing ? 'מעבד...' : isRecording ? 'עצור הקלטה' : taskToEdit ? 'הקלט עדכון למשימה' : 'הקלט הוראות למשימה' }
                  </span>
               </button>
               {isRecording && <div className="text-blue-600 animate-pulse">מאזין...</div>}
            </div>

          </div>
          <div className="bg-gray-100 p-4 flex justify-end space-x-3 space-x-reverse rounded-b-lg">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 font-semibold">ביטול</button>
            <button type="submit" disabled={isProcessing} className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400">שמור משימה</button>
          </div>
        </form>
      </div>
       <style>{`
          @keyframes slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
        `}</style>
    </div>
  );
};