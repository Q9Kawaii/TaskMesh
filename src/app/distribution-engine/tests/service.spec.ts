// ============================================================================
// Distribution Engine — Integration Tests for service.ts
// ============================================================================
// These tests verify the DistributionService orchestration logic by mocking
// the DistributionRepository (Firestore layer). The pure algorithm is NOT
// mocked — it runs for real so we test the full flow.
//
// Algorithm: Greedy Weighted Scoring Assignment
// ============================================================================

import { TestBed } from '@angular/core/testing';
import { DistributionService } from '../service';
import { DistributionRepository } from '../repository';
import { Employee, TokenAssignment, LeadAssignment } from '../models';
import { NoAvailableEmployeeError, CapacityExceededError } from '../exceptions';
import { ALGORITHM_NAME } from '../engine';

// ─── Mock Repository ───────────────────────────────────────────────────

class MockRepository {
  employees: Employee[] = [];
  tokenAssignments: { token_id: string; employee_id: string; method: string; score: number }[] = [];
  leadAssignments: { lead_id: string; employee_id: string; method: string; score: number }[] = [];
  releasedTokens: string[] = [];
  releasedLeads: string[] = [];
  incrementedTokenCounts: string[] = [];
  decrementedTokenCounts: string[] = [];
  incrementedLeadCounts: string[] = [];
  decrementedLeadCounts: string[] = [];

  async getActiveEmployees(): Promise<Employee[]> {
    return [...this.employees];
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    return this.employees.find(e => e.id === id) || null;
  }

  async createTokenAssignment(
    tokenId: string,
    employeeId: string,
    method: string,
    scoreSnapshot: number = 0
  ): Promise<TokenAssignment> {
    this.tokenAssignments.push({ token_id: tokenId, employee_id: employeeId, method, score: scoreSnapshot });
    return {
      id: `ta_${tokenId}`,
      token_id: tokenId,
      employee_id: employeeId,
      assigned_at: new Date().toISOString(),
      unassigned_at: null,
      assignment_method: method as any,
      score_snapshot: scoreSnapshot,
      algorithm: ALGORITHM_NAME,
    };
  }

  async createLeadAssignment(
    leadId: string,
    employeeId: string,
    method: string,
    scoreSnapshot: number = 0
  ): Promise<LeadAssignment> {
    this.leadAssignments.push({ lead_id: leadId, employee_id: employeeId, method, score: scoreSnapshot });
    return {
      id: `la_${leadId}`,
      lead_id: leadId,
      employee_id: employeeId,
      assigned_at: new Date().toISOString(),
      unassigned_at: null,
      assignment_method: method as any,
      score_snapshot: scoreSnapshot,
      algorithm: ALGORITHM_NAME,
    };
  }

  async releaseTokenAssignment(tokenId: string): Promise<string | null> {
    this.releasedTokens.push(tokenId);
    const assignment = this.tokenAssignments.find(a => a.token_id === tokenId);
    return assignment?.employee_id ?? 'mock-employee-id';
  }

  async releaseLeadAssignment(leadId: string): Promise<string | null> {
    this.releasedLeads.push(leadId);
    const assignment = this.leadAssignments.find(a => a.lead_id === leadId);
    return assignment?.employee_id ?? 'mock-employee-id';
  }

  async incrementTokenCount(employeeId: string): Promise<void> {
    this.incrementedTokenCounts.push(employeeId);
  }

  async decrementTokenCount(employeeId: string): Promise<void> {
    this.decrementedTokenCounts.push(employeeId);
  }

  async incrementLeadCount(employeeId: string): Promise<void> {
    this.incrementedLeadCounts.push(employeeId);
  }

  async decrementLeadCount(employeeId: string): Promise<void> {
    this.decrementedLeadCounts.push(employeeId);
  }

  async getUnassignedTokens() { return []; }
  async getUnassignedLeads() { return []; }
}

// ─── Helper ────────────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<Employee> & { id: string }): Employee {
  const activeTokenCount = overrides.active_token_count ?? 0;
  const activeLeadCount = overrides.active_lead_count ?? 0;
  return {
    name: overrides.name ?? `Employee ${overrides.id}`,
    is_available: true,
    active_token_count: activeTokenCount,
    active_lead_count: activeLeadCount,
    workload: overrides.workload ?? (activeTokenCount + activeLeadCount),
    capacity: overrides.capacity ?? 10,
    last_token_assigned_at: null,
    last_lead_assigned_at: null,
    last_assigned_at: null,
    skills: [],
    role: 'employee',
    ...overrides,
  };
}

// ─── Test Suite ────────────────────────────────────────────────────────

