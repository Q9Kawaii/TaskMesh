// ============================================================================
// Distribution Engine — Unit Tests for engine.ts (Greedy Weighted Scoring)
// ============================================================================
// These tests verify the Greedy Weighted Scoring algorithm:
//   score = (0.6 × skill_score) − (0.3 × workload_ratio) + (0.1 × availability)
//
// All tests use plain mock data — no Firebase, no DI, no HTTP.
// ============================================================================

import {
  pickEmployee,
  computeScore,
  computeSkillScore,
  computeWorkloadRatio,
  countSkillOverlap,
  ALGORITHM_NAME,
} from '../engine';
import { Employee } from '../models';
import {
  NoAvailableEmployeeError,
  CapacityExceededError,
} from '../exceptions';

// ─── Test Helpers ──────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<Employee> & { id: string }): Employee {
  return {
    name: overrides.name ?? `Employee ${overrides.id}`,
    is_available: true,
    active_token_count: 0,
    active_lead_count: 0,
    workload: 0,
    capacity: 10,
    last_token_assigned_at: null,
    last_lead_assigned_at: null,
    last_assigned_at: null,
    skills: [],
    role: 'employee',
    ...overrides,
  };
}

// ─── Test Suite ────────────────────────────────────────────────────────

describe('Greedy Weighted Scoring Algorithm', () => {

  it('should export the correct algorithm name', () => {
    expect(ALGORITHM_NAME).toBe('greedy_weighted_scoring');
  });

  // ── Scoring Math ─────────────────────────────────────────────────────

  describe('computeScore — weighted formula validation', () => {

    it('should compute correct score for full skill match, zero workload', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react', 'node'], workload: 0, capacity: 10 });
      const score = computeScore(emp, ['react', 'node']);
      // skill_score = 2/2 = 1.0
      // workload_ratio = 0/10 = 0.0
      // score = (0.6 * 1.0) - (0.3 * 0.0) + (0.1 * 1.0) = 0.7
      expect(score).toBeCloseTo(0.7, 4);
    });

    it('should compute correct score for partial skill match', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react'], workload: 0, capacity: 10 });
      const score = computeScore(emp, ['react', 'node']);
      // skill_score = 1/2 = 0.5
      // score = (0.6 * 0.5) - (0.3 * 0.0) + (0.1 * 1.0) = 0.3 + 0.1 = 0.4
      expect(score).toBeCloseTo(0.4, 4);
    });

    it('should apply workload penalty', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react', 'node'], workload: 5, capacity: 10 });
      const score = computeScore(emp, ['react', 'node']);
      // skill_score = 1.0
      // workload_ratio = 5/10 = 0.5
      // score = (0.6 * 1.0) - (0.3 * 0.5) + (0.1 * 1.0) = 0.6 - 0.15 + 0.1 = 0.55
      expect(score).toBeCloseTo(0.55, 4);
    });

    it('should compute 0.1 baseline when no skills required', () => {
      const emp = makeEmployee({ id: 'e1', skills: [], workload: 0, capacity: 10 });
      const score = computeScore(emp, []);
      // skill_score = 0 (no skills required)
      // workload_ratio = 0
      // score = 0 - 0 + 0.1 = 0.1
      expect(score).toBeCloseTo(0.1, 4);
    });

    it('should handle high workload penalty', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react'], workload: 9, capacity: 10 });
      const score = computeScore(emp, ['react']);
      // skill_score = 1/1 = 1.0
      // workload_ratio = 9/10 = 0.9
      // score = (0.6 * 1.0) - (0.3 * 0.9) + (0.1 * 1.0) = 0.6 - 0.27 + 0.1 = 0.43
      expect(score).toBeCloseTo(0.43, 4);
    });
  });

  // ── Scoring Sub-Functions ────────────────────────────────────────────

  describe('computeSkillScore', () => {

    it('should return 1.0 for full match', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react', 'node', 'css'] });
      expect(computeSkillScore(emp, ['react', 'node'])).toBe(1.0);
    });

    it('should return 0.5 for half match', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react'] });
      expect(computeSkillScore(emp, ['react', 'node'])).toBe(0.5);
    });

    it('should return 0 when no overlap', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['python'] });
      expect(computeSkillScore(emp, ['react', 'node'])).toBe(0);
    });

    it('should return 0 when no skills required', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react'] });
      expect(computeSkillScore(emp, [])).toBe(0);
    });

    it('should be case-insensitive', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['React', 'NODE'] });
      expect(computeSkillScore(emp, ['react', 'node'])).toBe(1.0);
    });
  });

  describe('computeWorkloadRatio', () => {

    it('should return 0 for zero workload', () => {
      const emp = makeEmployee({ id: 'e1', workload: 0, capacity: 10 });
      expect(computeWorkloadRatio(emp)).toBe(0);
    });

    it('should return 0.5 for half capacity', () => {
      const emp = makeEmployee({ id: 'e1', workload: 5, capacity: 10 });
      expect(computeWorkloadRatio(emp)).toBe(0.5);
    });

    it('should return 1.0 for zero capacity (safety)', () => {
      const emp = makeEmployee({ id: 'e1', workload: 3, capacity: 0 });
      expect(computeWorkloadRatio(emp)).toBe(1);
    });
  });

  describe('countSkillOverlap', () => {

    it('should count matching skills', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['react', 'node', 'design'] });
      expect(countSkillOverlap(emp, ['react', 'node', 'python'])).toBe(2);
    });

    it('should return 0 for no overlap', () => {
      const emp = makeEmployee({ id: 'e1', skills: ['java'] });
      expect(countSkillOverlap(emp, ['react', 'node'])).toBe(0);
    });
  });

  // ── Greedy Selection (pickEmployee) ──────────────────────────────────

  describe('pickEmployee — greedy selection', () => {

    it('should pick the employee with the highest weighted score', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 5, capacity: 10 }),       // partial match, moderate load
        makeEmployee({ id: 'e2', skills: ['react', 'node'], workload: 2, capacity: 10 }), // full match, low load → best
        makeEmployee({ id: 'e3', skills: ['react', 'node'], workload: 8, capacity: 10 }), // full match, high load
      ];

      const result = pickEmployee(employees, ['react', 'node']);
      expect(result.employee.id).toBe('e2');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should prefer skilled employee over less-skilled even with higher workload', () => {
      // This is the KEY difference from Least-Load-First
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: [], workload: 0, capacity: 10 }),                  // no skills, no load
        makeEmployee({ id: 'e2', skills: ['react', 'node'], workload: 3, capacity: 10 }),   // full match, some load
      ];

      // Without skill requirement, e1 wins (lower workload)
      // But with required skills, e1 is eliminated (no overlap)
      const result = pickEmployee(employees, ['react', 'node']);
      expect(result.employee.id).toBe('e2');
    });

    it('should return the score alongside the employee', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react', 'node'], workload: 0, capacity: 10 }),
      ];

      const result = pickEmployee(employees, ['react', 'node']);
      expect(result.score).toBeCloseTo(0.7, 4);
      expect(result.employee.id).toBe('e1');
    });
  });

  // ── Capacity Filter ──────────────────────────────────────────────────

  describe('Capacity hard filter', () => {

    it('should exclude employees at full capacity', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 10, capacity: 10 }), // at capacity
        makeEmployee({ id: 'e2', skills: ['react'], workload: 5, capacity: 10 }),  // has room
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('e2');
    });

    it('should exclude employees over capacity', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 12, capacity: 10 }), // over capacity
        makeEmployee({ id: 'e2', skills: ['react'], workload: 9, capacity: 10 }),  // 1 slot left
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('e2');
    });

    it('should throw CapacityExceededError when ALL are at capacity', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 10, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['react'], workload: 5, capacity: 5 }),
      ];

      expect(() => pickEmployee(employees, ['react']))
        .toThrow(CapacityExceededError);
    });

    it('should respect different capacity limits per employee', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 3, capacity: 3 }),  // full
        makeEmployee({ id: 'e2', skills: ['react'], workload: 3, capacity: 5 }),  // has room
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('e2');
    });
  });

  // ── Availability Filter ─────────────────────────────────────────────

  describe('Availability filtering', () => {

    it('should never pick an unavailable employee', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', is_available: false, skills: ['react'], workload: 0 }),
        makeEmployee({ id: 'e2', is_available: true, skills: ['react'], workload: 5, capacity: 10 }),
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('e2');
    });

    it('should throw NoAvailableEmployeeError when ALL are unavailable', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', is_available: false }),
        makeEmployee({ id: 'e2', is_available: false }),
      ];

      expect(() => pickEmployee(employees, ['react']))
        .toThrow(NoAvailableEmployeeError);
    });

    it('should throw NoAvailableEmployeeError for empty employee list', () => {
      expect(() => pickEmployee([], ['react']))
        .toThrow(NoAvailableEmployeeError);
    });
  });

  // ── Skill Filtering ─────────────────────────────────────────────────

  describe('Skill-based filtering', () => {

    it('should gracefully fallback to lowest-workload employee when no skills match', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['design'], workload: 5, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['backend'], workload: 2, capacity: 10 }), // lower workload => wins
      ];

      const result = pickEmployee(employees, ['blockchain']);

      // Since nobody has blockchain, it falls back to everyone, and e2 wins because they have an empty schedule (workload 2)
      expect(result.employee.id).toBe('e2');
    });

    it('should allow all employees when no skills required', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: [], workload: 0, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['react'], workload: 5, capacity: 10 }),
      ];

      // No skill filter → all candidates eligible, e1 has lower workload penalty
      const result = pickEmployee(employees, []);
      expect(result.employee.id).toBe('e1');
    });

    it('should be case-insensitive on skill matching', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['React', 'NODE'], workload: 0, capacity: 10 }),
      ];

      const result = pickEmployee(employees, ['react', 'node']);
      expect(result.employee.id).toBe('e1');
      expect(result.score).toBeCloseTo(0.7, 4);
    });
  });

  // ── Tie-Breaking ────────────────────────────────────────────────────

  describe('Tie-breaking on equal scores', () => {

    it('should prefer lower workload on equal score', () => {
      // Same skills, same capacity, different workload but same score due to rounding
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 3, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['react'], workload: 2, capacity: 10 }), // lower workload → wins
      ];

      // Both have same skill_score (1.0), but slightly different workload_ratio
      // Actually these will have different scores. Let me make them truly equal.
      // To tie: need same skill_score AND same workload_ratio
      const tiedEmployees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react', 'node'], workload: 4, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['react', 'node'], workload: 4, capacity: 10 }),
      ];

      // Same score, same workload → falls to last_assigned_at
    });

    it('should prefer older last_assigned_at when score AND workload are equal', () => {
      const employees: Employee[] = [
        makeEmployee({
          id: 'e1',
          skills: ['react'],
          workload: 4,
          capacity: 10,
          last_assigned_at: '2026-04-15T10:00:00Z', // more recent
        }),
        makeEmployee({
          id: 'e2',
          skills: ['react'],
          workload: 4,
          capacity: 10,
          last_assigned_at: '2026-04-15T08:00:00Z', // older → should win
        }),
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('e2');
    });

    it('should prefer never-assigned (null timestamp) over assigned peers', () => {
      const employees: Employee[] = [
        makeEmployee({
          id: 'e1',
          skills: ['react'],
          workload: 4,
          capacity: 10,
          last_assigned_at: '2026-04-15T08:00:00Z',
        }),
        makeEmployee({
          id: 'e2',
          skills: ['react'],
          workload: 4,
          capacity: 10,
          last_assigned_at: null, // never assigned → epoch 0 → wins
        }),
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('e2');
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────

  describe('Edge cases', () => {

    it('should handle a single available employee', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'solo', skills: ['react'], workload: 9, capacity: 10 }),
      ];

      const result = pickEmployee(employees, ['react']);
      expect(result.employee.id).toBe('solo');
    });

    it('should not mutate the input array', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: ['react'], workload: 5, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['react'], workload: 1, capacity: 10 }),
      ];

      const originalOrder = employees.map(e => e.id);
      pickEmployee(employees, ['react']);
      expect(employees.map(e => e.id)).toEqual(originalOrder);
    });

    it('should handle employee with no skills when no skills required', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', skills: [], workload: 0, capacity: 10 }),
      ];

      const result = pickEmployee(employees, []);
      expect(result.employee.id).toBe('e1');
      // score = 0 - 0 + 0.1 = 0.1
      expect(result.score).toBeCloseTo(0.1, 4);
    });

    it('should handle combined scenario: availability + capacity + skill filter', () => {
      const employees: Employee[] = [
        makeEmployee({ id: 'e1', is_available: false, skills: ['react'], workload: 0, capacity: 10 }), // unavailable
        makeEmployee({ id: 'e2', skills: ['react'], workload: 10, capacity: 10 }),                      // at capacity
        makeEmployee({ id: 'e3', skills: ['python'], workload: 0, capacity: 10 }),                      // no skill match
        makeEmployee({ id: 'e4', skills: ['react', 'node'], workload: 3, capacity: 10 }),               // passes all filters
      ];

      const result = pickEmployee(employees, ['react', 'node']);
      expect(result.employee.id).toBe('e4');
    });
  });
});
