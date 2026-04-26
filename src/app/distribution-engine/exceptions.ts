// ============================================================================
// Distribution Engine — Custom Exceptions
// ============================================================================

/**
 * Thrown when no available employee can be found to handle a job.
 * This is a CRITICAL error — the system must log it prominently.
 */
export class NoAvailableEmployeeError extends Error {
  public readonly code = 'NO_AVAILABLE_EMPLOYEE';

  constructor(message?: string) {
    super(message ?? 'No available employee found to handle assignment.');
    this.name = 'NoAvailableEmployeeError';
    Object.setPrototypeOf(this, NoAvailableEmployeeError.prototype);
  }
}

/**
 * Thrown when a job requires specific skills but no employee has any overlap.
 */
export class SkillMismatchError extends Error {
  public readonly code = 'SKILL_MISMATCH';
  public readonly requiredSkills: string[];

  constructor(requiredSkills: string | string[]) {
    const skills = Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills];
    super(`No available employee with any of the required skills: [${skills.join(', ')}].`);
    this.name = 'SkillMismatchError';
    this.requiredSkills = skills;
    Object.setPrototypeOf(this, SkillMismatchError.prototype);
  }
}

/**
 * Thrown when all eligible employees have reached their capacity limit.
 * workload >= capacity for every candidate.
 */
export class CapacityExceededError extends Error {
  public readonly code = 'CAPACITY_EXCEEDED';

  constructor(message?: string) {
    super(message ?? 'All eligible employees are at full capacity.');
    this.name = 'CapacityExceededError';
    Object.setPrototypeOf(this, CapacityExceededError.prototype);
  }
}

/**
 * Thrown when trying to release an assignment that doesn't exist.
 */
export class AssignmentNotFoundError extends Error {
  public readonly code = 'ASSIGNMENT_NOT_FOUND';

  constructor(jobType: string, jobId: string) {
    super(`No active ${jobType} assignment found for job ID: "${jobId}".`);
    this.name = 'AssignmentNotFoundError';
    Object.setPrototypeOf(this, AssignmentNotFoundError.prototype);
  }
}
