# SQL Grading Module

A comprehensive SQL grading system for jury1 that combines structural analysis (30%) with execution testing (70%).

## Overview

This module provides automated grading for SQL queries by:
- **Structural Analysis (30%)**: Using `node-sql-parser` to analyze query structure and compare against reference solutions
- **Execution Testing (70%)**: Running queries against test databases and comparing results (stub implementation - awaiting SQL execution from separate branch)
- **Detailed Feedback**: Generating human-readable feedback explaining scores

## Architecture

```
src/modules/sql-grading/
├── sql-grading.module.ts          # Main module registration
├── sql-grading.controller.ts      # REST API endpoints
├── sql-grading.service.ts         # Orchestrator service
├── services/
│   ├── tree-sitter-analyzer.service.ts    # Structural analysis (30%)
│   ├── test-executor.service.ts           # Execution testing (70%) - STUB
│   └── feedback-generator.service.ts      # Feedback generation
├── dto/
│   ├── sql-submission.dto.ts      # Request DTOs
│   ├── test-case.dto.ts           # Test case DTO
│   └── grading-result.dto.ts      # Response DTO
├── interfaces/
│   ├── structural-analysis.interface.ts    # Structural analysis types
│   ├── test-case.interface.ts             # Test case types
│   └── grading-criteria.interface.ts      # Grading configuration
└── entities/
    └── (empty - jury1 is stateless)
```

## API Endpoints

### 1. Grade SQL Submission

**POST** `/sql-grading/grade`

Grade a complete SQL submission with structural analysis + execution tests.

**Request:**
```json
{
  "studentQuery": "SELECT name, email FROM users WHERE age >= 18",
  "referenceQuery": "SELECT name, email FROM users WHERE age >= 18",
  "testCases": [
    {
      "name": "Basic test",
      "weight": 0.5,
      "schema": "CREATE TABLE users (id INT, name VARCHAR(100), email VARCHAR(100), age INT)",
      "data": [
        "INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 25)",
        "INSERT INTO users VALUES (2, 'Bob', 'bob@example.com', 17)"
      ],
      "referenceQuery": "SELECT name, email FROM users WHERE age >= 18"
    },
    {
      "name": "Edge case test",
      "weight": 0.5,
      "schema": "CREATE TABLE users (id INT, name VARCHAR(100), email VARCHAR(100), age INT)",
      "data": [
        "INSERT INTO users VALUES (3, 'Charlie', 'charlie@example.com', 18)"
      ],
      "expectedRows": [
        {"name": "Charlie", "email": "charlie@example.com"}
      ]
    }
  ],
  "includeAst": false
}
```

**Response:**
```json
{
  "finalScore": 75.5,
  "structural": {
    "score": 28.5,
    "maxScore": 30,
    "percentage": 95
  },
  "execution": {
    "score": 47,
    "maxScore": 70,
    "percentage": 67.1
  },
  "passed": true,
  "feedback": [
    "✅ PASSED | Final Score: 75.5/100 (Structural: 28.5/30, Execution: 47/70)",
    "",
    "📊 STRUCTURAL ANALYSIS (30 points):",
    "  Score: 28.5/30 points",
    "  ✅ Tables: 5/5 - Correct tables: users",
    "  ✅ Columns: 5/5 - Correct columns selected",
    "  ⚠️ WHERE Clause: 4.5/5 - Has WHERE with 1 condition(s), expected 1",
    "  ...",
    "",
    "🧪 EXECUTION TESTS (70 points):",
    "  Score: 47/70 points (1/2 tests passed)",
    "  ...",
    "",
    "💡 RECOMMENDATIONS:",
    "  • Review the differences in test case 2"
  ],
  "structuralAnalysis": { ... },
  "executionResult": { ... },
  "timestamp": "2025-12-09T17:24:40.573Z"
}
```

### 2. Analyze Query Structure Only

**POST** `/sql-grading/analyze`

Analyze SQL query structure without execution (quick validation).

**Request:**
```json
{
  "query": "SELECT name FROM users",
  "referenceQuery": "SELECT name, email FROM users WHERE age > 18",
  "includeAst": false
}
```

**Response:**
```json
{
  "structuralScore": 18,
  "maxScore": 30,
  "percentage": 60,
  "breakdown": {
    "tables": {"score": 5, "maxScore": 5, "status": "correct", "details": "Correct tables: users"},
    "columns": {"score": 0, "maxScore": 5, "status": "incorrect", "details": "Missing: 1, Extra: 0, Correct: 1/2"},
    "whereClause": {"score": 0, "maxScore": 5, "status": "missing", "details": "Missing WHERE clause"},
    "joins": {"score": 5, "maxScore": 5, "status": "correct", "details": "No JOINs required"},
    "aggregations": {"score": 3, "maxScore": 3, "status": "correct", "details": "No aggregations required"},
    "groupBy": {"score": 3, "maxScore": 3, "status": "correct", "details": "No GROUP BY required"},
    "orderBy": {"score": 2, "maxScore": 2, "status": "correct", "details": "No ORDER BY required"},
    "subqueries": {"score": 2, "maxScore": 2, "status": "correct", "details": "No subqueries required"}
  },
  "feedback": [
    "✅ Tables: Correct tables: users",
    "❌ Columns: Missing: 1, Extra: 0, Correct: 1/2",
    "❌ WhereClause: Missing WHERE clause",
    "..."
  ]
}
```

### 3. Get Grading Criteria

