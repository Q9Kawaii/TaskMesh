import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header class="mb-10">
        <h1 class="text-3xl font-black text-[#1e293b] italic">Control <span class="text-blue-700">Center</span></h1>
        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">System Overview & Real-time Metrics</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div *ngFor="let stat of stats" class="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{{stat.label}}</p>
          <div class="flex items-end gap-2">
            <span class="text-3xl font-black text-slate-900">{{stat.value}}</span>
            <span [class]="stat.trendUp ? 'text-emerald-500' : 'text-blue-600'" class="text-[10px] font-bold mb-1">
              {{stat.trend}}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm border-l-8 border-l-blue-700">
          <div class="flex items-center gap-6 mb-8">
            <div class="w-20 h-20 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center text-3xl font-black shadow-inner">
              {{ userData?.name?.charAt(0) }}
            </div>
            <div>
              <h2 class="text-xl font-black text-slate-900">{{ userData?.name }}</h2>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Lead Project Manager</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
            <div class="p-4 bg-slate-50 rounded-2xl">
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">Authenticated ID</p>
              <p class="text-xs font-bold text-slate-700 font-mono">{{ userData?.uid?.substring(0,12) }}...</p>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl">
              <p class="text-[9px] font-black text-slate-400 uppercase mb-1">System Node</p>
              <p class="text-xs font-bold text-slate-700 uppercase">Primary / Chennai-IN</p>
            </div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-700 rounded-full animate-ping"></span>
            System Alerts
          </h3>
          <div class="space-y-6">
            <div *ngFor="let alert of alerts" class="flex gap-4">
              <div [class]="alert.color" class="w-1 h-10 rounded-full"></div>
              <div>
                <p class="text-[11px] font-bold text-slate-800">{{alert.msg}}</p>
                <p class="text-[9px] text-slate-400 font-bold uppercase">{{alert.time}}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  @Input() userData: any;
  @Input() employees: any[] = [];

  stats = [
    { label: 'Active Tasks', value: '42', trend: '+12%', trendUp: true },
    { label: 'Completed', value: '128', trend: 'Global', trendUp: false },
    { label: 'Efficiency', value: '94%', trend: 'Optimal', trendUp: true },
    { label: 'Wait Time', value: '1.2h', trend: '-10%', trendUp: false },
  ];

  alerts = [
    { msg: 'New client request: E-commerce Site', time: '2 mins ago', color: 'bg-blue-600' },
    { msg: 'Employee Yash updated status', time: '14 mins ago', color: 'bg-emerald-500' },
    { msg: 'Deadline adjustment required', time: '1 hour ago', color: 'bg-amber-500' }
  ];
}