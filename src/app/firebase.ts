import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyAWiL89fQqmb9X6lSr0zgjGPskChXZj7eo",
  authDomain: "crmportal-maz.firebaseapp.com",
  projectId: "crmportal-maz",
  storageBucket: "crmportal-maz.appspot.com", // ✅ FIXED
  messagingSenderId: "464114028302",
  appId: "1:464114028302:web:8311029c953a2dfcfd115f",
  measurementId: "G-CDBSM24GG5"
};


/* INITIALIZE APP FIRST */

const app = initializeApp(firebaseConfig);


/* THEN INITIALIZE SERVICES */

const analytics = getAnalytics(app);

export const db = getFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);

/*Storage -> Rules
rules_version = '2';

service firebase.storage {

match /b/{bucket}/o {

match /{allPaths=**} {

allow read, write: if request.auth != null;

}

}

}
*/