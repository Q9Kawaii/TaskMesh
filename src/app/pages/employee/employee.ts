import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { auth, db } from '../../firebase';
import { onAuthStateChanged, sendPasswordResetEmail, signOut } from 'firebase/auth';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

import Chart from 'chart.js/auto';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee.html',
  styleUrl: './employee.css'
})
export class EmployeeComponent implements OnInit {

  constructor(private router: Router) {}

  userId = '';
  userName = '';
  userRole = '';
  userEmail = '';

  activeSection = 'dashboard';

  
  clientRequests: any[] = [];

  selectedRequest: any = null;
  showDetails = false;

  completed = 0;
  pending = 0;
  ongoing = 0;

  statusChart: any;
  barChart: any;

  ngOnInit() {
    onAuthStateChanged(auth, async (user) => {

      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      this.userId = user.uid;
      this.userEmail = user.email || '';

      await this.loadUserData();
      await this.loadClientRequests();
    });
  }

  async loadUserData() {
    const ref = doc(db, "users", this.userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      this.userName = data['name'];
      this.userRole = data['role'];
    }
  }

  async loadClientRequests() {
    const q = query(
      collection(db, "requests"),
      where("assignedTo", "==", this.userId)
    );

    const snapshot = await getDocs(q);

    this.clientRequests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  calculateAnalytics() {
    this.completed = this.clientRequests.filter(r => r.status === 'completed').length;
    this.pending = this.clientRequests.filter(r => r.status === 'pending').length;
    this.ongoing = this.clientRequests.filter(r => r.status === 'accepted').length;

    setTimeout(() => this.renderCharts(), 200);
  }

  renderCharts() {

  if (this.statusChart) this.statusChart.destroy();
  if (this.barChart) this.barChart.destroy();

  const statusCanvas = document.getElementById('statusChart') as HTMLCanvasElement;
  const barCanvas = document.getElementById('barChart') as HTMLCanvasElement;

  if (!statusCanvas || !barCanvas) return;

  // 👉 Use real data if available, otherwise fallback to dummy
  const completed = this.completed || 5;
  const pending = this.pending || 3;
  const ongoing = this.ongoing || 7;

  this.statusChart = new Chart(statusCanvas, {
    type: 'pie',
    data: {
      labels: ['Completed', 'Pending', 'Ongoing'],
      datasets: [{
        data: [completed, pending, ongoing],
        backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6']
      }]
    }
  });

  this.barChart = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: ['Completed', 'Pending', 'Ongoing'],
      datasets: [{
        label: 'Tasks',
        data: [completed, pending, ongoing],
        backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6']
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

  setSection(section: string) {
    this.activeSection = section;

    if (section === 'analytics') {
      setTimeout(() => this.calculateAnalytics(), 200);
    }
  }

  getPendingCardColor(status: string, i: number) {
    if (status === 'pending') return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    if (status === 'rejected') return 'bg-gradient-to-r from-red-500 to-red-700';
    if (status === 'completed') return 'bg-gradient-to-r from-green-500 to-green-700';

    const colors = [
      'bg-gradient-to-r from-purple-500 to-purple-700',
      'bg-gradient-to-r from-indigo-500 to-indigo-700'
    ];
    return colors[i % colors.length];
  }

  menuClass(section: string) {
    return this.activeSection === section
      ? 'bg-blue-600 text-white'
      : 'text-gray-600';
  }

  openRequestDetails(req: any) {
    this.selectedRequest = req;
    this.showDetails = true;
  }

  closeDetails() {
    this.showDetails = false;
  }

  async resetPassword() {
    await sendPasswordResetEmail(auth, this.userEmail);
    alert("Password reset email sent!");
  }

  async logout() {
    await signOut(auth);
    this.router.navigate(['/login']);
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString();
  }
  
  getCardColor(i: number) {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-700',
      'bg-gradient-to-r from-green-500 to-green-700',
      'bg-gradient-to-r from-purple-500 to-purple-700',
      'bg-gradient-to-r from-red-500 to-red-700'
    ];
    return colors[i % colors.length];
  }
  getCompletedCount(): number {
  return this.clientRequests?.filter(req => req.status === 'completed').length || 0;
}

getOngoingCount(): number {
  return this.clientRequests?.filter(req => req.status === 'accepted').length || 0;
}

}
