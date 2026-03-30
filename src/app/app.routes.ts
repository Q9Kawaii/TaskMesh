import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { ManagerComponent } from './pages/manager/manager';
import { EmployeeComponent } from './pages/employee/employee';
import { ClientComponent } from './pages/client/client';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [

  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  {
    path: 'manager',
    component: ManagerComponent,
    canActivate: [authGuard, roleGuard('manager')]
  },

  {
    path: 'employee',
    component: EmployeeComponent,
    canActivate: [authGuard, roleGuard('employee')]
  },

  {
    path: 'client',
    component: ClientComponent,
    canActivate: [authGuard, roleGuard('client')]
  },

  { path: '**', redirectTo: 'login' }

];