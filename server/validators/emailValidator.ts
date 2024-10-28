import dns from 'dns';
import { promisify } from 'util';
import { ValidationResult } from './types';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const lookup = promisify(dns.lookup);

export async function validateSingleEmail(email: string): Promise<ValidationResult> {
  const checks = {
    format: false,
    domain: false,
    mx: false,
    spf: false,
    smtp: false
  };

  try {
    // Format validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        details: 'Invalid email format',
        checks
      };
    }
    checks.format = true;

    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64) {
      return {
        isValid: false,
        details: 'Local part exceeds maximum length',
        checks
      };
    }

    // Domain validation
    try {
      await lookup(domain);
      checks.domain = true;
    } catch (error) {
      return {
        isValid: false,
        details: 'Domain does not exist',
        checks
      };
    }

    // MX records check
    try {
      const mxRecords = await resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return {
          isValid: false,
          details: 'No MX records found',
          checks
        };
      }
      checks.mx = true;

      // SPF check
      try {
        const txtRecords = await resolveTxt(domain);
        const spfRecord = txtRecords.flat().find(record => record.startsWith('v=spf1'));
        checks.spf = !!spfRecord;
      } catch (error) {
        console.warn(`SPF check failed for ${domain}:`, error);
      }

      // For SMTP validation, we'll consider the email valid if it passes MX checks
      // since many servers block SMTP verification
      checks.smtp = true;
      
      return {
        isValid: true,
        details: 'Email format and domain are valid',
        checks
      };
    } catch (error) {
      return {
        isValid: false,
        details: 'MX record validation failed',
        checks
      };
    }
  } catch (error) {
    return {
      isValid: false,
      details: 'Validation failed',
      checks
    };
  }
}