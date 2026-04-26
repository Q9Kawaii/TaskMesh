// ============================================================================
// Distribution Engine — Service (Orchestrator)
// ============================================================================
// This is the public API of the distribution engine. It coordinates between
// the pure algorithm (engine.ts) and the database layer (repository.ts).
// Other parts of the application should only import this service.
//
// Algorithm: Greedy Weighted Scoring Assignment
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { pickEmployee, ALGORITHM_NAME } from './engine';
import { DistributionRepository } from './repository';
import {
  AssignmentResult,
  TokenAssignment,
  LeadAssignment,
} from './models';
import {
  NoAvailableEmployeeError,
  AssignmentNotFoundError,
} from './exceptions';

@Injectable({ providedIn: 'root' })
export class DistributionService {
  private repo = inject(DistributionRepository);

  // ─── Token Assignment ────────────────────────────────────────────────

  /**
   * Automatically assign a token to the best-fit employee using
   * Greedy Weighted Scoring.
   *
   * @param tokenId        The request/token document ID
   * @param requiredSkills Skills this request demands (e.g. ['react', 'node'])
   * @returns AssignmentResult with score snapshot and algorithm identifier
   * @throws NoAvailableEmployeeError
   * @throws CapacityExceededError
   * @throws SkillMismatchError
   */
  async assignToken(
    tokenId: string,
    requiredSkills: string[] = []
  ): Promise<AssignmentResult> {
    console.log(
      `🤖 [DistributionEngine] Assigning token: ${tokenId}` +
      (requiredSkills.length > 0 ? ` (skills: [${requiredSkills.join(', ')}])` : '')
    );

    // 1. Fetch all employees
    const employees = await this.repo.getActiveEmployees();

    if (employees.length === 0) {
      const err = new NoAvailableEmployeeError(
        'CRITICAL: No employees exist in the system.'
      );
      console.error(`🚨 [DistributionEngine] ${err.message}`);
      throw err;
    }

    // 2. Run the greedy weighted scoring algorithm
    let result;
    try {
      result = pickEmployee(employees, requiredSkills);
    } catch (error) {
      console.error(`🚨 [DistributionEngine] Assignment failed:`, error);
      throw error;
    }

    const { employee: selected, score } = result;

    // 3. Create the assignment record (with score snapshot)
    const assignment = await this.repo.createTokenAssignment(
      tokenId,
      selected.id,
      selected.name,
      'auto',
      score
    );

    // 4. Increment the employee's workload counter
    await this.repo.incrementTokenCount(selected.id);

    console.log(
      `✅ [DistributionEngine] Token ${tokenId} → ${selected.name} ` +
      `(score: ${score.toFixed(4)}, load: ${selected.workload + 1}/${selected.capacity}, ` +
      `algorithm: ${ALGORITHM_NAME})`
    );

    return {
      job_type: 'token',
      job_id: tokenId,
      employee_id: selected.id,
      employee_name: selected.name,
      assigned_at: assignment.assigned_at,
      assignment_method: 'auto',
      score_snapshot: score,
      algorithm: ALGORITHM_NAME,
    };
  }

  // ─── Lead Assignment ─────────────────────────────────────────────────

  /**
   * Automatically assign a lead to the best-fit employee using
   * Greedy Weighted Scoring.
   */
  async assignLead(
    leadId: string,
    requiredSkills: string[] = []
  ): Promise<AssignmentResult> {
    console.log(
      `🤖 [DistributionEngine] Assigning lead: ${leadId}` +
      (requiredSkills.length > 0 ? ` (skills: [${requiredSkills.join(', ')}])` : '')
    );

    const employees = await this.repo.getActiveEmployees();

    if (employees.length === 0) {
      const err = new NoAvailableEmployeeError(
        'CRITICAL: No employees exist in the system.'
      );
      console.error(`🚨 [DistributionEngine] ${err.message}`);
      throw err;
    }

    let result;
    try {
      result = pickEmployee(employees, requiredSkills);
    } catch (error) {
      console.error(`🚨 [DistributionEngine] Lead assignment failed:`, error);
      throw error;
    }

    const { employee: selected, score } = result;

    const assignment = await this.repo.createLeadAssignment(
      leadId,
      selected.id,
      selected.name,
      'auto',
      score
    );

    await this.repo.incrementLeadCount(selected.id);

    console.log(
      `✅ [DistributionEngine] Lead ${leadId} → ${selected.name} ` +
      `(score: ${score.toFixed(4)}, load: ${selected.workload + 1}/${selected.capacity}, ` +
      `algorithm: ${ALGORITHM_NAME})`
    );

    return {
      job_type: 'lead',
      job_id: leadId,
      employee_id: selected.id,
      employee_name: selected.name,
      assigned_at: assignment.assigned_at,
      assignment_method: 'auto',
      score_snapshot: score,
      algorithm: ALGORITHM_NAME,
    };
  }

