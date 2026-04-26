import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAWiL89fQqmb9X6lSr0zgjGPskChXZj7eo",
  authDomain: "crmportal-maz.firebaseapp.com",
  projectId: "crmportal-maz",
  storageBucket: "crmportal-maz.firebasestorage.app",
  messagingSenderId: "464114028302",
  appId: "1:464114028302:web:8311029c953a2dfcfd115f",
  measurementId: "G-CDBSM24GG5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
