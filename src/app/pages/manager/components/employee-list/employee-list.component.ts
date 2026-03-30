import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule],
  // (Template portion updated)
template: `
    <div class="animate-in fade-in duration-500">
      <div class="flex justify-between items-end mb-10">
        <div>
          <h2 class="text-2xl font-black text-slate-900 italic">Workforce <span class="text-blue-700 font-black text-3xl">.</span></h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Resource Allocation & Capacity</p>
        </div>
        <div class="flex gap-2">
           <span class="px-4 py-2 bg-blue-700 text-white text-[10px] font-black rounded-full uppercase">All Staff</span>
           <span class="px-4 py-2 bg-white border border-slate-200 text-slate-400 text-[10px] font-black rounded-full uppercase">On Leave</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let emp of employees" (click)="selectEmployee.emit(emp)" 
          class="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-blue-500 shadow-sm transition-all cursor-pointer group hover:-translate-y-1">
          
          <div class="flex justify-between items-start mb-6">
            <div class="w-14 h-14 rounded-2xl bg-slate-50 text-blue-700 font-black flex items-center justify-center text-xl shadow-sm group-hover:bg-blue-700 group-hover:text-white transition-all">
              {{ emp.name.charAt(0) }}
            </div>
            <span class="text-[9px] font-black px-2 py-1 rounded bg-emerald-50 text-emerald-600 uppercase border border-emerald-100">Active</span>
          </div>

          <h3 class="font-black text-slate-800 text-lg mb-1">{{ emp.name }}</h3>
          <p class="text-[11px] text-slate-400 font-bold mb-6 italic">{{ emp.email }}</p>

          <div class="flex flex-wrap gap-2 mb-8">
            <span class="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded">Angular</span>
            <span class="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded">Firebase</span>
          </div>

          <div class="space-y-2 pt-6 border-t border-slate-50">
            <div class="flex justify-between text-[9px] font-black uppercase text-slate-400">
              <span>Bandwidth</span>
              <span [class]="emp.workload > 80 ? 'text-rose-500' : 'text-blue-600'">{{ emp.workload }}%</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="bg-blue-600 h-full transition-all duration-1000" [style.width.%]="emp.workload"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
`
})
export class EmployeeListComponent {
  @Input() employees: any[] = [];
  @Output() selectEmployee = new EventEmitter<any>();
}