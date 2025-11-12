
// STEP 1: Go to https://console.firebase.google.com/ and create a new project.
// STEP 2: In your project, click the Web icon (</>) to create a new web app.
// STEP 3: You will be given a `firebaseConfig` object. Copy and paste it here.

// FIX: Define an interface for the Firebase config object to specify its shape to TypeScript,
// resolving errors from accessing properties on an initially empty object.
interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyDYLwfAVz1umg-QFJhpwuO_5dmw0_cG7sI",
  authDomain: "shalit-family-task-app.firebaseapp.com",
  projectId: "shalit-family-task-app",
  storageBucket: "shalit-family-task-app.firebasestorage.app",
  messagingSenderId: "244652043699",
  appId: "1:244652043699:web:442d8f5ec8bea5dac72fc6"
};

// This function checks if the config is filled out.
export const isFirebaseConfigValid = () => {
    return firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId;
}

export default firebaseConfig;