describe('DistributionService (Greedy Weighted Scoring)', () => {
  let service: DistributionService;
  let mockRepo: MockRepository;

  beforeEach(() => {
    mockRepo = new MockRepository();

    TestBed.configureTestingModule({
      providers: [
        DistributionService,
        { provide: DistributionRepository, useValue: mockRepo },
      ],
    });

    service = TestBed.inject(DistributionService);
  });

  // ── assignToken ─────────────────────────────────────────────────────

  describe('assignToken', () => {

    it('should assign a token to the best-scored employee', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', name: 'Alice', skills: ['web'], workload: 5, capacity: 10 }),
        makeEmployee({ id: 'e2', name: 'Bob', skills: ['web'], workload: 1, capacity: 10 }),
      ];

      const result = await service.assignToken('token-42', ['web']);

      expect(result.employee_id).toBe('e2'); // lower workload → higher score
      expect(result.job_type).toBe('token');
      expect(result.assignment_method).toBe('auto');
      expect(result.algorithm).toBe(ALGORITHM_NAME);
      expect(result.score_snapshot).toBeGreaterThan(0);
      expect(mockRepo.tokenAssignments).toHaveLength(1);
      expect(mockRepo.incrementedTokenCounts).toContain('e2');
    });

    it('should include score_snapshot and algorithm in result', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', skills: ['react', 'node'], workload: 0, capacity: 10 }),
      ];

      const result = await service.assignToken('token-1', ['react', 'node']);

      expect(result.score_snapshot).toBeCloseTo(0.7, 4);
      expect(result.algorithm).toBe('greedy_weighted_scoring');
    });

    it('should throw when no employees exist', async () => {
      mockRepo.employees = [];

      await expectAsync(service.assignToken('token-1'))
        .toBeRejectedWithError(/No employees/i);
    });

    it('should throw when all employees are unavailable', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', is_available: false }),
        makeEmployee({ id: 'e2', is_available: false }),
      ];

      await expectAsync(service.assignToken('token-1'))
        .toBeRejected();
    });

    it('should pass required skills array to the engine', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', workload: 0, capacity: 10, skills: ['design'] }),
        makeEmployee({ id: 'e2', workload: 1, capacity: 10, skills: ['react', 'node'] }),
      ];

      const result = await service.assignToken('token-1', ['react', 'node']);
      expect(result.employee_id).toBe('e2');
    });

    it('should work with empty skills (no skill filter)', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', workload: 0, capacity: 10, skills: [] }),
        makeEmployee({ id: 'e2', workload: 3, capacity: 10, skills: ['web'] }),
      ];

      const result = await service.assignToken('token-1', []);
      expect(result.employee_id).toBe('e1'); // lower workload ratio
    });
  });

  // ── assignLead ──────────────────────────────────────────────────────

  describe('assignLead', () => {

    it('should assign a lead using the greedy weighted scoring', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', skills: ['sales'], workload: 4, capacity: 10 }),
        makeEmployee({ id: 'e2', skills: ['sales'], workload: 2, capacity: 10 }),
      ];

      const result = await service.assignLead('lead-7', ['sales']);

      expect(result.employee_id).toBe('e2');
      expect(result.job_type).toBe('lead');
      expect(result.algorithm).toBe(ALGORITHM_NAME);
      expect(mockRepo.leadAssignments).toHaveLength(1);
      expect(mockRepo.incrementedLeadCounts).toContain('e2');
    });
  });

  // ── releaseToken ────────────────────────────────────────────────────

  describe('releaseToken', () => {

    it('should release the assignment and decrement the employee count', async () => {
      mockRepo.employees = [makeEmployee({ id: 'e1', skills: ['web'], workload: 0, capacity: 10 })];
      await service.assignToken('token-99', ['web']);

      await service.releaseToken('token-99');

      expect(mockRepo.releasedTokens).toContain('token-99');
      expect(mockRepo.decrementedTokenCounts.length).toBeGreaterThan(0);
    });
  });

  // ── releaseLead ─────────────────────────────────────────────────────

  describe('releaseLead', () => {

    it('should release the assignment and decrement the employee count', async () => {
      mockRepo.employees = [makeEmployee({ id: 'e1', skills: ['sales'], workload: 0, capacity: 10 })];
      await service.assignLead('lead-50', ['sales']);
      await service.releaseLead('lead-50');

      expect(mockRepo.releasedLeads).toContain('lead-50');
      expect(mockRepo.decrementedLeadCounts.length).toBeGreaterThan(0);
    });
  });

  // ── reassignToken ───────────────────────────────────────────────────

  describe('reassignToken (manual)', () => {

    it('should release old assignment and create a new manual one', async () => {
      mockRepo.employees = [
        makeEmployee({ id: 'e1', name: 'Alice', skills: ['web'], workload: 0, capacity: 10 }),
        makeEmployee({ id: 'e2', name: 'Bob', skills: ['web'], workload: 0, capacity: 10 }),
      ];

      await service.assignToken('token-10', ['web']);

      const result = await service.reassignToken('token-10', 'e2');

      expect(result.employee_id).toBe('e2');
      expect(result.assignment_method).toBe('manual');
      expect(result.algorithm).toBe('manual');
      expect(result.score_snapshot).toBe(0);
      expect(mockRepo.releasedTokens).toContain('token-10');
      expect(mockRepo.incrementedTokenCounts).toContain('e2');
      expect(mockRepo.decrementedTokenCounts.length).toBeGreaterThan(0);
    });
  });

  // ── Workload count accuracy ─────────────────────────────────────────

  describe('Workload count accuracy', () => {

    it('should increment on assign and decrement on release for tokens', async () => {
      mockRepo.employees = [makeEmployee({ id: 'e1', skills: ['web'], workload: 0, capacity: 10 })];

      await service.assignToken('t1', ['web']);
      await service.assignToken('t2', ['web']);
      expect(mockRepo.incrementedTokenCounts.filter(id => id === 'e1').length).toBe(2);

      await service.releaseToken('t1');
      expect(mockRepo.decrementedTokenCounts.length).toBe(1);
    });

    it('should increment on assign and decrement on release for leads', async () => {
      mockRepo.employees = [makeEmployee({ id: 'e1', skills: ['sales'], workload: 0, capacity: 10 })];

      await service.assignLead('l1', ['sales']);
      expect(mockRepo.incrementedLeadCounts).toContain('e1');

      await service.releaseLead('l1');
      expect(mockRepo.decrementedLeadCounts.length).toBe(1);
    });
  });
});
