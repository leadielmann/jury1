/**
 * Structural analysis result from tree-sitter parsing
 * Represents the 30% structural component of grading
 */
export interface StructuralAnalysis {
  score: number; // 0-30 points
  maxScore: number; // Always 30
  breakdown: StructuralBreakdown;
  feedback: string[];
  ast?: any; // Optional AST for debugging
}

/**
 * Detailed breakdown of structural analysis
 */
export interface StructuralBreakdown {
  tables: StructuralFeatureScore;
  columns: StructuralFeatureScore;
  whereClause: StructuralFeatureScore;
  joins: StructuralFeatureScore;
  aggregations: StructuralFeatureScore;
  groupBy: StructuralFeatureScore;
  orderBy: StructuralFeatureScore;
  subqueries: StructuralFeatureScore;
}

/**
 * Score for individual structural feature
 */
export interface StructuralFeatureScore {
  score: number; // Points earned for this feature
  maxScore: number; // Maximum points for this feature
  status: 'correct' | 'partial' | 'incorrect' | 'missing';
  details: string;
}

/**
 * Extracted SQL features from AST
 */
export interface SqlFeatures {
  tables: string[];
  columns: string[];
  hasWhere: boolean;
  whereConditions: WhereCondition[];
  joins: JoinInfo[];
  aggregates: AggregateFunction[];
  hasGroupBy: boolean;
  groupByColumns: string[];
  hasHaving: boolean;
  havingConditions: WhereCondition[];
  hasOrderBy: boolean;
  orderByColumns: OrderByColumn[];
  hasLimit: boolean;
  limitValue?: number;
  subqueries: number; // Count of subqueries
  hasDistinct: boolean;
  hasUnion: boolean;
}

/**
 * WHERE/HAVING condition information
 */
export interface WhereCondition {
  column: string;
  operator: string; // =, >, <, >=, <=, !=, IN, LIKE, BETWEEN, etc.
  value?: any;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * JOIN information
 */
export interface JoinInfo {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  table: string;
  condition?: string;
}

/**
 * Aggregate function information
 */
export interface AggregateFunction {
  function: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'GROUP_CONCAT';
  column: string;
  alias?: string;
}

/**
 * ORDER BY column information
 */
export interface OrderByColumn {
  column: string;
  direction: 'ASC' | 'DESC';
}
