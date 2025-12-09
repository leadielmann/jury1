import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Parser } from 'node-sql-parser';
import {
  StructuralAnalysis,
  StructuralBreakdown,
  StructuralFeatureScore,
  SqlFeatures,
  WhereCondition,
  JoinInfo,
  AggregateFunction,
  OrderByColumn,
} from '../interfaces/structural-analysis.interface';
import { DEFAULT_GRADING_CRITERIA } from '../interfaces/grading-criteria.interface';

/**
 * Tree-sitter based SQL structural analyzer
 * Parses SQL queries and compares student vs reference structure
 * Provides the 30% structural component of grading
 */
@Injectable()
export class TreeSitterAnalyzerService implements OnModuleInit {
  private readonly logger = new Logger(TreeSitterAnalyzerService.name);
  private parser: Parser;

  async onModuleInit() {
    this.logger.log('Initializing SQL parser...');
    this.parser = new Parser();
    this.logger.log('SQL parser initialized successfully');
  }

  /**
   * Main analysis method: compares student query against reference query
   * Returns structural score (0-30 points)
   */
  analyzeStructure(studentQuery: string, referenceQuery: string): StructuralAnalysis {
    this.logger.debug(
      `Analyzing structure:\nStudent: ${studentQuery.substring(0, 100)}...\nReference: ${referenceQuery.substring(0, 100)}...`,
    );

    try {
      // Parse both queries
      const studentAST = this.parser.astify(studentQuery);
      const referenceAST = this.parser.astify(referenceQuery);

      // Extract features from both
      const studentFeatures = this.extractFeatures(studentAST);
      const referenceFeatures = this.extractFeatures(referenceAST);

      // Compare features
      const breakdown = this.compareFeatures(studentFeatures, referenceFeatures);

      // Calculate total score
      const score = this.calculateTotalScore(breakdown);

      // Generate feedback
      const feedback = this.generateFeedback(breakdown, studentFeatures, referenceFeatures);

      return {
        score,
        maxScore: 30,
        breakdown,
        feedback,
        ast: { student: studentAST, reference: referenceAST },
      };
    } catch (error) {
      this.logger.error(`Failed to analyze SQL structure: ${error.message}`);
      throw new Error(`SQL parsing error: ${error.message}`);
    }
  }

  /**
   * Extract structural features from AST
   */
  extractFeatures(ast: any): SqlFeatures {
    // Handle array of queries (e.g., UNION)
    const queries = Array.isArray(ast) ? ast : [ast];
    const mainQuery = queries[0];

    const features: SqlFeatures = {
      tables: [],
      columns: [],
      hasWhere: false,
      whereConditions: [],
      joins: [],
      aggregates: [],
      hasGroupBy: false,
      groupByColumns: [],
      hasHaving: false,
      havingConditions: [],
      hasOrderBy: false,
      orderByColumns: [],
      hasLimit: false,
      limitValue: undefined,
      subqueries: 0,
      hasDistinct: false,
      hasUnion: queries.length > 1,
    };

    if (!mainQuery || mainQuery.type !== 'select') {
      return features;
    }

    // Extract tables
    features.tables = this.extractTables(mainQuery.from);

    // Extract columns
    features.columns = this.extractColumns(mainQuery.columns);

    // Extract JOINs
    features.joins = this.extractJoins(mainQuery.from);

    // Extract aggregates
    features.aggregates = this.extractAggregates(mainQuery.columns);

    // Check DISTINCT
    features.hasDistinct = mainQuery.distinct === 'DISTINCT';

    // Extract WHERE
    if (mainQuery.where) {
      features.hasWhere = true;
      features.whereConditions = this.extractWhereConditions(mainQuery.where);
    }

    // Extract GROUP BY
    if (mainQuery.groupby) {
      features.hasGroupBy = true;
      features.groupByColumns = this.extractGroupByColumns(mainQuery.groupby);
    }

    // Extract HAVING
    if (mainQuery.having) {
      features.hasHaving = true;
      features.havingConditions = this.extractWhereConditions(mainQuery.having);
    }

    // Extract ORDER BY
    if (mainQuery.orderby) {
      features.hasOrderBy = true;
      features.orderByColumns = this.extractOrderByColumns(mainQuery.orderby);
    }

    // Extract LIMIT
    if (mainQuery.limit) {
      features.hasLimit = true;
      features.limitValue = mainQuery.limit.value?.[0]?.value;
    }

    // Count subqueries (recursive)
    features.subqueries = this.countSubqueries(mainQuery);

    return features;
  }

