export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'manager' | 'employee' | 'client';
}