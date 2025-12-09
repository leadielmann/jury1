import { Injectable, Logger } from '@nestjs/common';
import { TreeSitterAnalyzerService } from './services/tree-sitter-analyzer.service';
import { TestExecutorService } from './services/test-executor.service';
import { FeedbackGeneratorService } from './services/feedback-generator.service';
import { SqlSubmissionDto } from './dto/sql-submission.dto';
import { GradingResultDto } from './dto/grading-result.dto';
import { TestCase } from './interfaces/test-case.interface';
import { DEFAULT_GRADING_CRITERIA } from './interfaces/grading-criteria.interface';

/**
 * Main SQL Grading Service
 *
 * Orchestrates the complete grading process:
 * 1. Structural analysis via tree-sitter (30%)
 * 2. Execution testing (70%)
 * 3. Feedback generation
 * 4. Final score calculation
 */
@Injectable()
export class SqlGradingService {
  private readonly logger = new Logger(SqlGradingService.name);

  constructor(
    private readonly treeSitterAnalyzer: TreeSitterAnalyzerService,
    private readonly testExecutor: TestExecutorService,
    private readonly feedbackGenerator: FeedbackGeneratorService,
  ) {}

  /**
   * Grade a SQL submission
   *
   * Process:
   * 1. Validate input
   * 2. Run structural analysis (30 points)
   * 3. Run execution tests (70 points)
   * 4. Combine scores
   * 5. Generate feedback
   * 6. Return comprehensive result
   */
  async gradeSqlSubmission(submission: SqlSubmissionDto): Promise<GradingResultDto> {
    this.logger.log(`Grading SQL submission with ${submission.testCases.length} test case(s)`);

    try {
      // Step 1: Validate submission
      this.validateSubmission(submission);

      // Step 2: Structural Analysis (30% of grade)
      this.logger.debug('Running structural analysis...');
      const structuralAnalysis = this.treeSitterAnalyzer.analyzeStructure(
        submission.studentQuery,
        submission.referenceQuery,
      );

      // Remove AST from response unless explicitly requested
      if (!submission.includeAst) {
        delete structuralAnalysis.ast;
      }

      this.logger.log(`Structural analysis complete: ${structuralAnalysis.score}/30 points`);

      // Step 3: Execution Tests (70% of grade)
      this.logger.debug('Running execution tests...');
      const executionResult = await this.testExecutor.executeTestCases(
        submission.studentQuery,
        submission.testCases,
      );

      this.logger.log(
        `Execution tests complete: ${executionResult.score}/70 points (${executionResult.passedTests}/${executionResult.totalTests} passed)`,
      );

      // Step 4: Calculate final score
      const finalScore = this.calculateFinalScore(
        structuralAnalysis.score,
        executionResult.score,
      );

      const passed = finalScore >= DEFAULT_GRADING_CRITERIA.passingThreshold;

      this.logger.log(`Final score: ${finalScore}/100 (${passed ? 'PASSED' : 'FAILED'})`);

      // Step 5: Generate comprehensive feedback
      const feedback = this.feedbackGenerator.generateFeedback(
        structuralAnalysis,
        executionResult,
        finalScore,
      );

      // Step 6: Build result DTO
      const result = new GradingResultDto(
        finalScore,
        {
          score: structuralAnalysis.score,
          maxScore: 30,
          percentage: (structuralAnalysis.score / 30) * 100,
        },
        {
          score: executionResult.score,
          maxScore: 70,
          percentage: (executionResult.score / 70) * 100,
        },
        passed,
        feedback,
        structuralAnalysis,
        executionResult,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to grade submission: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze query structure only (no execution)
   * Useful for quick validation or when test cases aren't available
   */
  analyzeQueryStructure(studentQuery: string, referenceQuery: string, includeAst = false) {
    this.logger.log('Analyzing query structure only (no execution)');

    const analysis = this.treeSitterAnalyzer.analyzeStructure(studentQuery, referenceQuery);

    if (!includeAst) {
      delete analysis.ast;
    }

    return {
      structuralScore: analysis.score,
      maxScore: 30,
      percentage: (analysis.score / 30) * 100,
      breakdown: analysis.breakdown,
      feedback: analysis.feedback,
    };
  }

  /**
   * Validate submission data
   */
  private validateSubmission(submission: SqlSubmissionDto): void {
    if (!submission.studentQuery || submission.studentQuery.trim().length === 0) {
      throw new Error('Student query is required and cannot be empty');
    }

    if (!submission.referenceQuery || submission.referenceQuery.trim().length === 0) {
      throw new Error('Reference query is required and cannot be empty');
    }

    if (!submission.testCases || submission.testCases.length === 0) {
      throw new Error('At least one test case is required');
    }

    // Validate test case weights sum to approximately 1
    const totalWeight = submission.testCases.reduce((sum, tc) => sum + tc.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(
        `Test case weights must sum to 1.0 (got ${totalWeight}). Each weight represents the proportion of the 70 execution points.`,
      );
    }

    // Validate each test case
    submission.testCases.forEach((testCase, index) => {
      this.validateTestCase(testCase, index);
    });
  }

  /**
   * Validate individual test case
   */
  private validateTestCase(testCase: TestCase, index: number): void {
    if (!testCase.name || testCase.name.trim().length === 0) {
      throw new Error(`Test case ${index + 1}: name is required`);
    }

    if (testCase.weight <= 0 || testCase.weight > 1) {
      throw new Error(
        `Test case ${index + 1}: weight must be between 0 and 1 (got ${testCase.weight})`,
      );
    }

    if (!testCase.schema || testCase.schema.trim().length === 0) {
      throw new Error(`Test case ${index + 1}: schema is required`);
    }

    if (!testCase.data || testCase.data.length === 0) {
      throw new Error(`Test case ${index + 1}: at least one data insertion statement is required`);
    }

    // Must have either referenceQuery OR expectedRows
    if (!testCase.referenceQuery && !testCase.expectedRows) {
      throw new Error(
        `Test case ${index + 1}: must provide either referenceQuery or expectedRows`,
      );
    }
  }

  /**
   * Calculate final score (0-100)
   * 30% structural + 70% execution
   */
  private calculateFinalScore(structuralScore: number, executionScore: number): number {
    const finalScore = structuralScore + executionScore;
    return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get grading criteria information
   */
  getGradingCriteria() {
    return {
      structuralWeight: DEFAULT_GRADING_CRITERIA.structuralWeight,
      executionWeight: DEFAULT_GRADING_CRITERIA.executionWeight,
      passingThreshold: DEFAULT_GRADING_CRITERIA.passingThreshold,
      structuralMaxPoints: 30,
      executionMaxPoints: 70,
      totalMaxPoints: 100,
      structuralFeatureWeights: DEFAULT_GRADING_CRITERIA.structuralFeatureWeights,
    };
  }
}
