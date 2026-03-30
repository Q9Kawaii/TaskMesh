import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INDIA_LOCATIONS } from './india-locations';

import { auth, db, storage } from '../../firebase';

import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";

import {
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.html',
  styleUrls: ['./client.css']
})

export class ClientComponent implements OnInit {
  citiesByState = INDIA_LOCATIONS;
  

  // 🔹 SIDEBAR CONFIGURATION
  sections = [
    { id: 'home', label: 'Dashboard' },
    { id: 'profile', label: 'Identity Profile' },
    { id: 'edit', label: 'Modify Profile' },
    { id: 'company', label: 'Company Data' },
    { id: 'address', label: 'Address Details' },
    { id: 'request', label: 'Demand Request' },
    { id: 'documents', label: 'Upload Documents' },
    { id: 'track', label: 'My Requests' }
    
  ];

  private cdr = inject(ChangeDetectorRef);

  uid: string | null = null;
  userData: any = null;
  activeSection = 'home';
  requestList: any[] = [];

  /* DOCUMENT SECTION STATE */
  eligibleTokens: string[] = [];
  selectedToken = '';
  uploadedDocs: any[] = [];

  /* REAL UPLOAD PROGRESS STATE */
  uploadProgress = 0;
  isUploading = false;
  uploadingType = '';

  /* PROFILE FORM */
  profileForm = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    altCountryCode: '+91',
    altPhone: '',
    dob: '',
    gender: '',
    photoURL: ''
  };

  companyForm = {
    companyName: '',
    designation: '',
    industry: '',
    website: '',
    gst: '',
    size: ''
  };

  addressForm = {
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: '',
    pin: ''
  };

  getCitiesForSelectedState(): string[] {

  if (!this.addressForm.state) return [];

  return this.citiesByState[this.addressForm.state] || [];

}

