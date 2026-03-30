import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { db } from '../../../../firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-detail.component.html'
})
export class EmployeeDetailComponent implements OnChanges {
  @Input() employee: any;
  @Output() close = new EventEmitter<void>();
  tasks: any[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['employee'] && this.employee) {
      this.fetchTasks();
    }
  }

  async fetchTasks() {
    const employeeId = this.employee?.id;
    if (!employeeId) return;

    const q = query(collection(db, "requests"), where("assignedTo", "==", employeeId));
    const snapshot = await getDocs(q);
    this.tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    this.cdr.detectChanges();
  }

  async updateDeadline(task: any) {
    await updateDoc(doc(db, "requests", task.id), { deadline: task.deadline });
    alert("Deadline updated successfully.");
  }

  async sendAlert(task: any) {
    await updateDoc(doc(db, "requests", task.id), { managerAlert: task.managerAlert || '' });
    alert("Protocol Alert Sent to Employee.");
  }

  closeModal() {
    this.close.emit();
  }
}