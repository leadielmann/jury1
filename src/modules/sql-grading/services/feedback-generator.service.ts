import { Injectable, Logger } from '@nestjs/common';
import { StructuralAnalysis } from '../interfaces/structural-analysis.interface';
import { ExecutionResult, TestResult } from '../interfaces/test-case.interface';

/**
 * Generates human-readable feedback for SQL grading results
 * Combines structural and execution feedback into actionable insights
 */
@Injectable()
export class FeedbackGeneratorService {
  private readonly logger = new Logger(FeedbackGeneratorService.name);

  /**
   * Generate comprehensive feedback combining structural and execution results
   */
  generateFeedback(
    structural: StructuralAnalysis,
    execution: ExecutionResult,
    finalScore: number,
  ): string[] {
    const feedback: string[] = [];

    // Overall summary
    feedback.push(this.generateOverallSummary(finalScore, structural.score, execution.score));
    feedback.push(''); // Empty line for readability

    // Structural feedback section
    feedback.push('📊 STRUCTURAL ANALYSIS (30 points):');
    feedback.push(...this.generateStructuralFeedback(structural));
    feedback.push(''); // Empty line

    // Execution feedback section
    feedback.push('🧪 EXECUTION TESTS (70 points):');
    feedback.push(...this.generateExecutionFeedback(execution));
    feedback.push(''); // Empty line

    // Recommendations
    const recommendations = this.generateRecommendations(structural, execution);
    if (recommendations.length > 0) {
      feedback.push('💡 RECOMMENDATIONS:');
      feedback.push(...recommendations);
    }

    return feedback;
  }

  /**
   * Generate overall summary line
   */
  private generateOverallSummary(
    finalScore: number,
    structuralScore: number,
    executionScore: number,
  ): string {
    const passed = finalScore >= 60;
    const emoji = passed ? '✅' : '❌';
    const status = passed ? 'PASSED' : 'FAILED';

    return `${emoji} ${status} | Final Score: ${finalScore}/100 (Structural: ${structuralScore}/30, Execution: ${executionScore}/70)`;
  }

  /**
   * Generate detailed structural feedback
   */
  private generateStructuralFeedback(structural: StructuralAnalysis): string[] {
    const feedback: string[] = [];

    feedback.push(`  Score: ${structural.score}/${structural.maxScore} points`);

    // Add breakdown feedback
    const breakdown = structural.breakdown;
    const features = [
      { name: 'Tables', data: breakdown.tables },
      { name: 'Columns', data: breakdown.columns },
      { name: 'WHERE Clause', data: breakdown.whereClause },
      { name: 'JOINs', data: breakdown.joins },
      { name: 'Aggregations', data: breakdown.aggregations },
      { name: 'GROUP BY', data: breakdown.groupBy },
      { name: 'ORDER BY', data: breakdown.orderBy },
      { name: 'Subqueries', data: breakdown.subqueries },
    ];

    features.forEach((feature) => {
      const emoji = this.getStatusEmoji(feature.data.status);
      const scoreText = `${feature.data.score}/${feature.data.maxScore}`;
      feedback.push(`  ${emoji} ${feature.name}: ${scoreText} - ${feature.data.details}`);
    });

    // Add original structural feedback if available
    if (structural.feedback && structural.feedback.length > 0) {
      feedback.push('');
      feedback.push('  Additional Notes:');
      structural.feedback.forEach((note) => {
        feedback.push(`    ${note}`);
      });
    }

    return feedback;
  }

  /**
   * Generate execution feedback
   */
  private generateExecutionFeedback(execution: ExecutionResult): string[] {
    const feedback: string[] = [];

    feedback.push(
      `  Score: ${execution.score}/${execution.maxScore} points (${execution.passedTests}/${execution.totalTests} tests passed)`,
    );
    feedback.push(`  Total execution time: ${execution.totalExecutionTime}ms`);
    feedback.push('');

    // Add individual test results
    execution.testResults.forEach((test, index) => {
      const emoji = test.passed ? '✅' : '❌';
      const scoreText = `${test.score.toFixed(1)}/${(test.weight * 70).toFixed(1)}`;

      feedback.push(`  ${emoji} Test ${index + 1}: ${test.name}`);
      feedback.push(`      Score: ${scoreText} points | Time: ${test.executionTime}ms`);

      if (test.passed) {
        feedback.push(`      ✓ ${test.studentRows.length} rows matched`);
      } else {
        if (test.error) {
          feedback.push(`      ✗ Error: ${test.error}`);
        } else {
          feedback.push(...this.generateTestDifferenceFeedback(test));
        }
      }

      feedback.push(''); // Empty line between tests
    });

    return feedback;
  }

