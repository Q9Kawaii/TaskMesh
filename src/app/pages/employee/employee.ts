import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee.html',
  styleUrl: './employee.css'
})
export class EmployeeComponent implements OnInit {

  selectedRequest: any = null;
showDetails: boolean = false;
  userId = '';
  userName = '';
  userRole = '';
  userEmail = '';

  activeSection = 'dashboard';
  loading = false;

  clientRequests: any[] = [];

  openRequestDetails(req: any) {
  this.selectedRequest = req;
  this.showDetails = true;
}

closeDetails() {
  this.showDetails = false;
}

  ngOnInit() {
    const data = localStorage.getItem('userData');

    if (!data) {
      console.error("No user data");
      return;
    }

    const user = JSON.parse(data);

    this.userId = user.uid;
    this.userName = user.name;
    this.userRole = user.role;
    this.userEmail = user.email;

    console.log("User ID:", this.userId);

    this.loadClientRequests();
  }

  setSection(section: string) {
    this.activeSection = section;
  }

  menuClass(section: string) {
    return this.activeSection === section
      ? 'bg-blue-600 text-white px-4 py-2 rounded'
      : 'text-gray-600 px-4 py-2';
  }

  async loadClientRequests() {
    if (!this.userId) return;

    this.loading = true;

    try {
      const q = query(
        collection(db, "requests"),
        where("assignedTo", "==", this.userId)
      );

      const snapshot = await getDocs(q);

      this.clientRequests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data['title'] || '',
          description: data['description'] || '',
          deadline: data['deadline'] || '',
          status: data['status'] || 'pending'
        };
      });

      console.log("Requests:", this.clientRequests);

    } catch (err) {
      console.error("Firestore Error:", err);
    }

    this.loading = false;
  }

  async acceptRequest(req: any) {
    try {
      const ref = doc(db, "requests", req.id);

      await updateDoc(ref, {
        status: "accepted"
      });

      req.status = "accepted";

    } catch (err) {
      console.error(err);
    }
  }

  formatDate(date: any): string {
    if (!date) return 'No date';

    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  }

  getCardColor(i: number) {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-red-500'
    ];
    return colors[i % colors.length];
  }
}