import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSupabaseUser } from '../hooks/useSupabaseUser';
import { DropZone } from './validation/DropZone';

export const BulkEmailValidator = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useSupabaseUser();

  const handleFileAccepted = useCallback(async (file: File) => {
    if (!user?.email) {
      toast.error('Please sign in to validate emails');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userEmail', user.email);

    try {
      setIsProcessing(true);
      
      const response = await axios.post('/api/validate-bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `validation_results_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Validation complete! Downloading results...');
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error(error.response?.data?.error || 'Error processing file');
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Bulk Email Validation</h2>
        <p className="text-gray-500 text-sm mb-6">Upload a CSV file with email addresses to validate in bulk</p>
        
        <DropZone onFileAccepted={handleFileAccepted} />

        {isProcessing && (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-lg">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing... Please don't close this tab.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};