  /**
   * Extract table names from FROM clause
   */
  extractTables(from: any[]): string[] {
    if (!from) return [];

    const tables: string[] = [];
    const fromArray = Array.isArray(from) ? from : [from];

    fromArray.forEach((item) => {
      if (item.table) {
        tables.push(item.table);
      }
      if (item.as) {
        // Alias used, but we still track the original table
      }
    });

    return tables;
  }

  /**
   * Extract column names from SELECT clause
   */
  extractColumns(columns: any[]): string[] {
    if (!columns) return [];

    const cols: string[] = [];

    columns.forEach((col) => {
      if (col.expr.type === 'column_ref') {
        if (col.expr.column === '*') {
          cols.push('*');
        } else {
          cols.push(col.expr.column);
        }
      } else if (col.as) {
        // Use alias if available
        cols.push(col.as);
      } else if (col.expr.type === 'aggr_func') {
        cols.push(`${col.expr.name}(${col.expr.args?.expr?.column || '*'})`);
      }
    });

    return cols;
  }

  /**
   * Extract JOIN information
   */
  extractJoins(from: any[]): JoinInfo[] {
    if (!from) return [];

    const joins: JoinInfo[] = [];
    const fromArray = Array.isArray(from) ? from : [from];

    fromArray.forEach((item) => {
      if (item.join) {
        joins.push({
          type: (item.join.toUpperCase() as any) || 'INNER',
          table: item.table || '',
          condition: item.on ? this.stringifyCondition(item.on) : undefined,
        });
      }
    });

    return joins;
  }

  /**
   * Extract aggregate functions
   */
  extractAggregates(columns: any[]): AggregateFunction[] {
    if (!columns) return [];

    const aggregates: AggregateFunction[] = [];

    columns.forEach((col) => {
      if (col.expr.type === 'aggr_func') {
        aggregates.push({
          function: col.expr.name.toUpperCase() as any,
          column: col.expr.args?.expr?.column || '*',
          alias: col.as,
        });
      }
    });

    return aggregates;
  }

  /**
   * Extract WHERE conditions
   */
  extractWhereConditions(where: any): WhereCondition[] {
    if (!where) return [];

    const conditions: WhereCondition[] = [];

    const traverse = (node: any, logicalOp?: 'AND' | 'OR') => {
      if (!node) return;

      if (node.type === 'binary_expr') {
        if (node.operator === 'AND' || node.operator === 'OR') {
          // Logical operator - traverse both sides
          traverse(node.left, node.operator);
          traverse(node.right, node.operator);
        } else {
          // Comparison operator
          conditions.push({
            column: node.left?.column || 'unknown',
            operator: node.operator,
            value: node.right?.value,
            logicalOperator: logicalOp,
          });
        }
      }
    };

    traverse(where);
    return conditions;
  }

  /**
   * Extract GROUP BY columns
   */
  extractGroupByColumns(groupby: any[]): string[] {
    if (!groupby) return [];

    return groupby.map((g) => g.column || '');
  }

  /**
   * Extract ORDER BY columns
   */
  extractOrderByColumns(orderby: any[]): OrderByColumn[] {
    if (!orderby) return [];

    return orderby.map((o) => ({
      column: o.expr?.column || '',
      direction: (o.type?.toUpperCase() as 'ASC' | 'DESC') || 'ASC',
    }));
  }

