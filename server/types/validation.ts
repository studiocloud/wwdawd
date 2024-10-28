export interface ValidationRecord {
  id: string;
  fileName: string;
  status: 'completed' | 'error';
  totalEmails: number;
  validEmails: number;
  invalidEmails: number;
  createdAt: string;
  resultPath?: string;
}

export interface ValidationResult {
  isValid: boolean;
  details: string;
  checks?: {
    format: boolean;
    domain: boolean;
    mx: boolean;
    spf: boolean;
    smtp: boolean;
  };
}