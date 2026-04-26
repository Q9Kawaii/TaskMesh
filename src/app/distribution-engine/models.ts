// ============================================================================
// Distribution Engine — Data Models
// ============================================================================
// Pure TypeScript interfaces used across the engine. No Firebase imports here.
// These map to Firestore document shapes but remain framework-agnostic.
// ============================================================================

/**
 * Represents an employee eligible for job assignment.
 * Maps to documents in the Firestore `users` collection where role === 'employee'.
 */
export interface Employee {
  /** Firestore document ID */
  id: string;

  /** Display name */
  name: string;

  /** Whether this employee is currently accepting new jobs */
  is_available: boolean;

  /** Number of currently active (open) token assignments */
  active_token_count: number;

  /** Number of currently active (open) lead assignments */
  active_lead_count: number;

  /**
   * Combined workload across all job types.
   * Computed as: active_token_count + active_lead_count
   */
  workload: number;

  /**
   * Maximum total jobs this employee can handle simultaneously.
   * Hard limit — employee is excluded from assignment when workload >= capacity.
   */
  capacity: number;

  /** ISO timestamp of the most recent token assignment, or null if never assigned */
  last_token_assigned_at: string | null;

  /** ISO timestamp of the most recent lead assignment, or null if never assigned */
  last_lead_assigned_at: string | null;

  /**
   * Unified last-assignment timestamp (most recent of token or lead).
   * Used for tie-breaking in the greedy algorithm.
   */
  last_assigned_at: string | null;

  /** Array of skill tags this employee can handle (e.g. ['web', 'mobile', 'design']) */
  skills: string[];

  /** Original role field from users collection */
  role: string;
}

/**
 * The type of job being distributed.
 */
export type JobType = 'token' | 'lead';

/**
 * How the assignment was made.
 */
export type AssignmentMethod = 'auto' | 'manual';

/**
 * An employee paired with their computed weighted score.
 * Output of the scoring step in the greedy algorithm.
 */
export interface ScoredCandidate {
  employee: Employee;
  score: number;
}

/**
 * Tracks the assignment of a token to an employee.
 * Maps to documents in the `token_assignments` Firestore collection.
 */
export interface TokenAssignment {
  /** Firestore document ID (auto-generated) */
  id?: string;

  /** Reference to the token/request ID */
  token_id: string;

  /** Reference to the assigned employee's user ID */
  employee_id: string;

  /** ISO timestamp when the assignment was made */
  assigned_at: string;

  /** ISO timestamp when the assignment was released, or null if still active */
  unassigned_at: string | null;

  /** Whether this was an automatic or manual assignment */
  assignment_method: AssignmentMethod;

  /** Snapshot of the weighted score at assignment time */
  score_snapshot: number;

  /** Algorithm used for this assignment */
  algorithm: string;
}

/**
 * Tracks the assignment of a lead to an employee.
 * Maps to documents in the `lead_assignments` Firestore collection.
 */
export interface LeadAssignment {
  /** Firestore document ID (auto-generated) */
  id?: string;

  /** Reference to the lead document ID */
  lead_id: string;

  /** Reference to the assigned employee's user ID */
  employee_id: string;

  /** ISO timestamp when the assignment was made */
  assigned_at: string;

  /** ISO timestamp when the assignment was released, or null if still active */
  unassigned_at: string | null;

  /** Whether this was an automatic or manual assignment */
  assignment_method: AssignmentMethod;

  /** Snapshot of the weighted score at assignment time */
  score_snapshot: number;

  /** Algorithm used for this assignment */
  algorithm: string;
}

/**
 * A pending token/request waiting to be assigned.
 * Simplified view of the existing `requests` collection documents.
 */
export interface PendingToken {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  type?: string;
  status: string;
  priority?: number;
  required_skills?: string[];
  created_at: number | { seconds: number };
  assignedTo?: string | null;
  assignedEmployee?: string | null;
}

/**
 * A pending lead waiting to be assigned.
 * Maps to the `leads` Firestore collection.
 */
export interface PendingLead {
  id: string;
  name?: string;
  email?: string;
  source?: string;
  status: string;
  priority?: number;
  required_skill?: string | null;
  required_skills?: string[];
  created_at: number | { seconds: number };
  assigned_employee?: string | null;
}

/**
 * Result returned after a successful assignment operation.
 */
export interface AssignmentResult {
  job_type: JobType;
  job_id: string;
  employee_id: string;
  employee_name: string;
  assigned_at: string;
  assignment_method: AssignmentMethod;
  /** Weighted score computed by the greedy algorithm */
  score_snapshot: number;
  /** Algorithm identifier */
  algorithm: string;
}
