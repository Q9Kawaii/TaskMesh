import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-50">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-[#0046ad] rounded flex items-center justify-center text-white font-black text-[10px]">M</div>
          <span class="font-black text-slate-800 tracking-tighter text-xs uppercase italic">MAZ Software</span>
        </div>
        
        <div class="h-3 w-[1px] bg-slate-200"></div>
        
        <div class="flex items-center gap-2">
           <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Management System</span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
          <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
          <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Encrypted Session</span>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {}