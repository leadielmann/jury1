/**
 * DTO for test case creation/update
 */
export class TestCaseDto {
  name: string;
  weight: number;
  schema: string;
  data: string[];
  referenceQuery?: string;
  expectedRows?: any[];
  description?: string;
}
