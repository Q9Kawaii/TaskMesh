import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
  template: `
  <div class="flex flex-1 items-stretch overflow-hidden">
    <app-sidebar [activeTab]="activeTab" (tabChange)="activeTab = $event"></app-sidebar>
    
    <main class="flex-1 p-12 overflow-y-auto h-[calc(100vh-104px)] bg-[#f8fafc]">
      <app-dashboard 
        *ngIf="activeTab === 'dashboard'" 
        [userData]="userData" 
        [employees]="employees">
      </app-dashboard>

      <app-employee-list 
        *ngIf="activeTab === 'employees'" 
        [employees]="employees" 
        (selectEmployee)="selectedEmployee = $event">
      </app-employee-list>

      <app-register-staff 
        *ngIf="activeTab === 'register'" 
        (refresh)="fetchEmployees()">
      </app-register-staff>

      <app-my-account 
        *ngIf="activeTab === 'account' && userData" 
        [userData]="userData">
      </app-my-account>
    </main>

    <app-employee-detail 
      *ngIf="selectedEmployee" 
      [employee]="selectedEmployee" 
      (close)="selectedEmployee = null">
    </app-employee-detail>
  </div>
  ` // ✅ Fixed: Added missing backtick here
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
}