onStateChange() {
  this.addressForm.city = '';
}

  indianStates: string[] = [
"Andhra Pradesh",
"Arunachal Pradesh",
"Assam",
"Bihar",
"Chhattisgarh",
"Goa",
"Gujarat",
"Haryana",
"Himachal Pradesh",
"Jharkhand",
"Karnataka",
"Kerala",
"Madhya Pradesh",
"Maharashtra",
"Manipur",
"Meghalaya",
"Mizoram",
"Nagaland",
"Odisha",
"Punjab",
"Rajasthan",
"Sikkim",
"Tamil Nadu",
"Telangana",
"Tripura",
"Uttar Pradesh",
"Uttarakhand",
"West Bengal",
"Andaman and Nicobar Islands",
"Chandigarh",
"Dadra and Nagar Haveli and Daman and Diu",
"Delhi",
"Jammu and Kashmir",
"Ladakh",
"Lakshadweep",
"Puducherry"
];

  requestForm = {
    title: '',
    description: '',
    purpose: '',
    type: '',
    techStack: '',
    deadline: '',
    budget: ''
  };

  async sendPasswordResetLink() {
    if (!this.userData?.email) return;
    try {
      await sendPasswordResetEmail(auth, this.userData.email, {
        url: window.location.origin + "/login"
      });
      alert("Security link dispatched to: " + this.userData.email);
    } catch (error) {
      console.error(error);
      alert("Error initiating reset protocol.");
    }
  }

  logout() {
    signOut(auth).then(() => {
      window.location.href = "/login";
    }).catch((error) => {
      console.error(error);
      alert("Session termination failed.");
    });
  }

  async setSection(section: string) {
    this.activeSection = section;
    if (section === 'track' && this.uid) await this.loadRequestStatus();
    if (section === 'documents') await this.prepareDocumentUpload();
  }

  ngOnInit() {
    onAuthStateChanged(auth, async user => {
      if (!user) return;
      this.uid = user.uid;
      await this.reloadUser();
      await this.loadRequestStatus();
      await this.prepareDocumentUpload();
    });
  }

  async prepareDocumentUpload() {
    if (!this.uid) return;
    const snap = await getDoc(doc(db, "users", this.uid));
    if (!snap.exists()) return;
    const userData = snap.data();
    const requests = userData?.['requests'] || {};
    this.eligibleTokens = Object.keys(requests).filter(token =>
      requests[token]?.status === "unassigned" || requests[token]?.status === "pending"
    );
    this.cdr.detectChanges();
  }

  async uploadFile(event: any, type: string) {
    const file = event.target.files[0];
    if (!file || !this.selectedToken) return;
    this.isUploading = true;
    this.uploadingType = type;
    const storagePath = `documents/${this.uid}/${this.selectedToken}/${type}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed",
      (snapshot) => {
        this.uploadProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error(error);
        this.isUploading = false;
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, "users", this.uid!), {
          [`requests.${this.selectedToken}.documents.${type}`]: {
            name: file.name,
            url: downloadURL,
            uploadedAt: new Date().getTime()
          }
        });
        await this.loadUploadedDocuments();
        this.uploadProgress = 0;
        this.isUploading = false;
      }
    );
  }

  uploadDocument(event: any, type: string) {
    this.uploadFile(event, type);
  }

  async loadUploadedDocuments() {
    if (!this.selectedToken) return;
    const snap = await getDoc(doc(db, "users", this.uid!));
    const docs = snap.data()?.['requests']?.[this.selectedToken]?.['documents'] || {};
    this.uploadedDocs = Object.keys(docs).map(type => ({ type, ...docs[type] }));
  }

  validatePhone(field: 'phone' | 'altPhone') {
    this.profileForm[field] = this.profileForm[field].replace(/[^0-9]/g, '').slice(0, 10);
  }

  validatePIN() {
  this.addressForm.pin = this.addressForm.pin
    .replace(/[^0-9]/g, '')   // allow only digits
    .slice(0, 6);             // limit to 6 digits
}

  allowOnlyNumbers(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];
    if (allowedKeys.includes(event.key) || (event.key >= '0' && event.key <= '9')) return;
    event.preventDefault();
  }

  async reloadUser() {
    const snap = await getDoc(doc(db, "users", this.uid!));
    if (!snap.exists()) return;
    this.userData = snap.data();
    this.profileForm.firstName = this.userData.firstName || '';
    this.profileForm.middleName = this.userData.middleName || '';
    this.profileForm.lastName = this.userData.lastName || '';
    this.profileForm.email = this.userData.email || '';

    if (this.userData.phone) {
      const phoneMatch = this.userData.phone.match(/^(\+\d+)(\d{10})$/);
      if (phoneMatch) {
        this.profileForm.countryCode = phoneMatch[1];
        this.profileForm.phone = phoneMatch[2];
      } else {
        this.profileForm.phone = this.userData.phone;
      }
    }

    if (this.userData.altPhone) {
      const altMatch = this.userData.altPhone.match(/^(\+\d+)(\d{10})$/);
      if (altMatch) {
        this.profileForm.altCountryCode = altMatch[1];
        this.profileForm.altPhone = altMatch[2];
      } else {
        this.profileForm.altPhone = this.userData.altPhone;
      }
    }

    this.profileForm.dob = this.userData.dob || '';
    this.profileForm.gender = this.userData.gender || '';
    this.profileForm.photoURL = this.userData.photoURL || '';
    this.companyForm = this.userData.companyDetails || this.companyForm;
    this.addressForm = this.userData.addressDetails || this.addressForm;
    this.cdr.detectChanges();
  }

  async saveProfile() {
    await updateDoc(doc(db, "users", this.uid!), {
      firstName: this.profileForm.firstName,
      middleName: this.profileForm.middleName,
      lastName: this.profileForm.lastName,
      phone: `${this.profileForm.countryCode}${this.profileForm.phone}`,
      altPhone: `${this.profileForm.altCountryCode}${this.profileForm.altPhone}`,
      dob: this.profileForm.dob,
      gender: this.profileForm.gender,
      photoURL: this.profileForm.photoURL
    });
    await this.reloadUser();
    alert("Identity Profile Updated.");
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.profileForm.photoURL = reader.result as string; };
    reader.readAsDataURL(file);
  }

  async removeProfilePhoto() {
  if (!this.uid) return;

  try {
    await updateDoc(doc(db, "users", this.uid), {
      photoURL: ""
    });

    this.profileForm.photoURL = "";
    this.userData.photoURL = "";

    this.cdr.detectChanges();

    alert("Profile photo removed successfully.");

  } catch (error) {
    console.error(error);
    alert("Failed to remove profile photo.");
  }
}

  async saveCompany() {
    await updateDoc(doc(db, "users", this.uid!), { companyDetails: this.companyForm });
    alert("Company Saved.");
  }

  async saveAddress() {

  // PIN validation: must be exactly 6 digits
  if (!/^\d{6}$/.test(this.addressForm.pin)) {
    alert("PIN must be exactly 6 numeric digits.");
    return;
  }

  await updateDoc(doc(db, "users", this.uid!), {
    addressDetails: this.addressForm
  });

  alert("Address Saved.");
}

  async createRequest() {
    const userRef = doc(db, "users", this.uid!);
    const snap = await getDoc(userRef);
    const requests = snap.data()?.['requests'] || {};
    const existingTokenNumbers = Object.keys(requests).map((k: any) => Number(k.replace('token', ''))).filter((n: any) => !isNaN(n));
    const nextTokenNumber = existingTokenNumbers.length > 0 ? Math.max(...existingTokenNumbers) + 1 : 1;
    const tokenId = `token${nextTokenNumber}`;

    const payload = {
      title: this.requestForm.title,
      description: this.requestForm.description,
      purpose: this.requestForm.purpose,
      type: this.requestForm.type,
      techStack: this.requestForm.techStack,
      deadline: this.requestForm.deadline,
      budget: this.requestForm.budget,
      status: "unassigned",
      created_at: new Date().getTime()
    };

    await updateDoc(userRef, { [`requests.${tokenId}`]: payload });
    await setDoc(doc(db, "requests", "unassigned"), { [tokenId]: { clientId: this.uid, ...payload } }, { merge: true });
    alert("Request Initialized.");
    this.requestForm = { title: '', description: '', purpose: '', type: '', techStack: '', deadline: '', budget: '' };
    await this.loadRequestStatus();
  }

  async loadRequestStatus() {
    const snap = await getDoc(doc(db, "users", this.uid!));
    const requests = snap.data()?.['requests'] || {};
    this.requestList = Object.keys(requests).sort((a, b) => {
      const aNum = Number(a.replace('token', ''));
      const bNum = Number(b.replace('token', ''));
      return bNum - aNum;
    }).map(token => {
      const request = requests[token];
      return {
        token, ...request,
        created_at: typeof request.created_at === 'number' ? new Date(request.created_at) : request.created_at?.seconds ? new Date(request.created_at.seconds * 1000) : new Date()
      };
    });
  }
}