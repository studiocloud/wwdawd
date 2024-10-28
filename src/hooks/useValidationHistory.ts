import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { ValidationHistory } from '../types/validation';
import { User } from '@supabase/supabase-js';

export const useValidationHistory = (user: User | null) => {
  const [history, setHistory] = useState<ValidationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizeHistoryItem = (item: any): ValidationHistory => ({
    id: String(item?.id || ''),
    fileName: String(item?.fileName || item?.file_name || ''),
    status: String(item?.status || 'pending'),
    resultUrl: String(item?.resultUrl || item?.result_url || ''),
    createdAt: new Date(item?.createdAt || item?.created_at || Date.now()).toISOString()
  });

  const fetchHistory = useCallback(async () => {
    if (!user?.id) {
      setHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/validation-history', {
        headers: {
          'x-user-id': user.id
        }
      });

      // Ensure we have an array and sanitize each item
      const data = Array.isArray(response.data) ? response.data : [];
      const sanitizedHistory = data
        .filter(item => item && typeof item === 'object')
        .map(sanitizeHistoryItem);

      setHistory(sanitizedHistory);
    } catch (err) {
      let errorMessage = 'Failed to fetch validation history';
      
      if (err instanceof AxiosError) {
        errorMessage = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('Validation history error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refreshHistory = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refreshHistory
  };
};