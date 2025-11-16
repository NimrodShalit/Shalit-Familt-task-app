import React, { useState, useEffect } from 'react';
import { AddTaskModal } from './components/AddTaskModal';
import { TaskCard } from './components/TaskCard';
import { SettingsModal } from './components/SettingsModal';
import type { Task, User } from './types';
import { PlusIcon, SettingsIcon } from './components/Icons';
import * as db from './services/firebaseService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    // Subscribe to real-time updates for tasks
    const unsubscribeTasks = db.onTasksUpdate((tasks) => {
      setTasks(tasks);
      setLoading(false);
    });

    // Subscribe to real-time updates for users
    const unsubscribeUsers = db.onUsersUpdate((users) => {
      if (users.length === 0) {
        // If no users, create default ones
        const defaultUsers = [
          { id: 'user-1', name: 'אני', email: 'me@example.com' },
          { id: 'user-2', name: 'נתה', email: 'neta.shiran@example.com' },
        ];
        db.saveUsers(defaultUsers);
        setUsers(defaultUsers);
      } else {
        setUsers(users);
      }
    });

    // Clean up subscriptions on unmount
    return () => {
      unsubscribeTasks();
      unsubscribeUsers();
    };
  }, []);

  const handleOpenModal = (task: Task | null = null) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };
  
  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  const handleSaveUsers = async (updatedUsers: User[]) => {
      await db.saveUsers(updatedUsers);
  }

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'completed'> & { id?: string }) => {
    if (taskData.id) {
      // Editing existing task
      await db.updateTask(taskData.id, taskData);
    } else {
      // Adding new task
      const newTaskData = {
        ...taskData,
        completed: false,
      };
      await db.addTask(newTaskData);
    }
    handleCloseModal();
  };

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    await db.updateTask(taskId, { completed: !currentStatus });
  };
    
  const handleDeleteTask = async (taskId: string) => {
    await db.deleteTask(taskId);
  };

  const renderTasksByAssignee = (assigneeId: string, title: string) => {
      const filteredTasks = tasks.filter(t => t.assigneeIds?.includes(assigneeId));

      if(filteredTasks.length === 0) return null;

      return (
          <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-700 my-4 px-4">{title} ({filteredTasks.length})</h2>
              <div className="space-y-3 px-2">
                  {filteredTasks.map(task => (
                      <TaskCard
                          key={task.id}
                          task={task}
                          users={users}
                          onToggleComplete={() => handleToggleComplete(task.id, task.completed)}
                          onEdit={() => handleOpenModal(task)}
                          onDelete={() => handleDeleteTask(task.id)}
                      />
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ direction: 'rtl' }}>
      <div className="container mx-auto max-w-lg p-0">
        <header className="bg-blue-600 text-white shadow-md sticky top-0 z-10">
          <div className="flex justify-between items-center p-4">
            <button onClick={handleOpenSettings} aria-label="הגדרות">
                <SettingsIcon className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">TaskMinder המשפחתי</h1>
            <i className="fa-solid fa-bell text-xl"></i>
          </div>
        </header>

        <main className="p-2 pb-24">
            {loading ? (
                <div className="text-center text-gray-500 mt-20">
                    <p>טוען משימות...</p>
                </div>
            ) : tasks.length > 0 ? (
                 <>
                    {users.map(user => renderTasksByAssignee(user.id, `משימות עבור ${user.name}`))}
                    {renderTasksByAssignee('all', 'משימות עבור כולם')}
                 </>
            ) : (
                <div className="text-center text-gray-500 mt-20">
                    <i className="fa-solid fa-folder-open text-6xl mb-4"></i>
                    <p className="text-lg">אין משימות עדיין.</p>
                    <p>לחצו על כפתור הפלוס כדי להוסיף משימה חדשה.</p>
                </div>
            )}
        </main>

        <button
          onClick={() => handleOpenModal()}
          className="fixed bottom-6 left-6 bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 z-20"
          aria-label="הוסף משימה חדשה"
        >
          <PlusIcon className="w-8 h-8" />
        </button>
      </div>

      {isModalOpen && (
        <AddTaskModal
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          taskToEdit={editingTask}
          users={users}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
            onClose={handleCloseSettings}
            onSave={handleSaveUsers}
            initialUsers={users}
        />
      )}
    </div>
  );
};

export default App;