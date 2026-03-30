import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// Component Imports
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmployeeListComponent } from './components/employee-list/employee-list.component';
import { RegisterStaffComponent } from './components/register-staff/register-staff.component';
import { MyAccountComponent } from './components/my-account/my-account.component';
import { EmployeeDetailComponent } from './components/employee-detail/employee-detail.component';

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [
    CommonModule, 
    SidebarComponent, 
    DashboardComponent, 
    EmployeeListComponent, 
    RegisterStaffComponent, 
    MyAccountComponent,
    EmployeeDetailComponent
  ],
  templateUrl: './manager.html'
})
export class ManagerComponent implements OnInit {
  activeTab = 'dashboard';
  userData: any = null;
  employees: any[] = [];
  selectedEmployee: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            this.userData = { 
              ...userSnap.data(), 
              uid: user.uid, 
              email: user.email 
            };
          }
          await this.fetchEmployees();
        } catch (error) {
          console.error("Error fetching manager data:", error);
        }
      }
      this.cdr.detectChanges();
    });
  }

  async fetchEmployees() {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      this.employees = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.role === 'employee');
      
      this.cdr.detectChanges();
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }
}