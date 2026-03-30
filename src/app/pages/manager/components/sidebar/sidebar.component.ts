import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { auth } from '../../../../firebase';
import { signOut } from 'firebase/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="w-72 bg-white border-r border-slate-200 flex flex-col sticky top-0 self-start shrink-0 h-[calc(100vh-104px)]">
      <div class="p-8 mb-4">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-sm">S</div>
          <span class="font-black text-slate-800 tracking-tight text-lg italic">MAZ.</span>
        </div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management System</p>
      </div>

      <nav class="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        <button *ngFor="let tab of tabs" (click)="tabChange.emit(tab.id)"
          [class]="activeTab === tab.id ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20' : 'text-slate-500 hover:bg-slate-50'"
          class="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-left">
          {{ tab.label }}
        </button>
      </nav>

      <div class="p-6 border-t border-slate-100 mt-auto">
        <button (click)="logout()" class="w-full py-3 rounded-xl border border-rose-100 text-rose-500 text-xs font-bold hover:bg-rose-50 transition-all">
          Sign Out
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  @Input() activeTab = 'dashboard';
  @Output() tabChange = new EventEmitter<string>();

  tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'employees', label: 'Employee List' },
    { id: 'register', label: 'Register Staff' },
    { id: 'account', label: 'My Account' }
  ];

  logout() {
    signOut(auth).then(() => window.location.reload());
  }
}