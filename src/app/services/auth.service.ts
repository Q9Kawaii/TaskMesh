import { Injectable } from '@angular/core';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification 
} from "firebase/auth";
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  async login(email: string, password: string): Promise<User> {

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 🚨 Email verification check
    if (!userCredential.user.emailVerified) {
      throw new Error("Email not verified");
    }

    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const data = userDoc.data() as Omit<User, 'uid'>;

    return {
      uid: uid,
      ...data
    };
  }

  // 🔥 SIGNUP FUNCTION
  async signup(name: string, phone: string, email: string, password: string): Promise<void> {

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // ✅ Send verification email
    await sendEmailVerification(userCredential.user);

    // ✅ Save user in Firestore
    await setDoc(doc(db, "users", uid), {
      name: name,
      email: email,
      phone: phone,
      role: "client"
    });

  }
}