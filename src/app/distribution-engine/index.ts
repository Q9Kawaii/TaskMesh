// ============================================================================
// Distribution Engine — Public API (Barrel Export)
// ============================================================================
// Import from '@app/distribution-engine' to access anything you need.
// ============================================================================

// Models (type-only exports for isolatedModules compatibility)
export type {
  Employee,
  JobType,
  AssignmentMethod,
  ScoredCandidate,
  TokenAssignment,
  LeadAssignment,
  PendingToken,
  PendingLead,
  AssignmentResult,
} from './models';

// Exceptions
export {
  NoAvailableEmployeeError,
  SkillMismatchError,
  CapacityExceededError,
  AssignmentNotFoundError,
} from './exceptions';

// Pure Algorithm
export { pickEmployee, computeScore, computeSkillScore, computeWorkloadRatio, countSkillOverlap, ALGORITHM_NAME } from './engine';

// Repository (Firestore layer)
export { DistributionRepository } from './repository';

// Service (Orchestrator — primary entry point)
export { DistributionService } from './service';

// Listeners (Real-time triggers)
export { DistributionListeners } from './listeners';