  /**
   * Generate feedback for test differences
   */
  private generateTestDifferenceFeedback(test: TestResult): string[] {
    const feedback: string[] = [];

    if (!test.differences || test.differences.length === 0) {
      feedback.push(`      ✗ Expected ${test.referenceRows.length} rows, got ${test.studentRows.length}`);
      return feedback;
    }

    const missing = test.differences.filter((d) => d.type === 'missing').length;
    const extra = test.differences.filter((d) => d.type === 'extra').length;
    const mismatch = test.differences.filter((d) => d.type === 'mismatch').length;

    if (missing > 0) {
      feedback.push(`      ✗ Missing ${missing} expected row(s)`);
    }
    if (extra > 0) {
      feedback.push(`      ✗ ${extra} unexpected extra row(s)`);
    }
    if (mismatch > 0) {
      feedback.push(`      ✗ ${mismatch} row(s) with incorrect values`);
    }

    // Show first few differences as examples
    const exampleDiffs = test.differences.slice(0, 3);
    if (exampleDiffs.length > 0) {
      feedback.push('      Example differences:');
      exampleDiffs.forEach((diff) => {
        if (diff.type === 'missing') {
          feedback.push(`        - Missing row: ${JSON.stringify(diff.expected)}`);
        } else if (diff.type === 'extra') {
          feedback.push(`        - Extra row: ${JSON.stringify(diff.actual)}`);
        } else if (diff.type === 'mismatch') {
          feedback.push(
            `        - Row ${diff.rowIndex}: Expected ${JSON.stringify(diff.expected)}, got ${JSON.stringify(diff.actual)}`,
          );
        }
      });

      if (test.differences.length > 3) {
        feedback.push(`        ... and ${test.differences.length - 3} more difference(s)`);
      }
    }

    return feedback;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    structural: StructuralAnalysis,
    execution: ExecutionResult,
  ): string[] {
    const recommendations: string[] = [];

    // Check for common issues in structural analysis
    const breakdown = structural.breakdown;

    if (breakdown.tables.status !== 'correct') {
      recommendations.push('  • Double-check the table names in your FROM clause');
    }

    if (breakdown.columns.status !== 'correct') {
      recommendations.push('  • Review the columns in your SELECT statement');
    }

    if (breakdown.whereClause.status === 'missing') {
      recommendations.push('  • Your query is missing a WHERE clause - make sure to filter the data correctly');
    }

    if (breakdown.joins.status === 'missing') {
      recommendations.push('  • Your query is missing JOIN(s) - check if you need to combine data from multiple tables');
    }

    if (breakdown.aggregations.status === 'missing') {
      recommendations.push(
        '  • Your query is missing aggregate functions (COUNT, SUM, AVG, etc.) - check the requirements',
      );
    }

    if (breakdown.groupBy.status === 'missing') {
      recommendations.push('  • Your query is missing GROUP BY - this is needed when using aggregate functions');
    }

    // Check for execution issues
    if (execution.passedTests === 0 && execution.totalTests > 0) {
      recommendations.push('  • None of the test cases passed - review the requirements carefully');
      recommendations.push('  • Try running your query manually to see what results it produces');
    } else if (execution.passedTests < execution.totalTests) {
      recommendations.push(
        `  • ${execution.totalTests - execution.passedTests} test case(s) failed - review the differences above`,
      );
    }

    // Check if execution succeeded but structural failed
    if (execution.overallPassed && structural.score < 20) {
      recommendations.push(
        '  • Your query produces correct results but the structure differs from the expected solution',
      );
      recommendations.push('  • Consider if there\'s a more "standard" way to write this query');
    }

    // Check if structural succeeded but execution failed
    if (structural.score >= 25 && !execution.overallPassed) {
      recommendations.push('  • Your query structure looks correct but produces wrong results');
      recommendations.push(
        '  • Check the WHERE conditions, comparison operators (=, <, >, etc.), and JOIN conditions',
      );
    }

    return recommendations;
  }

  /**
   * Get emoji for status
   */
  private getStatusEmoji(status: 'correct' | 'partial' | 'incorrect' | 'missing'): string {
    switch (status) {
      case 'correct':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'incorrect':
        return '❌';
      case 'missing':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Generate simplified feedback (without detailed breakdown)
   */
  generateSimpleFeedback(finalScore: number, passed: boolean): string[] {
    const feedback: string[] = [];

    if (passed) {
      feedback.push(`✅ PASSED with score ${finalScore}/100`);
      if (finalScore >= 90) {
        feedback.push('🌟 Excellent work!');
      } else if (finalScore >= 75) {
        feedback.push('👍 Good job!');
      } else {
        feedback.push('✓ Meets minimum requirements');
      }
    } else {
      feedback.push(`❌ FAILED with score ${finalScore}/100`);
      feedback.push('Please review the feedback above and try again');
    }

    return feedback;
  }
}
