// ============================================================================
// Distribution Engine — Core Algorithm (Greedy Weighted Scoring)
// ============================================================================
// This file contains ZERO framework or database imports.
// It operates entirely on plain TypeScript data structures.
// All Firestore interaction happens in repository.ts.
//
// Algorithm: Greedy Weighted Scoring Assignment
//   → Greedy:   assign one request at a time, no backtracking
//   → Weighted: decision based on multi-factor numeric score
//   → Scoring:  skill_score, workload_ratio, availability baseline
//
// Complexity: O(n) per request, where n = number of employees
// ============================================================================

import { Employee, ScoredCandidate } from './models';
import {
  NoAvailableEmployeeError,
  CapacityExceededError,
} from './exceptions';

/** Algorithm identifier for audit trail */
export const ALGORITHM_NAME = 'greedy_weighted_scoring';

/**
 * Scoring weights — tunable constants.
 *
 * score = (W_SKILL × skill_score) − (W_WORKLOAD × workload_ratio) + (W_AVAILABILITY × 1.0)
 */
const W_SKILL = 0.6;
const W_WORKLOAD = 0.3;
const W_AVAILABILITY = 0.1;

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Greedy Weighted Scoring Assignment.
 *
 * For each request:
 *   1. Filter → availability
 *   2. Filter → capacity (workload < capacity)
 *   3. Filter → skill overlap > 0
 *   4. Score  → weighted multi-factor evaluation
 *   5. Select → argmax(score) with tie-breaking
 *
 * @param employees       Full list of employee records
 * @param requiredSkills  Skills the request demands (e.g. ['react', 'node'])
 * @returns ScoredCandidate — the selected employee and their computed score
 *
 * @throws NoAvailableEmployeeError — no employees with is_available === true
 * @throws CapacityExceededError    — all available employees are at capacity
 * @throws SkillMismatchError       — no employee has any matching skill
 */
export function pickEmployee(
  employees: Employee[],
  requiredSkills: string[] = []
): ScoredCandidate {
  // ── Step 1: Availability Filter ──────────────────────────────────────
  const available = employees.filter(e => e.is_available);

  if (available.length === 0) {
    throw new NoAvailableEmployeeError(
      'All employees are currently unavailable. Cannot assign job.'
    );
  }

  // ── Step 2: Capacity Filter ──────────────────────────────────────────
  // Hard constraint: workload must be strictly less than capacity
  const withinCapacity = available.filter(e => e.workload < e.capacity);

  if (withinCapacity.length === 0) {
    throw new CapacityExceededError(
      `All ${available.length} available employees are at full capacity.`
    );
  }

  // ── Step 3: Skill Overlap Filter ─────────────────────────────────────
  // We prefer candidates with at least one matching skill. However, if no
  // employee possesses the exact requested skills, we smoothly fall back to
  // all available employees within capacity rather than dropping the assignment.
  let candidates: Employee[];
  const hasSkillRequirement = requiredSkills.length > 0;

  if (hasSkillRequirement) {
    const skilledCandidates = withinCapacity.filter(e => countSkillOverlap(e, requiredSkills) > 0);
    
    // Fall back to anyone within capacity if no one has the required skills
    candidates = skilledCandidates.length > 0 ? skilledCandidates : withinCapacity;
  } else {
    candidates = withinCapacity;
  }

  // ── Step 4: Scoring ──────────────────────────────────────────────────
  const scored: ScoredCandidate[] = candidates.map(employee => ({
    employee,
    score: computeScore(employee, requiredSkills),
  }));

  // ── Step 5: Greedy Selection (argmax with tie-breaking) ──────────────
  scored.sort((a, b) => {
    // Primary: highest score wins
    if (a.score !== b.score) return b.score - a.score;

    // Tie-break 1: lower workload wins
    if (a.employee.workload !== b.employee.workload) {
      return a.employee.workload - b.employee.workload;
    }

    // Tie-break 2: older last_assigned_at wins (null = never assigned = epoch 0)
    const tA = a.employee.last_assigned_at
      ? new Date(a.employee.last_assigned_at).getTime()
      : 0;
    const tB = b.employee.last_assigned_at
      ? new Date(b.employee.last_assigned_at).getTime()
      : 0;

    return tA - tB;
  });

  return scored[0];
}

// ─── Scoring Functions (exported for testability) ────────────────────────

/**
 * Compute the final weighted score for a single employee.
 *
 * score = (W_SKILL × skill_score) − (W_WORKLOAD × workload_ratio) + (W_AVAILABILITY × 1.0)
 */
export function computeScore(employee: Employee, requiredSkills: string[]): number {
  const skillScore = computeSkillScore(employee, requiredSkills);
  const workloadRatio = computeWorkloadRatio(employee);
  const availabilityScore = 1.0; // Already filtered — all candidates are available

  return (W_SKILL * skillScore) - (W_WORKLOAD * workloadRatio) + (W_AVAILABILITY * availabilityScore);
}

/**
 * Skill score: fraction of required skills the employee possesses.
 *   matched_skills / total_required_skills
 *
 * Returns 0 if no skills are required (safe default).
 */
export function computeSkillScore(employee: Employee, requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 0;

  const matched = countSkillOverlap(employee, requiredSkills);
  return matched / requiredSkills.length;
}

/**
 * Workload ratio: how full is this employee?
 *   workload / capacity
 *
 * Higher = worse (more loaded). Always [0, 1) after capacity filter.
 */
export function computeWorkloadRatio(employee: Employee): number {
  if (employee.capacity <= 0) return 1; // Safety: treat zero/negative capacity as full
  return employee.workload / employee.capacity;
}

/**
 * Count how many of the required skills this employee has.
 * Case-insensitive comparison.
 */
export function countSkillOverlap(employee: Employee, requiredSkills: string[]): number {
  const employeeSkillsLower = new Set(employee.skills.map(s => s.toLowerCase()));
  return requiredSkills.filter(s => employeeSkillsLower.has(s.toLowerCase())).length;
}