  // ─── Release Operations ──────────────────────────────────────────────

  /**
   * Release a token assignment when the token is closed/resolved.
   * Decrements the employee's active_token_count.
   */
  async releaseToken(tokenId: string): Promise<void> {
    console.log(`🤖 [DistributionEngine] Releasing token: ${tokenId}`);

    const employeeId = await this.repo.releaseTokenAssignment(tokenId);

    if (!employeeId) {
      console.warn(
        `⚠️ [DistributionEngine] No active assignment found for token ${tokenId}`
      );
      return; // Graceful no-op — might have been manually unassigned
    }

    await this.repo.decrementTokenCount(employeeId);

    console.log(
      `✅ [DistributionEngine] Token ${tokenId} released from employee ${employeeId}`
    );
  }

  /**
   * Release a lead assignment when the lead is converted or archived.
   * Decrements the employee's active_lead_count.
   */
  async releaseLead(leadId: string): Promise<void> {
    console.log(`🤖 [DistributionEngine] Releasing lead: ${leadId}`);

    const employeeId = await this.repo.releaseLeadAssignment(leadId);

    if (!employeeId) {
      console.warn(
        `⚠️ [DistributionEngine] No active assignment found for lead ${leadId}`
      );
      return;
    }

    await this.repo.decrementLeadCount(employeeId);

    console.log(
      `✅ [DistributionEngine] Lead ${leadId} released from employee ${employeeId}`
    );
  }

  // ─── Manual Reassignment ────────────────────────────────────────────

  /**
   * Manually reassign a token from one employee to another.
   * Properly releases the old assignment and creates a new one,
   * keeping all workload counts accurate.
   */
  async reassignToken(
    tokenId: string,
    newEmployeeId: string
  ): Promise<AssignmentResult> {
    console.log(
      `🤖 [DistributionEngine] Manual reassign token ${tokenId} → ${newEmployeeId}`
    );

    // Release old assignment (if any)
    const oldEmployeeId = await this.repo.releaseTokenAssignment(tokenId);
    if (oldEmployeeId) {
      await this.repo.decrementTokenCount(oldEmployeeId);
    }

    const employee = await this.repo.getEmployeeById(newEmployeeId);

    // Create new manual assignment (score = 0 for manual, no algorithm ran)
    const assignment = await this.repo.createTokenAssignment(
      tokenId,
      newEmployeeId,
      employee?.name ?? 'Unknown',
      'manual',
      0
    );
    await this.repo.incrementTokenCount(newEmployeeId);

    return {
      job_type: 'token',
      job_id: tokenId,
      employee_id: newEmployeeId,
      employee_name: employee?.name ?? 'Unknown',
      assigned_at: assignment.assigned_at,
      assignment_method: 'manual',
      score_snapshot: 0,
      algorithm: 'manual',
    };
  }

  /**
   * Manually reassign a lead from one employee to another.
   */
  async reassignLead(
    leadId: string,
    newEmployeeId: string
  ): Promise<AssignmentResult> {
    console.log(
      `🤖 [DistributionEngine] Manual reassign lead ${leadId} → ${newEmployeeId}`
    );

    const oldEmployeeId = await this.repo.releaseLeadAssignment(leadId);
    if (oldEmployeeId) {
      await this.repo.decrementLeadCount(oldEmployeeId);
    }

    const employee = await this.repo.getEmployeeById(newEmployeeId);

    const assignment = await this.repo.createLeadAssignment(
      leadId,
      newEmployeeId,
      employee?.name ?? 'Unknown',
      'manual',
      0
    );
    await this.repo.incrementLeadCount(newEmployeeId);

    return {
      job_type: 'lead',
      job_id: leadId,
      employee_id: newEmployeeId,
      employee_name: employee?.name ?? 'Unknown',
      assigned_at: assignment.assigned_at,
      assignment_method: 'manual',
      score_snapshot: 0,
      algorithm: 'manual',
    };
  }

