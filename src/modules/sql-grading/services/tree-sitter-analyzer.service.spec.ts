import { Test, TestingModule } from '@nestjs/testing';
import { TreeSitterAnalyzerService } from './tree-sitter-analyzer.service';

describe('TreeSitterAnalyzerService', () => {
  let service: TreeSitterAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TreeSitterAnalyzerService],
    }).compile();

    service = module.get<TreeSitterAnalyzerService>(TreeSitterAnalyzerService);

    // Initialize the parser
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Simple SELECT queries', () => {
    it('should give perfect score for identical queries', () => {
      const query = 'SELECT name, email FROM users WHERE age > 18';
      const result = service.analyzeStructure(query, query);

      expect(result.score).toBe(30);
      expect(result.maxScore).toBe(30);
      expect(result.breakdown.tables.status).toBe('correct');
      expect(result.breakdown.columns.status).toBe('correct');
      expect(result.breakdown.whereClause.status).toBe('correct');
    });

    it('should detect missing tables', () => {
      const studentQuery = 'SELECT name FROM products';
      const referenceQuery = 'SELECT name FROM users';

      const result = service.analyzeStructure(studentQuery, referenceQuery);

      expect(result.breakdown.tables.status).not.toBe('correct');
      expect(result.score).toBeLessThan(30);
    });

    it('should detect missing columns', () => {
      const studentQuery = 'SELECT name FROM users';
      const referenceQuery = 'SELECT name, email FROM users';

      const result = service.analyzeStructure(studentQuery, referenceQuery);

      expect(result.breakdown.columns.status).not.toBe('correct');
    });

    it('should detect missing WHERE clause', () => {
      const studentQuery = 'SELECT name FROM users';
      const referenceQuery = 'SELECT name FROM users WHERE age > 18';

      const result = service.analyzeStructure(studentQuery, referenceQuery);

      expect(result.breakdown.whereClause.status).toBe('missing');
    });
  });

  describe('JOIN queries', () => {
    it('should detect correct JOIN usage', () => {
      const query = 'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id';

      const result = service.analyzeStructure(query, query);

      expect(result.breakdown.joins.status).toBe('correct');
      expect(result.score).toBe(30);
    });

    it('should detect missing JOINs', () => {
      const studentQuery = 'SELECT name FROM users';
      const referenceQuery = 'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id';

      const result = service.analyzeStructure(studentQuery, referenceQuery);

      expect(result.breakdown.joins.status).toBe('missing');
    });
  });

  describe('Aggregate functions', () => {
    it('should detect correct aggregate usage', () => {
      const query = 'SELECT COUNT(*) as total FROM users';

      const result = service.analyzeStructure(query, query);

      expect(result.breakdown.aggregations.status).toBe('correct');
    });

    it('should detect missing aggregates', () => {
      const studentQuery = 'SELECT name FROM users';
      const referenceQuery = 'SELECT COUNT(*) FROM users';

      const result = service.analyzeStructure(studentQuery, referenceQuery);

      expect(result.breakdown.aggregations.status).toBe('missing');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid SQL syntax', () => {
      const invalidQuery = 'SELECT FROM WHERE';

      expect(() => {
        service.analyzeStructure(invalidQuery, 'SELECT * FROM users');
      }).toThrow();
    });
  });
});
