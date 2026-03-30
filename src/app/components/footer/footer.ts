import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="h-12 bg-white border-t border-slate-200 px-8 flex justify-between items-center bg-slate-50/30">
      <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        © 2026 MAZ Software Private Limited • All Rights Reserved
      </p>
      
      <div class="flex items-center gap-2">
        <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Institutional Security Protocol v4.0 Active</span>
      </div>
    </footer>
  `
})
export class FooterComponent {}