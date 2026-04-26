import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { pickEmployee } from './engine';
import { Employee } from './models';

async function testLiveFirebase() {
  console.log("☁️  Locating your live Firebase database...");
  
  try {
    // ---------------------------------------------------------
    // STEP 1: Fetch all employees
    // ---------------------------------------------------------
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'employee'));
    const snap = await getDocs(q);
    
    const employees: Employee[] = snap.docs.map(d => {
      const data = d.data();
      const activeTokens = data['active_token_count'] || 0;
      const activeLeads = data['active_lead_count'] || 0;
      return {
        id: d.id,
        name: data['name'] || 'Unknown',
        is_available: data['is_available'] !== false,
        active_token_count: activeTokens,
        active_lead_count: activeLeads,
        workload: activeTokens + activeLeads,
        capacity: data['capacity'] || 10,
        last_token_assigned_at: data['last_token_assigned_at'] || null,
        last_lead_assigned_at: data['last_lead_assigned_at'] || null,
        last_assigned_at: data['last_assigned_at'] || null,
        skills: Array.isArray(data['skills']) ? data['skills'] : [],
        role: 'employee'
      };
    });

    if (employees.length === 0) {
      console.log("⚠️ No employees found.");
      return;
    }

    // ---------------------------------------------------------
    // STEP 2: Calculate Distribution
    // ---------------------------------------------------------
    console.log(`\n🚀 Calculating assignment for: Build Student Portal (next js and firebase)`);
    
    // Test logic picking whoever fits (or falling back)
    const result = pickEmployee(employees, ["next js"]);
    
    console.log(`\n🏆 The Engine selected: ${result.employee.name} (ID: ${result.employee.id})`);

    // ---------------------------------------------------------
    // STEP 3: Write EXACT Payload to Firebase
    // ---------------------------------------------------------
    console.log(`\n📝 Writing full compliant payload to Firebase...`);
    
    const docRef = await addDoc(collection(db, 'requests'), {
      assignedTo: result.employee.id,
      clientId: "g8xtr7ea9ra",
      cloudPreferences: "aws",
      created_at: Date.now(), // Outputs unix timestamp int64 
      deadline: "2026-03-23",
      description: "Personal portfolio site",
      employeeName: result.employee.name, // NEW EXPLICIT INJECTION!
      platform: "Firebase Hosting",
      purpose: "lead generation",
      status: "assigned",
      techStack: "next js and firebase",
      title: "Build Student Portal"
    });
    
    console.log(`✅ Success! Exact Payload written with ID: ${docRef.id}`);

  } catch (error: any) {
    console.error(`\n❌ Engine execution failed: ${error.message}`);
    console.error(error);
  }
  
  console.log('✅ testLiveFirebase complete.');
}

testLiveFirebase();