**GET** `/sql-grading/criteria`

Get information about how grading is calculated.

**Response:**
```json
{
  "structuralWeight": 0.3,
  "executionWeight": 0.7,
  "passingThreshold": 60,
  "structuralMaxPoints": 30,
  "executionMaxPoints": 70,
  "totalMaxPoints": 100,
  "structuralFeatureWeights": {
    "tables": 5,
    "columns": 5,
    "whereClause": 5,
    "joins": 5,
    "aggregations": 3,
    "groupBy": 3,
    "orderBy": 2,
    "subqueries": 2
  }
}
```

### 4. Health Check

**GET** `/sql-grading/health`

Check service status.

**Response:**
```json
{
  "status": "ok",
  "service": "sql-grading",
  "components": {
    "structuralAnalysis": "operational",
    "executionTests": "stub (awaiting implementation)",
    "feedbackGenerator": "operational"
  },
  "timestamp": "2025-12-09T17:24:40.573Z"
}
```

## Grading Breakdown

### Structural Analysis (30 points)

| Feature | Points | Description |
|---------|--------|-------------|
| Tables | 5 | Correct table selection in FROM clause |
| Columns | 5 | Correct column selection in SELECT clause |
| WHERE Clause | 5 | WHERE clause presence and complexity |
| JOINs | 5 | JOIN usage and types (INNER, LEFT, etc.) |
| Aggregations | 3 | Aggregate functions (COUNT, SUM, AVG, etc.) |
| GROUP BY | 3 | GROUP BY clause presence |
| ORDER BY | 2 | ORDER BY clause presence |
| Subqueries | 2 | Subquery usage |
| **Total** | **30** | |

### Execution Testing (70 points)

Distributed across test cases based on their weights. Each test case:
- Must have a weight (0-1)
- All weights must sum to 1.0
- Test score = (passed ? 1 : 0) × weight × 70

Example:
- Test 1 (weight: 0.4): Passed → 28 points
- Test 2 (weight: 0.6): Failed → 0 points
- Total execution score: 28/70

## Test Case Structure

```typescript
{
  "name": "Test name",
  "weight": 0.5,                    // Proportion of 70 execution points
  "schema": "CREATE TABLE ...",     // Table schema
  "data": ["INSERT INTO ..."],      // Test data
  "referenceQuery": "SELECT ...",   // Optional: reference query
  "expectedRows": [{...}],          // Optional: expected result rows
  "description": "..."              // Optional: shown to student
}
```

**Note:** Each test case must provide either `referenceQuery` OR `expectedRows`.

## Current Status

### ✅ Implemented
- SQL parser initialization (node-sql-parser)
- Structural analysis service
- Feature extraction (tables, columns, WHERE, JOINs, aggregates, GROUP BY, ORDER BY, subqueries)
- Comparison logic
- Feedback generation
- REST API endpoints
- Unit tests

### ⏳ Pending (awaiting SQL execution branch)
- Test executor service (currently stubbed)
- Database connection
- Query execution
- Result comparison
- Test data setup/teardown

## Usage Example

```bash
# Test the analyze endpoint
curl -X POST http://localhost:3000/sql-grading/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT name, COUNT(*) as cnt FROM users GROUP BY name",
    "referenceQuery": "SELECT name, COUNT(*) as count FROM users GROUP BY name"
  }'

# Test the grade endpoint (with stub execution)
curl -X POST http://localhost:3000/sql-grading/grade \
  -H "Content-Type: application/json" \
  -d @test-submission.json
```

## Testing

```bash
# Run unit tests
npm test tree-sitter-analyzer.service.spec

# Run all tests
npm test

# Build
npm run build

# Start dev server
npm run start:dev
```

## Integration with Execution Service

When the SQL execution service is ready, update [test-executor.service.ts](services/test-executor.service.ts):

1. Remove stub implementation
2. Add PostgreSQL/SQLite connection
3. Implement `executeTestCase()` method
4. Implement `compareResults()` method
5. Add proper error handling

The rest of the grading system will work seamlessly once execution is implemented.

## Dependencies

- `node-sql-parser` - SQL parsing and AST generation
- `@nestjs/common`, `@nestjs/core` - NestJS framework
- Standard jury1 dependencies

## Configuration

Grading criteria can be adjusted in [grading-criteria.interface.ts](interfaces/grading-criteria.interface.ts):

```typescript
export const DEFAULT_GRADING_CRITERIA: GradingCriteria = {
  structuralWeight: 0.3,    // 30%
  executionWeight: 0.7,     // 70%
  passingThreshold: 60,     // 60/100 to pass
  structuralFeatureWeights: {
    tables: 5,
    columns: 5,
    whereClause: 5,
    joins: 5,
    aggregations: 3,
    groupBy: 3,
    orderBy: 2,
    subqueries: 2,
  },
};
```

## Future Enhancements

- [ ] Support for multiple SQL dialects (MySQL, PostgreSQL, SQLite)
- [ ] Advanced result comparison (handling NULL, floating point precision, row order)
- [ ] Performance scoring (query execution time)
- [ ] Query optimization suggestions
- [ ] Plagiarism detection (AST similarity)
- [ ] Custom grading rubrics per assignment
- [ ] Weighted structural features per assignment

## Contributing

When adding features:
1. Follow the existing service pattern
2. Add unit tests
3. Update this README
4. Ensure backward compatibility with execution stub

## License

Same as jury1 parent project
