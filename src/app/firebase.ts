import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { environment } from '../environments/environment';


/* INITIALIZE APP FIRST */

const app = initializeApp(environment.firebase);


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