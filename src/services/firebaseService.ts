import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot,
    query,
    getDocs
} from 'firebase/firestore';
import firebaseConfig, { isFirebaseConfigValid } from '../firebase/config';
import type { Task, User } from '../types';

// Initialize Firebase
let db: any;
if (isFirebaseConfigValid()) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} else {
    console.error("Firebase config is missing or invalid. Please check firebase/config.ts");
    // Provide a mock db to prevent the app from crashing
    db = { 
        collection: () => ({}), 
        doc: () => ({}), 
        onSnapshot: () => (() => {}),
    };
}


const tasksCollection = collection(db, 'tasks');
const usersCollection = collection(db, 'users');

// --- Real-time Listeners ---

export const onTasksUpdate = (callback: (tasks: Task[]) => void) => {
    const q = query(tasksCollection);
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            // Simple data migration from assigneeId to assigneeIds
            if (data.assigneeId && !data.assigneeIds) {
                data.assigneeIds = [data.assigneeId];
                delete data.assigneeId;
            }
            if (!data.assigneeIds) {
                data.assigneeIds = ['all']; // Default if somehow missing
            }
            return {
                id: doc.id,
                ...data
            } as Task;
        });
        callback(tasks);
    }, (error) => {
        console.error("Error listening to tasks:", error);
    });
};

export const onUsersUpdate = (callback: (users: User[]) => void) => {
    const q = query(usersCollection);
    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback([]);
            return;
        }
        // Assuming one document holds the array of users
        const usersDoc = snapshot.docs[0];
        const users = usersDoc.data().users as User[];
        callback(users);

    }, (error) => {
        console.error("Error listening to users:", error);
    });
};

// --- Task Operations ---

export const addTask = async (taskData: Omit<Task, 'id'>) => {
    try {
        await addDoc(tasksCollection, taskData);
    } catch (error) {
        console.error("Error adding task:", error);
    }
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
        const taskDoc = doc(db, 'tasks', id);
        await updateDoc(taskDoc, updates);
    } catch (error) {
        console.error("Error updating task:", error);
    }
};

export const deleteTask = async (id: string) => {
    try {
        const taskDoc = doc(db, 'tasks', id);
        await deleteDoc(taskDoc);
    } catch (error) {
        console.error("Error deleting task:", error);
    }
};

// --- User Operations ---

export const saveUsers = async (users: User[]) => {
    try {
        const snapshot = await getDocs(usersCollection);
        // We store all users in a single document for simplicity
        if (snapshot.empty) {
            await addDoc(usersCollection, { users });
        } else {
            const userDoc = doc(db, 'users', snapshot.docs[0].id);
            await updateDoc(userDoc, { users });
        }
    } catch (error) {
        console.error("Error saving users:", error);
    }
};