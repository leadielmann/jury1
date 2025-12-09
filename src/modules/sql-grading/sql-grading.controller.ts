import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { SqlGradingService } from './sql-grading.service';
import { SqlSubmissionDto, SqlAnalysisDto } from './dto/sql-submission.dto';
import { GradingResultDto } from './dto/grading-result.dto';

/**
 * SQL Grading Controller
 *
 * Endpoints:
 * - POST /sql-grading/grade - Grade a complete SQL submission (structural + execution)
 * - POST /sql-grading/analyze - Analyze query structure only (no execution)
 * - GET /sql-grading/criteria - Get grading criteria information
 */
@Controller('sql-grading')
export class SqlGradingController {
  constructor(private readonly sqlGradingService: SqlGradingService) {}

  /**
   * Grade a SQL submission
   *
   * POST /sql-grading/grade
   *
   * Request body:
   * {
   *   "studentQuery": "SELECT * FROM employees WHERE salary > 80000",
   *   "referenceQuery": "SELECT * FROM employees WHERE salary >= 80000",
   *   "testCases": [
   *     {
   *       "name": "Normal data",
   *       "weight": 0.4,
   *       "schema": "CREATE TABLE employees (id INT, name VARCHAR(100), salary DECIMAL(10,2))",
   *       "data": ["INSERT INTO employees VALUES (1, 'Alice', 90000)", ...],
   *       "referenceQuery": "SELECT * FROM employees WHERE salary >= 80000"
   *     },
   *     ...
   *   ],
   *   "includeAst": false
   * }
   *
   * Response:
   * {
   *   "finalScore": 75.5,
   *   "structural": { "score": 25, "maxScore": 30, "percentage": 83.3 },
   *   "execution": { "score": 50.5, "maxScore": 70, "percentage": 72.1 },
   *   "passed": true,
   *   "feedback": [...],
   *   "structuralAnalysis": {...},
   *   "executionResult": {...},
   *   "timestamp": "2025-12-09T..."
   * }
   */
  @Post('grade')
  @HttpCode(HttpStatus.OK)
  async gradeSqlSubmission(@Body() submission: SqlSubmissionDto): Promise<GradingResultDto> {
    return await this.sqlGradingService.gradeSqlSubmission(submission);
  }

  /**
   * Analyze SQL query structure only (no execution)
   * Useful for quick validation or when test cases aren't ready
   *
   * POST /sql-grading/analyze
   *
   * Request body:
   * {
   *   "query": "SELECT name, COUNT(*) FROM users GROUP BY name",
   *   "referenceQuery": "SELECT name, COUNT(*) as cnt FROM users GROUP BY name",
   *   "includeAst": false
   * }
   *
   * Response:
   * {
   *   "structuralScore": 28.5,
   *   "maxScore": 30,
   *   "percentage": 95,
   *   "breakdown": {...},
   *   "feedback": [...]
   * }
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  analyzeQueryStructure(@Body() analysisDto: SqlAnalysisDto) {
    if (!analysisDto.query || !analysisDto.referenceQuery) {
      throw new Error('Both query and referenceQuery are required');
    }

    return this.sqlGradingService.analyzeQueryStructure(
      analysisDto.query,
      analysisDto.referenceQuery,
      analysisDto.includeAst || false,
    );
  }

  /**
   * Get grading criteria and scoring information
   *
   * GET /sql-grading/criteria
   *
   * Response:
   * {
   *   "structuralWeight": 0.3,
   *   "executionWeight": 0.7,
   *   "passingThreshold": 60,
   *   "structuralMaxPoints": 30,
   *   "executionMaxPoints": 70,
   *   "totalMaxPoints": 100,
   *   "structuralFeatureWeights": {
   *     "tables": 5,
   *     "columns": 5,
   *     "whereClause": 5,
   *     "joins": 5,
   *     "aggregations": 3,
   *     "groupBy": 3,
   *     "orderBy": 2,
   *     "subqueries": 2
   *   }
   * }
   */
  @Get('criteria')
  getGradingCriteria() {
    return this.sqlGradingService.getGradingCriteria();
  }

  /**
   * Health check endpoint
   *
   * GET /sql-grading/health
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'sql-grading',
      components: {
        structuralAnalysis: 'operational',
        executionTests: 'stub (awaiting implementation)',
        feedbackGenerator: 'operational',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
