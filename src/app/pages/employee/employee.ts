import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { updateDoc } from 'firebase/firestore';
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

sanitizeMessage() {
  if (!this.selectedRequest) return;

  // ✅ Allow letters, numbers, space, basic punctuation (. ,)
  this.selectedRequest.message = this.selectedRequest.message
    ?.replace(/[^a-zA-Z0-9 .,]/g, '');
}

 async updateStatus() {
  if (!this.selectedRequest) return;

  // FINAL SANITIZATION (IMPORTANT)
  this.selectedRequest.message = this.selectedRequest.message
    ?.replace(/[^a-zA-Z0-9 .,]/g, '');

  const ref = doc(db, "requests", this.selectedRequest.id);

  await updateDoc(ref, {
    status: this.selectedRequest.status,
    message: this.selectedRequest.message || "",
    deadline: this.selectedRequest.deadline,
    time: this.selectedRequest.time || ""
  });

  alert("Task updated successfully!");

  this.closeDetails();
  this.loadClientRequests();
}

blockSpecialChars(event: KeyboardEvent) {
  const allowedPattern = /^[a-zA-Z0-9 .,]$/;

  // Allow control keys
  const controlKeys = [
    'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight',
    'Delete', 'Enter'
  ];

  if (controlKeys.includes(event.key)) return;

  if (!allowedPattern.test(event.key)) {
    event.preventDefault(); // ❌ BLOCK INPUT
  }
}

handlePaste(event: ClipboardEvent) {
  event.preventDefault();

  const pastedText = event.clipboardData?.getData('text') || '';

  // Clean pasted text
  const cleanText = pastedText.replace(/[^a-zA-Z0-9 .,]/g, '');

  // Insert cleaned text manually
  document.execCommand('insertText', false, cleanText);
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

  const completed = this.completed || 5;
  const pending = this.pending || 3;
  const ongoing = this.ongoing || 7;

  // ✅ COMMON OPTIONS (RESPONSIVE FIX)
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false, // ⭐ MOST IMPORTANT
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  // ✅ PIE CHART
  this.statusChart = new Chart(statusCanvas, {
    type: 'pie',
    data: {
      labels: ['Completed', 'Pending', 'Ongoing'],
      datasets: [{
        data: [completed, pending, ongoing],
        backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6']
      }]
    },
    options: commonOptions
  });

  // ✅ BAR CHART
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
      ...commonOptions,
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

  // ✅ HANDLE WINDOW RESIZE (IMPORTANT)
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
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
// ✅ ADD THIS
isSidebarOpen = false;

toggleSidebar() {
  this.isSidebarOpen = !this.isSidebarOpen;
}

closeSidebar() {
  this.isSidebarOpen = false;
}
// DROPDOWN OPTIONS
frontendOptions = ["HTML",
"CSS",
"JavaScript",
"TypeScript",
"React",
"Next.js",
"Angular",
"Vue",
"Nuxt.js",
"Svelte",
"SvelteKit",
"Preact",
"SolidJS",
"Ember.js",
"Backbone.js",
"Alpine.js",
"Lit",
"jQuery",
"Redux",
"Redux Toolkit",
"MobX",
"Zustand",
"Recoil",
"Jotai",
"Context API",
"Vuex",
"Pinia",
"NgRx",
"Tailwind CSS",
"Bootstrap",
"Material UI",
"Chakra UI",
"Ant Design",
"Semantic UI",
"Bulma",
"Foundation",
"ShadCN UI",
"PrimeReact",
"Sass",
"SCSS",
"Less",
"Stylus",
"Framer Motion",
"GSAP",
"Lottie",
"Three.js",
"D3.js",
"Chart.js",
"Recharts",
"ECharts",
"Webpack",
"Vite",
"Parcel",
"Rollup",
"esbuild",
"Snowpack",
"Storybook",
"Jest",
"Vitest",
"Cypress",
"Playwright",
"Testing Library",
"Mocha",
"Chai",
"React Native",
"Flutter",
"Ionic",
"Expo",
"NativeScript"];
backendOptions = ["Node.js",
"Express.js",
"NestJS",
"Fastify",
"Koa",
"Hapi",
"AdonisJS",
"Sails.js",
"Python",
"Django",
"Flask",
"FastAPI",
"Tornado",
"Bottle",
"Java",
"Spring Boot",
"Spring MVC",
"Micronaut",
"Quarkus",
"Hibernate",
"PHP",
"Laravel",
"Symfony",
"CodeIgniter",
"Ruby",
"Ruby on Rails",
"Sinatra",
"C#",
"ASP.NET",
"ASP.NET Core",
"Go",
"Gin",
"Echo",
"Fiber",
"Rust",
"Actix",
"Rocket",
"Kotlin",
"Ktor",
"Scala",
"Play Framework",
"GraphQL",
"REST API",
"gRPC",
"SOAP",
"tRPC",
"JWT",
"OAuth",
"Passport.js",
"Firebase Auth",
"Auth0",
"Keycloak",
"Clerk"];
frameworkOptions = ["Next.js",
"Nuxt.js",
"Remix",
"SvelteKit",
"Meteor",
"Blitz.js",
"RedwoodJS",
"Angular",
"Vue",
"Svelte",
"Ember.js",
"Backbone.js",
"Laravel",
"Ruby on Rails",
"Django",
"Spring Boot",
"ASP.NET Core",
"Phoenix",
"Play Framework",
"Flutter",
"React Native",
"Xamarin",
"Ionic",
"Cordova",
"Electron",
"Tauri",
"NW.js",
"Qt"];

// SELECTED VALUES
selectedFrontend = '';
selectedBackend = '';
selectedFramework = '';

// ⭐ RATING
rating = 4;

setRating(value: number) {
  this.rating = value;
}



}
