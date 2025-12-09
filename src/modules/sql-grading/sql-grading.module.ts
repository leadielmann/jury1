import { Module } from '@nestjs/common';
import { SqlGradingController } from './sql-grading.controller';
import { SqlGradingService } from './sql-grading.service';
import { TreeSitterAnalyzerService } from './services/tree-sitter-analyzer.service';
import { TestExecutorService } from './services/test-executor.service';
import { FeedbackGeneratorService } from './services/feedback-generator.service';

/**
 * SQL Grading Module
 *
 * Provides SQL grading functionality combining:
 * - Structural analysis via tree-sitter (30%)
 * - Execution testing (70%)
 * - Comprehensive feedback generation
 *
 * Exports SqlGradingService for use in other modules if needed
 */
@Module({
  controllers: [SqlGradingController],
  providers: [
    SqlGradingService,
    TreeSitterAnalyzerService,
    TestExecutorService,
    FeedbackGeneratorService,
  ],
  exports: [SqlGradingService], // Export for potential use in other modules
})
export class SqlGradingModule {}