  // ─── Bulk Distribution ───────────────────────────────────────────────

  /**
   * Distribute all currently unassigned tokens and leads.
   * Equivalent to the `manage.py distribute_pending` management command.
   *
   * Processes items in order: highest priority first, then oldest created first.
   * Returns a summary of successful and failed assignments.
   */
  async distributePending(): Promise<{
    tokens: { success: number; failed: number; errors: string[] };
    leads: { success: number; failed: number; errors: string[] };
  }> {
    console.log('🤖 [DistributionEngine] ═══ Bulk Distribution Started ═══');

    const result = {
      tokens: { success: 0, failed: 0, errors: [] as string[] },
      leads: { success: 0, failed: 0, errors: [] as string[] },
    };

    // ── Distribute Tokens ──
    try {
      const pendingTokens = await this.repo.getUnassignedTokens();
      console.log(`🤖 [DistributionEngine] Found ${pendingTokens.length} unassigned tokens`);

      // Sort: priority DESC, created_at ASC
      pendingTokens.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pB !== pA) return pB - pA;

        const tA = typeof a.created_at === 'number' ? a.created_at :
          (a.created_at as any)?.seconds ? (a.created_at as any).seconds * 1000 : 0;
        const tB = typeof b.created_at === 'number' ? b.created_at :
          (b.created_at as any)?.seconds ? (b.created_at as any).seconds * 1000 : 0;
        return tA - tB;
      });

      for (const token of pendingTokens) {
        try {
          // Extract required_skills: prefer array, fall back to category/type as single-skill
          const skills = this.extractSkills(token.required_skills, token.category || token.type);
          await this.assignToken(token.id, skills);
          result.tokens.success++;
        } catch (err: any) {
          result.tokens.failed++;
          result.tokens.errors.push(`Token ${token.id}: ${err.message}`);
          console.error(`🚨 [DistributionEngine] Failed to assign token ${token.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('🚨 [DistributionEngine] Failed to query pending tokens:', err);
    }

    // ── Distribute Leads ──
    try {
      const pendingLeads = await this.repo.getUnassignedLeads();
      console.log(`🤖 [DistributionEngine] Found ${pendingLeads.length} unassigned leads`);

      pendingLeads.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pB !== pA) return pB - pA;

        const tA = typeof a.created_at === 'number' ? a.created_at :
          (a.created_at as any)?.seconds ? (a.created_at as any).seconds * 1000 : 0;
        const tB = typeof b.created_at === 'number' ? b.created_at :
          (b.created_at as any)?.seconds ? (b.created_at as any).seconds * 1000 : 0;
        return tA - tB;
      });

      for (const lead of pendingLeads) {
        try {
          const skills = this.extractSkills(lead.required_skills, lead.required_skill);
          await this.assignLead(lead.id, skills);
          result.leads.success++;
        } catch (err: any) {
          result.leads.failed++;
          result.leads.errors.push(`Lead ${lead.id}: ${err.message}`);
          console.error(`🚨 [DistributionEngine] Failed to assign lead ${lead.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('🚨 [DistributionEngine] Failed to query pending leads:', err);
    }

    console.log(
      `🤖 [DistributionEngine] ═══ Bulk Distribution Complete ═══\n` +
      `   Tokens: ${result.tokens.success} assigned, ${result.tokens.failed} failed\n` +
      `   Leads:  ${result.leads.success} assigned, ${result.leads.failed} failed`
    );

    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Extract required skills from document data.
   * Prefers `required_skills[]` array, falls back to wrapping a single
   * skill string in an array. Returns empty array if nothing available.
   */
  private extractSkills(
    skillsArray?: string[] | null,
    singleSkill?: string | null
  ): string[] {
    if (Array.isArray(skillsArray) && skillsArray.length > 0) {
      return skillsArray;
    }
    if (singleSkill && typeof singleSkill === 'string') {
      return [singleSkill];
    }
    return [];
  }
}
