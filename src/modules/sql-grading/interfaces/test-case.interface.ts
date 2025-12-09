/**
 * Test case definition for SQL execution testing
 * Represents one test scenario with setup data and expected results
 */
export interface TestCase {
  name: string; // Human-readable test case name
  weight: number; // Weight of this test case (0-1), all weights should sum to 1
  schema: string; // SQL CREATE TABLE statements
  data: string[]; // Array of SQL INSERT statements
  referenceQuery?: string; // Optional: use this instead of student query to get expected results
  expectedRows?: any[]; // Optional: explicit expected result rows
  description?: string; // Optional: description shown to student
}

/**
 * Result of executing a single test case
 */
export interface TestResult {
  name: string;
  weight: number;
  passed: boolean;
  score: number; // Weighted score (0 to weight*70)
  executionTime: number; // milliseconds
  studentRows: any[];
  referenceRows: any[];
  differences?: RowDifference[];
  error?: string; // Error message if execution failed
}

/**
 * Difference between student and reference results
 */
export interface RowDifference {
  type: 'missing' | 'extra' | 'mismatch';
  row?: any; // The problematic row
  expected?: any; // Expected value (for mismatches)
  actual?: any; // Actual value (for mismatches)
  rowIndex?: number;
}

/**
 * Execution result summary for all test cases
 */
export interface ExecutionResult {
  score: number; // 0-70 points
  maxScore: number; // Always 70
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: TestResult[];
  overallPassed: boolean;
  totalExecutionTime: number; // milliseconds
}
