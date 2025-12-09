import { TestCase } from '../interfaces/test-case.interface';

/**
 * DTO for SQL query submission
 */
export class SqlSubmissionDto {
  studentQuery: string; // The student's SQL query to be graded
  referenceQuery: string; // The reference/correct SQL query
  testCases: TestCase[]; // Array of test cases to run
  includeAst?: boolean; // Whether to include AST in response (default: false)
}

/**
 * DTO for simple SQL analysis (no execution)
 */
export class SqlAnalysisDto {
  query: string; // SQL query to analyze
  referenceQuery?: string; // Optional reference for comparison
  includeAst?: boolean; // Whether to include AST in response (default: false)
}
