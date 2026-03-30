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
  template: `
  <div class="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
    <header class="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-20">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-black text-sm">M</div>
        <div>
          <h1 class="text-[10px] font-black text-slate-800 tracking-tighter leading-none uppercase">Maz Software</h1>
          <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Management System</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span class="text-[9px] font-black text-blue-700 uppercase tracking-widest">Encrypted Session</span>
        </div>
        
        <div class="flex items-center gap-4 border-l border-slate-100 pl-6">
          <div class="text-right">
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Logged in as</p>
            <p class="text-xs font-black text-slate-800">{{ userData?.name || 'Loading...' }}</p>
          </div>
          <button (click)="logout()" class="px-4 py-2 bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-800 transition-all">
            Logout
          </button>
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <app-sidebar class="shrink-0" [activeTab]="activeTab" (tabChange)="activeTab = $event"></app-sidebar>
      
      <div class="flex-1 flex flex-col min-w-0">
        <main class="flex-1 p-12 overflow-y-auto">
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

        <footer class="h-10 bg-white border-t border-slate-100 px-8 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              © 2026 MAZ SOFTWARE PRIVATE LIMITED • CLIENT OPERATIONS NODE
            </p>
          </div>
          <div class="flex items-center gap-6">
            <p class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
              Security <span class="text-emerald-500">V4.0 Active</span>
            </p>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Identity: <span class="text-blue-700 font-black">{{ userData?.email }}</span>
            </p>
          </div>
        </footer>
      </div>
    </div>

    <app-employee-detail 
      *ngIf="selectedEmployee" 
      [employee]="selectedEmployee" 
      (close)="selectedEmployee = null">
    </app-employee-detail>
  </div>
  `
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