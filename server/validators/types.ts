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

export interface SmtpResponse {
  code: number;
  message: string;
}

export interface NetworkError extends Error {
  code?: string;
}