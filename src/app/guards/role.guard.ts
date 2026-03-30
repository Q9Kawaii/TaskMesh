import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const roleGuard = (expectedRole: string): CanActivateFn => {

  return async () => {

    const router = inject(Router);

    const user = auth.currentUser;

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      router.navigate(['/login']);
      return false;
    }

    const data: any = userSnap.data();

    if (data.role === expectedRole) {
      return true;
    }

    router.navigate(['/login']);
    return false;

  };

};