import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function testWrite() {
  try {

    // USERS COLLECTION
    await addDoc(collection(db, "users"), {
      name: "Rahul Sharma",
      email: "rahul@srmist.edu.in",
      role: "employee",
      skills: ["seo", "marketing"],
      workload: 0,
      created_at: serverTimestamp()
    });

    // REQUESTS COLLECTION
    await addDoc(collection(db, "requests"), {
      title: "SEO Campaign",
      description: "Improve SEO ranking for ABC company",
      clientId: "sample-client-id",
      assignedEmployee: "sample-employee-id",
      status: "pending",
      deadline: new Date(),
      created_at: serverTimestamp()
    });

    // SOCIAL DATA COLLECTION
    await addDoc(collection(db, "social_data"), {
      company_name: "XYZ Pvt Ltd",
      email: "contact@xyz.com",
      phone: "+919876543210",
      instagram: "xyz_official",
      assignedTo: "sample-employee-id",
      status: "pending",
      created_at: serverTimestamp()
    });

    // SCRAPPED REQUESTS COLLECTION
    await addDoc(collection(db, "scrapped_requests"), {
      company_name: "New Startup",
      employeeId: "sample-employee-id",
      description: "Interested in digital marketing services",
      status: "new",
      created_at: serverTimestamp()
    });

    console.log("Firestore collections created successfully ✅");

  } catch (error) {
    console.error("Error creating collections ❌", error);
  }
}