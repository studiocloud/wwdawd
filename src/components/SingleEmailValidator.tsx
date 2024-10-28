import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ValidationResult } from '../types/validation';

export const SingleEmailValidator = () => {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateEmail = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsValidating(true);
      setValidationResult(null);
      
      const response = await axios.post<ValidationResult>('/api/validate-single', { 
        email: email.trim().toLowerCase() 
      });
      
      setValidationResult(response.data);
      
      if (response.data.isValid) {
        toast.success('Email is valid!');
      } else {
        toast.error('Email is invalid');
      }
    } catch (error) {
      toast.error('Validation failed. Please try again.');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      validateEmail();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Single Email Validation</h2>
        <p className="text-gray-500 text-sm mb-6">
          Validate any email address with comprehensive checks
        </p>
        
        <div className="space-y-4">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter email address to validate"
              disabled={isValidating}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
          
          <button
            onClick={validateEmail}
            disabled={isValidating || !email.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isValidating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </span>
            ) : (
              'Validate Email'
            )}
          </button>
        </div>

        {validationResult && (
          <div className={`mt-6 p-4 rounded-lg border ${
            validationResult.isValid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {validationResult.isValid ? (
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`font-medium ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                {validationResult.isValid ? 'Valid Email Address' : 'Invalid Email Address'}
              </span>
            </div>
            
            <p className={`text-sm ${validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
              {validationResult.details}
            </p>

            {validationResult.checks && (
              <div className="border-t border-gray-200 mt-3 pt-3">
                <h4 className="text-sm font-medium mb-2">Validation Results:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <CheckResult 
                    label="Format" 
                    passed={validationResult.checks.format} 
                  />
                  <CheckResult 
                    label="Domain" 
                    passed={validationResult.checks.domain} 
                  />
                  <CheckResult 
                    label="MX Records" 
                    passed={validationResult.checks.mx} 
                  />
                  <CheckResult 
                    label="SPF Record" 
                    passed={validationResult.checks.spf} 
                  />
                  <CheckResult 
                    label="SMTP Check" 
                    passed={validationResult.checks.smtp} 
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface CheckResultProps {
  label: string;
  passed: boolean;
}

const CheckResult = ({ label, passed }: CheckResultProps) => (
  <div className="flex items-center gap-2">
    <span className={passed ? 'text-green-600' : 'text-red-600'}>
      {passed ? '✓' : '✗'}
    </span>
    <span className={passed ? 'text-green-700' : 'text-red-700'}>
      {label}
    </span>
  </div>
);