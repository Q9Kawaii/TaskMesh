// ============================================================================
// Distribution Engine — Repository (All Firestore Operations)
// ============================================================================
// Every database read/write lives here. The engine and service never
// import Firebase directly — they call repository methods instead.
// ============================================================================

import { Injectable } from '@angular/core';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
  Timestamp,
  increment,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Employee,
  TokenAssignment,
  LeadAssignment,
  PendingToken,
  PendingLead,
} from './models';
import { ALGORITHM_NAME } from './engine';

/** Default capacity when the field is missing from a user document */
const DEFAULT_CAPACITY = 10;

@Injectable({ providedIn: 'root' })
export class DistributionRepository {

  // ─── Employee Queries ────────────────────────────────────────────────

  /**
   * Fetch all employees from the `users` collection.
   * Normalises missing fields to safe defaults so the engine
   * always receives well-formed Employee objects.
   */
  async getActiveEmployees(): Promise<Employee[]> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'employee'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => {
      const data = d.data();
      return this.normaliseEmployee(d.id, data);
    });
  }

  /**
   * Get a single employee by ID.
   */
  async getEmployeeById(employeeId: string): Promise<Employee | null> {
    const ref = doc(db, 'users', employeeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return this.normaliseEmployee(snap.id, snap.data());
  }

  // ─── Token Assignment Operations ─────────────────────────────────────

  /**
   * Create a new token assignment record and update the request document.
   * Stores the score_snapshot and algorithm identifier for audit trail.
   */
  async createTokenAssignment(
    tokenId: string,
    employeeId: string,
    employeeName: string,
    method: 'auto' | 'manual' = 'auto',
    scoreSnapshot: number = 0
  ): Promise<TokenAssignment> {
    const now = new Date().toISOString();

    const assignment: Omit<TokenAssignment, 'id'> = {
      token_id: tokenId,
      employee_id: employeeId,
      assigned_at: now,
      unassigned_at: null,
      assignment_method: method,
      score_snapshot: scoreSnapshot,
      algorithm: ALGORITHM_NAME,
    };

    // 1. Write assignment record
    const docRef = await addDoc(collection(db, 'token_assignments'), assignment);

    // 2. Update the request document to reflect the assignment
    try {
      const requestRef = doc(db, 'requests', tokenId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        const reqData = requestSnap.data();
        await updateDoc(requestRef, {
          assignedTo: employeeId,
          assignedEmployee: employeeId,
          employeeName: employeeName,
          status: 'assigned',
        });

        // ✨ FIX: Also update the user's nested requests map so the UI updates
        const clientId = reqData['clientId'];
        if (clientId) {
          await updateDoc(doc(db, 'users', clientId), {
            [`requests.${tokenId}.assignedTo`]: employeeId,
            [`requests.${tokenId}.assignedEmployee`]: employeeId,
            [`requests.${tokenId}.employeeName`]: employeeName,
            [`requests.${tokenId}.status`]: 'assigned',
          });
        }
      }
    } catch (err) {
      console.warn(`[Repository] Could not update request doc ${tokenId}:`, err);
    }

    return { id: docRef.id, ...assignment };
  }

  /**
   * Find the active assignment for a given token and mark it as unassigned.
   * Returns the employee ID so the caller can decrement counts.
   */
  async releaseTokenAssignment(tokenId: string): Promise<string | null> {
    const q = query(
      collection(db, 'token_assignments'),
      where('token_id', '==', tokenId),
      where('unassigned_at', '==', null)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const assignmentDoc = snapshot.docs[0];
    const data = assignmentDoc.data();

    await updateDoc(doc(db, 'token_assignments', assignmentDoc.id), {
      unassigned_at: new Date().toISOString(),
    });

    return data['employee_id'] as string;
  }

  // ─── Lead Assignment Operations ──────────────────────────────────────

  /**
   * Create a new lead assignment record and update the lead document.
   * Stores the score_snapshot and algorithm identifier for audit trail.
   */
  async createLeadAssignment(
    leadId: string,
    employeeId: string,
    employeeName: string,
    method: 'auto' | 'manual' = 'auto',
    scoreSnapshot: number = 0
  ): Promise<LeadAssignment> {
    const now = new Date().toISOString();

    const assignment: Omit<LeadAssignment, 'id'> = {
      lead_id: leadId,
      employee_id: employeeId,
      assigned_at: now,
      unassigned_at: null,
      assignment_method: method,
      score_snapshot: scoreSnapshot,
      algorithm: ALGORITHM_NAME,
    };

    const docRef = await addDoc(collection(db, 'lead_assignments'), assignment);

    // Update the lead document
    try {
      const leadRef = doc(db, 'leads', leadId);
      const leadSnap = await getDoc(leadRef);
      if (leadSnap.exists()) {
        await updateDoc(leadRef, {
          assigned_employee: employeeId,
          employeeName: employeeName,
          status: 'assigned',
        });
      }
    } catch (err) {
      console.warn(`[Repository] Could not update lead doc ${leadId}:`, err);
    }

    return { id: docRef.id, ...assignment };
  }

  /**
   * Release the active lead assignment. Returns employee ID or null.
   */
  async releaseLeadAssignment(leadId: string): Promise<string | null> {
    const q = query(
      collection(db, 'lead_assignments'),
      where('lead_id', '==', leadId),
      where('unassigned_at', '==', null)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const assignmentDoc = snapshot.docs[0];
    const data = assignmentDoc.data();

    await updateDoc(doc(db, 'lead_assignments', assignmentDoc.id), {
      unassigned_at: new Date().toISOString(),
    });

    return data['employee_id'] as string;
  }

  // ─── Employee Workload Updates ───────────────────────────────────────

  /**
   * Increment the employee's token count and update last_token_assigned_at.
   * Also updates the unified last_assigned_at for tie-breaking.
   */
  async incrementTokenCount(employeeId: string): Promise<void> {
    const now = new Date().toISOString();
    const ref = doc(db, 'users', employeeId);
    await updateDoc(ref, {
      active_token_count: increment(1),
      last_token_assigned_at: now,
      last_assigned_at: now,
      // Also update the legacy `workload` field for backward compatibility
      workload: increment(1),
    });
  }

  /**
   * Decrement the employee's token count (floor at 0).
   */
  async decrementTokenCount(employeeId: string): Promise<void> {
    const ref = doc(db, 'users', employeeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = (snap.data()['active_token_count'] as number) || 0;
    const legacyWorkload = (snap.data()['workload'] as number) || 0;

    await updateDoc(ref, {
      active_token_count: Math.max(0, current - 1),
      workload: Math.max(0, legacyWorkload - 1),
    });
  }

  /**
   * Increment the employee's lead count and update last_lead_assigned_at.
   * Also updates the unified last_assigned_at for tie-breaking.
   */
  async incrementLeadCount(employeeId: string): Promise<void> {
    const now = new Date().toISOString();
    const ref = doc(db, 'users', employeeId);
    await updateDoc(ref, {
      active_lead_count: increment(1),
      last_lead_assigned_at: now,
      last_assigned_at: now,
    });
  }

  /**
   * Decrement the employee's lead count (floor at 0).
   */
  async decrementLeadCount(employeeId: string): Promise<void> {
    const ref = doc(db, 'users', employeeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = (snap.data()['active_lead_count'] as number) || 0;

    await updateDoc(ref, {
      active_lead_count: Math.max(0, current - 1),
    });
  }

  // ─── Pending Jobs Queries ────────────────────────────────────────────

  /**
   * Get all tokens (requests) that have not been assigned to anyone.
   */
  async getUnassignedTokens(): Promise<PendingToken[]> {
    const ref = collection(db, 'requests');
    const q = query(ref, where('status', 'in', ['pending', 'unassigned']));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as PendingToken))
      .filter(t => !t.assignedTo && !t.assignedEmployee);
  }

  /**
   * Get all leads that have not been assigned to anyone.
   */
  async getUnassignedLeads(): Promise<PendingLead[]> {
    const ref = collection(db, 'leads');
    const q = query(ref, where('status', 'in', ['new', 'unassigned']));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as PendingLead))
      .filter(l => !l.assigned_employee);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Normalise a raw Firestore user document into a well-formed Employee.
   * Computes derived fields: workload, last_assigned_at.
   */
  private normaliseEmployee(id: string, data: Record<string, unknown>): Employee {
    const activeTokenCount = (data['active_token_count'] as number) || 0;
    const activeLeadCount = (data['active_lead_count'] as number) || 0;
    const lastTokenAt = (data['last_token_assigned_at'] as string) || null;
    const lastLeadAt = (data['last_lead_assigned_at'] as string) || null;

    // Compute unified last_assigned_at: most recent of token/lead timestamps
    let lastAssignedAt = (data['last_assigned_at'] as string) || null;
    if (!lastAssignedAt) {
      if (lastTokenAt && lastLeadAt) {
        lastAssignedAt = lastTokenAt > lastLeadAt ? lastTokenAt : lastLeadAt;
      } else {
        lastAssignedAt = lastTokenAt || lastLeadAt;
      }
    }

    return {
      id,
      name: (data['name'] as string) || 'Unknown',
      is_available: data['is_available'] !== undefined
        ? (data['is_available'] as boolean)
        : true, // Default: available (backward compat for existing employees)
      active_token_count: activeTokenCount,
      active_lead_count: activeLeadCount,
      workload: activeTokenCount + activeLeadCount,
      capacity: (data['capacity'] as number) || DEFAULT_CAPACITY,
      last_token_assigned_at: lastTokenAt,
      last_lead_assigned_at: lastLeadAt,
      last_assigned_at: lastAssignedAt,
      skills: Array.isArray(data['skills']) ? data['skills'] as string[] : [],
      role: (data['role'] as string) || 'employee',
    };
  }
}
