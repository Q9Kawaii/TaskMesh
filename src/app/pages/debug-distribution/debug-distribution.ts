import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { DistributionService } from '../../distribution-engine/service';

@Component({
  selector: 'app-debug-distribution',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 bg-slate-900 min-h-screen text-slate-100 font-sans">
      <header class="mb-10 text-center">
        <h1 class="text-4xl font-extrabold text-blue-400 mb-2 italic">Distribution <span class="text-white">Engine Debugger</span></h1>
        <p class="text-slate-400 font-medium tracking-widest uppercase text-xs">Simulate real-world assignment scenarios in real-time</p>
      </header>

      <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- SIMULATE LOAD SECTION -->
        <div class="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl transition-all hover:border-blue-500/50">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-3">
            <span class="p-2 bg-blue-500/10 rounded-lg">🚀</span>
            Trigger Assignments
          </h2>
          
          <div class="space-y-4">
            <button 
              (click)="createNewToken()" 
              class="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/20 flex justify-between items-center"
            >
              <span>Simulate New Client Request</span>
              <span class="text-xs opacity-70">Token</span>
            </button>

            <button 
              (click)="createNewLead()" 
              class="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-900/20 flex justify-between items-center"
            >
              <span>Simulate New Sales Lead</span>
              <span class="text-xs opacity-70">Lead</span>
            </button>
          </div>

          <div class="mt-8 pt-8 border-t border-slate-700/50">
            <h3 class="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-tighter">Maintenance Operations</h3>
            <button 
              (click)="runBulkDistribute()" 
              class="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              ⚙️ Run Bulk Background Distribution
            </button>
          </div>
        </div>

        <!-- ENGINE STATUS SECTION -->
        <div class="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden relative">
          <div class="absolute top-0 right-0 p-4">
            <span class="flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>

          <h2 class="text-xl font-bold mb-6 flex items-center gap-3">
            <span class="p-2 bg-slate-700/50 rounded-lg">📊</span>
            Live Console
          </h2>
          
          <div #scrollContainer class="h-[300px] overflow-y-auto space-y-3 font-mono text-[11px] leading-relaxed">
            <div *ngFor="let log of logs" [class]="log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'">
              <span class="opacity-30 mr-2">[{{log.time}}]</span>
              <span [class.font-bold]="log.important">{{log.msg}}</span>
            </div>
            <div *ngIf="logs.length === 0" class="text-slate-600 italic">No events detected... Waiting for tasks.</div>
          </div>
        </div>
      </div>

      <div class="mt-12 max-w-4xl mx-auto p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
        <p class="text-xs text-blue-300/60 leading-relaxed text-center">
          <b>How to test:</b> Open your browser console (F12) while performing these actions to see the 🤖 Distribution Engine in action. 
          When you click "Simulate", the engine listeners in the background will automatically pick up the unassigned document and run the 
          distribution algorithm based on employee workloads.
        </p>
      </div>
    </div>
  `,
  styles: [`
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
  `]
})
export class DebugDistributionComponent {
  private distService = inject(DistributionService);
  logs: any[] = [];

  addLog(msg: string, type: 'info' | 'success' | 'error' = 'info', important = false) {
    this.logs.unshift({
      time: new Date().toLocaleTimeString(),
      msg,
      type,
      important
    });
    // Limit log size
    if (this.logs.length > 50) this.logs.pop();
  }

  async createNewToken() {
    this.addLog('🚀 Initiating New Client Request token...', 'info');
    try {
      const tokenRef = await addDoc(collection(db, 'requests'), {
        title: 'New High Priority Site Request',
        description: 'Mocked request for testing distribution engine tie-breaking.',
        status: 'unassigned', // This status triggers the listener
        category: 'web', // Will be used for skill filtering
        priority: 5,
        created_at: serverTimestamp()
      });
      this.addLog(`✅ Token created: ${tokenRef.id}. Monitoring for auto-assignment...`, 'success', true);
      
      // Actively watch this specific document so it updates in the UI
      const unsubscribe = onSnapshot(doc(db, 'requests', tokenRef.id), (snap) => {
        const docData = snap.data();
        if (docData && docData['status'] === 'assigned') {
          const emp = docData['assignedTo'] || docData['assignedEmployee'] || 'Unknown';
          this.addLog(`🏆 Token Auto-Assigned! Given to Employee ID: ${emp}`, 'success', true);
          unsubscribe(); // Stop listening once assigned
        }
      });
    } catch (err: any) {
      this.addLog(`❌ Failed to create token: ${err.message}`, 'error');
    }
  }

  async createNewLead() {
    this.addLog('🚀 Generating sales lead document...', 'info');
    try {
      const leadRef = await addDoc(collection(db, 'leads'), {
        name: 'Potential Enterprise Client',
        email: 'test@example.com',
        status: 'unassigned', // This status triggers the listener
        required_skill: 'mobile',
        priority: 8,
        created_at: serverTimestamp()
      });
      this.addLog(`✅ Lead created: ${leadRef.id}. Awaiting engine response...`, 'success', true);
      
      // Actively watch this specific document so it updates in the UI
      const unsubscribe = onSnapshot(doc(db, 'leads', leadRef.id), (snap) => {
        const docData = snap.data();
        if (docData && docData['status'] === 'assigned') {
          const emp = docData['assigned_employee'] || 'Unknown';
          this.addLog(`🏆 Lead Auto-Assigned! Given to Employee ID: ${emp}`, 'success', true);
          unsubscribe(); // Stop listening once assigned
        }
      });
    } catch (err: any) {
      this.addLog(`❌ Failed to create lead: ${err.message}`, 'error');
    }
  }

  async runBulkDistribute() {
    this.addLog('⚙️ Running manual background cleanup (Bulk Distribute)...', 'info', true);
    try {
      const summary = await this.distService.distributePending();
      this.addLog(`📈 Bulk Result: Tokens(${summary.tokens.success}) Leads(${summary.leads.success})`, 'success');
      if (summary.tokens.errors.length > 0) this.addLog(`⚠️ Token Errors: ${summary.tokens.errors.join(', ')}`, 'error');
    } catch (err: any) {
      this.addLog(`❌ Bulk engine execution failed: ${err.message}`, 'error');
    }
  }
}