  /**
   * Count subqueries in AST
   */
  countSubqueries(ast: any): number {
    let count = 0;

    const traverse = (node: any) => {
      if (!node) return;

      if (typeof node === 'object') {
        Object.values(node).forEach((value: any) => {
          if (value?.type === 'select') {
            count++;
          }
          if (typeof value === 'object') {
            traverse(value);
          }
        });
      }
    };

    traverse(ast);
    return count;
  }

  /**
   * Compare student features against reference features
   * Returns breakdown with scores for each feature
   */
  compareFeatures(student: SqlFeatures, reference: SqlFeatures): StructuralBreakdown {
    const weights = DEFAULT_GRADING_CRITERIA.structuralFeatureWeights;

    return {
      tables: this.compareTables(student.tables, reference.tables, weights.tables),
      columns: this.compareColumns(student.columns, reference.columns, weights.columns),
      whereClause: this.compareWhere(student, reference, weights.whereClause),
      joins: this.compareJoins(student.joins, reference.joins, weights.joins),
      aggregations: this.compareAggregations(student.aggregates, reference.aggregates, weights.aggregations),
      groupBy: this.compareGroupBy(student, reference, weights.groupBy),
      orderBy: this.compareOrderBy(student, reference, weights.orderBy),
      subqueries: this.compareSubqueries(student.subqueries, reference.subqueries, weights.subqueries),
    };
  }

  /**
   * Compare tables
   */
  compareTables(student: string[], reference: string[], maxScore: number): StructuralFeatureScore {
    const studentSet = new Set(student.map((t) => t.toLowerCase()));
    const referenceSet = new Set(reference.map((t) => t.toLowerCase()));

    const correct = [...referenceSet].filter((t) => studentSet.has(t)).length;
    const missing = referenceSet.size - correct;
    const extra = studentSet.size - correct;

    let status: StructuralFeatureScore['status'] = 'correct';
    let score = maxScore;

    if (missing > 0 || extra > 0) {
      if (correct === 0) {
        status = 'incorrect';
        score = 0;
      } else {
        status = 'partial';
        score = (correct / referenceSet.size) * maxScore;
      }
    }

    const details =
      missing === 0 && extra === 0
        ? `Correct tables: ${[...referenceSet].join(', ')}`
        : `Missing: ${missing}, Extra: ${extra}, Correct: ${correct}/${referenceSet.size}`;

    return { score: Math.round(score * 10) / 10, maxScore, status, details };
  }

