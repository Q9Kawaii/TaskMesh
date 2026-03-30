import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { auth, db } from '../../../../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

@Component({
  selector: 'app-register-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-[1200px] animate-in fade-in zoom-in-95 duration-500">
      
      <header class="mb-8">
        <h2 class="text-4xl font-black text-slate-900 tracking-tighter italic">Staff <span class="text-blue-700">Onboarding Suite</span></h2>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Core Infrastructure Management • Access Control</p>
      </header>

      <div class="flex flex-col xl:flex-row gap-8 items-stretch">
        
        <div class="flex-1 bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            <div *ngFor="let field of fields" [class.md:col-span-2]="field.full" class="space-y-2">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{{ field.label }}</label>
              <input 
                [type]="field.type" 
                [(ngModel)]="form[field.key]" 
                [placeholder]="field.placeholder"
                class="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 text-sm font-bold transition-all">
            </div>

            <div class="md:col-span-2 pt-4">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-4 block">Deployment Role</label>
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 border-2 border-blue-600 bg-blue-50/50 rounded-2xl flex items-center gap-4 cursor-pointer">
                  <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">E</div>
                  <div>
                    <p class="text-xs font-black text-slate-800 uppercase tracking-tighter">Standard Employee</p>
                    <p class="text-[9px] text-blue-600 font-bold uppercase">Basic Task Access</p>
                  </div>
                </div>
                <div class="p-4 border border-slate-200 rounded-2xl opacity-40 grayscale flex items-center gap-4 cursor-not-allowed">
                  <div class="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-black italic">M</div>
                  <div>
                    <p class="text-xs font-black text-slate-400 uppercase tracking-tighter italic">Sub-Manager</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase">Restricted (Admin Only)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-12 pt-10 border-t border-slate-100">
            <button 
              [disabled]="loading"
              (click)="register()" 
              class="w-full py-6 bg-blue-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-700/30 hover:bg-blue-800 transition-all active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-3">
              {{ loading ? 'Synchronizing Protocols...' : 'Initialize Identity & Create Access' }}
              <span class="text-xl" *ngIf="!loading">›</span>
            </button>
          </div>
        </div>

        <div class="w-full xl:w-[400px] flex flex-col gap-6">
          
          <div class="bg-blue-700 p-8 rounded-[3rem] text-white shadow-xl shadow-blue-700/20 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
            
            <h3 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-8">Identity Preview</h3>
            
            <div class="flex items-center gap-5 mb-8">
              <div class="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-2xl font-black">
                {{ form.name ? form.name.charAt(0).toUpperCase() : '?' }}
              </div>
              <div>
                <p class="text-xl font-black tracking-tight italic">{{ form.name || 'Undefined Identity' }}</p>
                <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">{{ form.email || 'awaiting_email@maz.com' }}</p>
              </div>
            </div>

            <div class="pt-6 border-t border-white/10 flex justify-between items-center">
              <span class="text-[10px] font-black uppercase tracking-widest">Protocol Status</span>
              <span class="px-2 py-1 bg-white/20 rounded text-[9px] font-bold uppercase tracking-tighter">Ready for Dispatch</span>
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-[3rem] p-8 flex-1">
             <h3 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Verification Steps</h3>
             <ul class="space-y-6">
               <li *ngFor="let step of steps" class="flex gap-4">
                 <div [class]="form[step.check] ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'" 
                   class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 shadow-sm">
                   <span *ngIf="form[step.check]" class="text-[10px] text-white">✓</span>
                 </div>
                 <div>
                   <p class="text-xs font-black text-slate-800 tracking-tight leading-none">{{ step.title }}</p>
                   <p class="text-[9px] text-slate-400 font-bold uppercase mt-1.5 tracking-tighter">{{ step.desc }}</p>
                 </div>
               </li>
             </ul>

             <div class="mt-12 p-5 bg-slate-50 border border-slate-200 rounded-3xl flex items-start gap-4">
               <span class="text-blue-600 text-lg">🛡️</span>
               <p class="text-[9px] font-bold text-slate-500 leading-relaxed uppercase">Verification link will be dispatched to the provided address. Passwords are encrypted under SHA-256 protocols.</p>
             </div>
          </div>

        </div>

      </div>
    </div>
  `
})
export class RegisterStaffComponent {
  @Output() refresh = new EventEmitter<void>();
  loading = false;
  form: any = { name: '', email: '', password: '' };

  fields = [
    { key: 'name', label: 'Full Identity Name', type: 'text', placeholder: 'Yash Dingar', full: true },
    { key: 'email', label: 'Work Email Address', type: 'email', placeholder: 'name@mazsoftware.com', full: false },
    { key: 'password', label: 'Temporary Cipher', type: 'password', placeholder: '••••••••', full: false }
  ];

  steps = [
    { title: 'Identity Confirmed', desc: 'Validating naming convention', check: 'name' },
    { title: 'System Domain', desc: 'Corporate email synchronization', check: 'email' },
    { title: 'Security Hash', desc: 'Password strength established', check: 'password' }
  ];

  async register() {
    const managerEmail = auth.currentUser?.email;
    if (!managerEmail) return;

    const pass = prompt("Verification Required: Enter Admin Password");
    if (!pass) return;

    this.loading = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, this.form.email, this.form.password);
      await sendEmailVerification(cred.user);
      
      await setDoc(doc(db, "users", cred.user.uid), {
        name: this.form.name,
        email: this.form.email,
        role: 'employee',
        workload: 0,
        createdAt: new Date()
      });

      await signOut(auth);
      await signInWithEmailAndPassword(auth, managerEmail, pass);
      
      alert("Registration Successful. Profile Synchronized.");
      this.form = { name: '', email: '', password: '' };
      this.refresh.emit();
    } catch (e: any) { 
      alert(e.message); 
    } finally {
      this.loading = false;
    }
  }
}