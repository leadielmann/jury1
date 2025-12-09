/**
 * Complete grading result combining structural analysis and execution tests
 */
export interface GradingResult {
  finalScore: number; // 0-100 (30% structural + 70% execution)
  structural: {
    score: number; // 0-30
    maxScore: number; // 30
    percentage: number; // 0-100
  };
  execution: {
    score: number; // 0-70
    maxScore: number; // 70
    percentage: number; // 0-100
  };
  passed: boolean; // Overall pass/fail (typically finalScore >= 60)
  feedback: string[]; // Human-readable feedback
  timestamp: Date;
}

/**
 * Grading criteria configuration
 * Defines how structural analysis and execution are weighted
 */
export interface GradingCriteria {
  structuralWeight: number; // Default: 0.3 (30%)
  executionWeight: number; // Default: 0.7 (70%)
  passingThreshold: number; // Default: 60 (out of 100)
  structuralFeatureWeights: {
    tables: number;
    columns: number;
    whereClause: number;
    joins: number;
    aggregations: number;
    groupBy: number;
    orderBy: number;
    subqueries: number;
  };
}

/**
 * Default grading criteria
 */
export const DEFAULT_GRADING_CRITERIA: GradingCriteria = {
  structuralWeight: 0.3,
  executionWeight: 0.7,
  passingThreshold: 60,
  structuralFeatureWeights: {
    tables: 5, // 5 points
    columns: 5, // 5 points
    whereClause: 5, // 5 points
    joins: 5, // 5 points
    aggregations: 3, // 3 points
    groupBy: 3, // 3 points
    orderBy: 2, // 2 points
    subqueries: 2, // 2 points
  }, // Total: 30 points
};