  /**
   * Compare columns
   */
  compareColumns(student: string[], reference: string[], maxScore: number): StructuralFeatureScore {
    // Normalize column names (remove quotes, lowercase)
    const normalize = (cols: string[]) =>
      cols.map((c) => c.replace(/["`]/g, '').toLowerCase());

    const studentNorm = normalize(student);
    const referenceNorm = normalize(reference);

    // Handle wildcard case
    if (referenceNorm.includes('*') && studentNorm.includes('*')) {
      return {
        score: maxScore,
        maxScore,
        status: 'correct',
        details: 'Uses SELECT * as expected',
      };
    }

    const studentSet = new Set(studentNorm);
    const referenceSet = new Set(referenceNorm);

    const correct = [...referenceSet].filter((c) => studentSet.has(c)).length;
    const missing = referenceSet.size - correct;
    const extra = studentSet.size - correct;

    let status: StructuralFeatureScore['status'] = 'correct';
    let score = maxScore;

    if (missing > 0 || extra > 0) {
      if (correct === 0) {
        status = 'incorrect';
        score = 0;
      } else {
        status = 'partial';
        score = (correct / referenceSet.size) * maxScore;
      }
    }

    const details =
      missing === 0 && extra === 0
        ? `Correct columns selected`
        : `Missing: ${missing}, Extra: ${extra}, Correct: ${correct}/${referenceSet.size}`;

    return { score: Math.round(score * 10) / 10, maxScore, status, details };
  }

  /**
   * Compare WHERE clauses
   */
  compareWhere(student: SqlFeatures, reference: SqlFeatures, maxScore: number): StructuralFeatureScore {
    if (!reference.hasWhere) {
      // Reference has no WHERE, student shouldn't either
      if (!student.hasWhere) {
        return { score: maxScore, maxScore, status: 'correct', details: 'No WHERE clause required' };
      } else {
        return {
          score: maxScore * 0.5,
          maxScore,
          status: 'partial',
          details: 'Unnecessary WHERE clause',
        };
      }
    }

    if (!student.hasWhere) {
      return { score: 0, maxScore, status: 'missing', details: 'Missing WHERE clause' };
    }

    // Compare number of conditions
    const studentCondCount = student.whereConditions.length;
    const refCondCount = reference.whereConditions.length;

    let score = maxScore;
    let status: StructuralFeatureScore['status'] = 'correct';

    if (studentCondCount < refCondCount) {
      status = 'partial';
      score = (studentCondCount / refCondCount) * maxScore;
    } else if (studentCondCount > refCondCount) {
      status = 'partial';
      score = maxScore * 0.8; // Slight penalty for over-complication
    }

    return {
      score: Math.round(score * 10) / 10,
      maxScore,
      status,
      details: `Has WHERE with ${studentCondCount} condition(s), expected ${refCondCount}`,
    };
  }

  /**
   * Compare JOINs
   */
  compareJoins(student: JoinInfo[], reference: JoinInfo[], maxScore: number): StructuralFeatureScore {
    if (reference.length === 0) {
      if (student.length === 0) {
        return { score: maxScore, maxScore, status: 'correct', details: 'No JOINs required' };
      }
      return { score: maxScore * 0.5, maxScore, status: 'partial', details: 'Unnecessary JOINs' };
    }

    if (student.length === 0) {
      return { score: 0, maxScore, status: 'missing', details: `Missing ${reference.length} JOIN(s)` };
    }

    // Compare JOIN count and types
    let score = maxScore;
    let status: StructuralFeatureScore['status'] = 'correct';

    if (student.length !== reference.length) {
      status = 'partial';
      score = (Math.min(student.length, reference.length) / reference.length) * maxScore;
    }

    // Check JOIN types match
    const refTypes = reference.map((j) => j.type).sort();
    const stuTypes = student.map((j) => j.type).sort();

    if (JSON.stringify(refTypes) !== JSON.stringify(stuTypes)) {
      status = 'partial';
      score *= 0.8;
    }

    return {
      score: Math.round(score * 10) / 10,
      maxScore,
      status,
      details: `Has ${student.length} JOIN(s), expected ${reference.length}`,
    };
  }

  /**
   * Compare aggregate functions
   */
  compareAggregations(
    student: AggregateFunction[],
    reference: AggregateFunction[],
    maxScore: number,
  ): StructuralFeatureScore {
    if (reference.length === 0) {
      if (student.length === 0) {
        return { score: maxScore, maxScore, status: 'correct', details: 'No aggregations required' };
      }
      return { score: maxScore * 0.5, maxScore, status: 'partial', details: 'Unnecessary aggregations' };
    }

    if (student.length === 0) {
      return { score: 0, maxScore, status: 'missing', details: `Missing ${reference.length} aggregate(s)` };
    }

    const refFuncs = reference.map((a) => a.function).sort();
    const stuFuncs = student.map((a) => a.function).sort();

    const correct = refFuncs.filter((f) => stuFuncs.includes(f)).length;

    let score = (correct / refFuncs.length) * maxScore;
    let status: StructuralFeatureScore['status'] = correct === refFuncs.length ? 'correct' : 'partial';

    if (correct === 0) {
      status = 'incorrect';
    }

    return {
      score: Math.round(score * 10) / 10,
      maxScore,
      status,
      details: `Uses ${stuFuncs.join(', ')}, expected ${refFuncs.join(', ')}`,
    };
  }

  /**
   * Compare GROUP BY
   */
  compareGroupBy(student: SqlFeatures, reference: SqlFeatures, maxScore: number): StructuralFeatureScore {
    if (!reference.hasGroupBy) {
      if (!student.hasGroupBy) {
        return { score: maxScore, maxScore, status: 'correct', details: 'No GROUP BY required' };
      }
      return { score: maxScore * 0.5, maxScore, status: 'partial', details: 'Unnecessary GROUP BY' };
    }

    if (!student.hasGroupBy) {
      return { score: 0, maxScore, status: 'missing', details: 'Missing GROUP BY clause' };
    }

    const score = maxScore;
    return { score, maxScore, status: 'correct', details: 'GROUP BY clause present' };
  }

  /**
   * Compare ORDER BY
   */
  compareOrderBy(student: SqlFeatures, reference: SqlFeatures, maxScore: number): StructuralFeatureScore {
    if (!reference.hasOrderBy) {
      if (!student.hasOrderBy) {
        return { score: maxScore, maxScore, status: 'correct', details: 'No ORDER BY required' };
      }
      return { score: maxScore, maxScore, status: 'correct', details: 'ORDER BY is optional' };
    }

    if (!student.hasOrderBy) {
      return { score: 0, maxScore, status: 'missing', details: 'Missing ORDER BY clause' };
    }

    return { score: maxScore, maxScore, status: 'correct', details: 'ORDER BY clause present' };
  }

  /**
   * Compare subqueries
   */
  compareSubqueries(studentCount: number, referenceCount: number, maxScore: number): StructuralFeatureScore {
    if (referenceCount === 0) {
      if (studentCount === 0) {
        return { score: maxScore, maxScore, status: 'correct', details: 'No subqueries required' };
      }
      return { score: maxScore * 0.5, maxScore, status: 'partial', details: 'Unnecessary subqueries' };
    }

    if (studentCount === 0) {
      return { score: 0, maxScore, status: 'missing', details: `Missing ${referenceCount} subquery/subqueries` };
    }

    let score = (Math.min(studentCount, referenceCount) / referenceCount) * maxScore;
    const status: StructuralFeatureScore['status'] = studentCount === referenceCount ? 'correct' : 'partial';

    return {
      score: Math.round(score * 10) / 10,
      maxScore,
      status,
      details: `Has ${studentCount} subquery/subqueries, expected ${referenceCount}`,
    };
  }

  /**
   * Calculate total structural score from breakdown
   */
  calculateTotalScore(breakdown: StructuralBreakdown): number {
    let total = 0;
    total += breakdown.tables.score;
    total += breakdown.columns.score;
    total += breakdown.whereClause.score;
    total += breakdown.joins.score;
    total += breakdown.aggregations.score;
    total += breakdown.groupBy.score;
    total += breakdown.orderBy.score;
    total += breakdown.subqueries.score;

    return Math.round(total * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Generate human-readable feedback from breakdown
   */
  generateFeedback(breakdown: StructuralBreakdown, student: SqlFeatures, reference: SqlFeatures): string[] {
    const feedback: string[] = [];

    // Add feedback for each feature
    Object.entries(breakdown).forEach(([feature, score]) => {
      const emoji = score.status === 'correct' ? '✅' : score.status === 'partial' ? '⚠️' : '❌';
      feedback.push(`${emoji} ${this.capitalize(feature)}: ${score.details}`);
    });

    // Add overall structural notes
    if (student.hasDistinct && !reference.hasDistinct) {
      feedback.push('ℹ️ Uses DISTINCT - check if this is necessary');
    }

    if (student.hasLimit && !reference.hasLimit) {
      feedback.push('ℹ️ Uses LIMIT - this may be acceptable depending on requirements');
    }

    return feedback;
  }

  /**
   * Helper: stringify condition for display
   */
  private stringifyCondition(condition: any): string {
    if (!condition) return '';
    // Simplified stringification - real implementation would be more robust
    return JSON.stringify(condition);
  }

  /**
   * Helper: capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
