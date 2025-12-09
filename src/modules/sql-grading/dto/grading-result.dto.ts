import { GradingResult } from '../interfaces/grading-criteria.interface';
import { StructuralAnalysis } from '../interfaces/structural-analysis.interface';
import { ExecutionResult } from '../interfaces/test-case.interface';

/**
 * DTO for complete grading response
 */
export class GradingResultDto implements GradingResult {
  finalScore: number;
  structural: {
    score: number;
    maxScore: number;
    percentage: number;
  };
  execution: {
    score: number;
    maxScore: number;
    percentage: number;
  };
  passed: boolean;
  feedback: string[];
  timestamp: Date;

  // Additional detailed information
  structuralAnalysis?: StructuralAnalysis; // Full structural breakdown
  executionResult?: ExecutionResult; // Full execution results

  constructor(
    finalScore: number,
    structural: { score: number; maxScore: number; percentage: number },
    execution: { score: number; maxScore: number; percentage: number },
    passed: boolean,
    feedback: string[],
    structuralAnalysis?: StructuralAnalysis,
    executionResult?: ExecutionResult,
  ) {
    this.finalScore = finalScore;
    this.structural = structural;
    this.execution = execution;
    this.passed = passed;
    this.feedback = feedback;
    this.timestamp = new Date();
    this.structuralAnalysis = structuralAnalysis;
    this.executionResult = executionResult;
  }
}
