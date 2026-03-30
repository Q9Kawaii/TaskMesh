import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { auth, db } from '../../../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // (Template portion updated)
template: `
    <div class="animate-in fade-in duration-500">
      <h2 class="text-2xl font-black text-slate-900 mb-2 italic">Account <span class="text-blue-700">Security</span></h2>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Manage credentials and authentication</p>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Legal Name</label>
              <input [(ngModel)]="userData.name" class="w-full bg-transparent font-bold text-slate-800 outline-none mt-1 border-b border-transparent focus:border-blue-300">
            </div>
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Role Authority</label>
              <p class="font-bold text-slate-800 mt-1 uppercase text-xs tracking-tighter">System Administrator</p>
            </div>
          </div>
          <button (click)="update()" class="w-full py-4 bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-700/20 hover:bg-blue-800 transition-all">
            Update Security Profile
          </button>
        </div>

        <div class="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <div class="text-center mb-8">
             <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <span class="text-2xl">✓</span>
             </div>
             <p class="text-xs font-black text-slate-900 uppercase">Account Secured</p>
             <p class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Verified Session Active</p>
          </div>
          <div class="space-y-4">
            <button (click)="reset()" class="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50">
              Dispatched Reset Link
            </button>
            <p class="text-[9px] text-slate-400 text-center px-4">Last password change: 4 months ago</p>
          </div>
        </div>
      </div>
    </div>
`
})
export class MyAccountComponent {
  @Input() userData: any;

  async update() {
    await updateDoc(doc(db, "users", this.userData.uid), { name: this.userData.name });
    alert("Profile Updated.");
  }

  async reset() {
    await sendPasswordResetEmail(auth, this.userData.email);
    alert("Security Link Dispatched.");
  }
}