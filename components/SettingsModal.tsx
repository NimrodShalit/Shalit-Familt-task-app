import React, { useState } from 'react';
import type { User } from '../types';
import { PlusIcon, TrashIcon } from './Icons';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (users: User[]) => Promise<void>;
  initialUsers: User[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSave, initialUsers }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      if (!/^\S+@\S+\.\S+$/.test(newUser.email)) {
        setError('נא להזין כתובת אימייל תקינה.');
        return;
      }
      const user: User = { ...newUser, id: `user-${Date.now()}` };
      setUsers([...users, user]);
      setNewUser({ name: '', email: '' });
      setError('');
    } else {
        setError('שם ואימייל הם שדות חובה.');
    }
  };

  const handleRemoveUser = (id: string) => {
    if (users.length <= 1) {
        setError('חייב להיות לפחות משתמש אחד.');
        return;
    }
    setUsers(users.filter(user => user.id !== id));
  };

  const handleUserChange = (index: number, field: 'name' | 'email', value: string) => {
    const updatedUsers = [...users];
    updatedUsers[index][field] = value;
    setUsers(updatedUsers);
  };

  const handleSave = async () => {
    if (users.some(u => !u.name || !u.email)) {
        setError('שם ואימייל הם שדות חובה עבור כל משתמש.');
        return;
    }
     if (users.some(u => !/^\S+@\S+\.\S+$/.test(u.email))) {
        setError('נא לוודא שכל כתובות האימייל תקינות.');
        return;
    }
    await onSave(users);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">הגדרות משתמשים</h2>
          <p className="text-gray-600 mb-6">נהל את המשתמשים שיש להם גישה לרשימת המשימות. האימייל משמש לשליחת הזמנות ליומן גוגל.</p>
          
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

          <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
            {users.map((user, index) => (
              <div key={user.id} className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-md">
                <input
                  type="text"
                  placeholder="שם"
                  value={user.name}
                  onChange={(e) => handleUserChange(index, 'name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <input
                  type="email"
                  placeholder="אימייל"
                  value={user.email}
                  onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full bg-red-100 flex-shrink-0">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-start space-x-2 space-x-reverse border-t pt-4">
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2">
                 <input
                    type="text"
                    placeholder="שם חדש"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                />
                <input
                    type="email"
                    placeholder="אימייל חדש"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                />
            </div>
            <button onClick={handleAddUser} className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 h-[42px] flex-shrink-0">
              <PlusIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-4 flex justify-end space-x-3 space-x-reverse rounded-b-lg">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 font-semibold">ביטול</button>
          <button type="button" onClick={handleSave} className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">שמור שינויים</button>
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
    </div>
  );
};