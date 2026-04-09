// ===================================================
// Custom Hooks - Tôi tạo các hooks này cho reusability
// ===================================================

import React, { useCallback, useState } from 'react';
import { tuApiService } from '../api/tu-service';

/**
 * useFetch - Custom hook để fetch data từ API
 * Cách sử dụng: const { data, loading, error } = useFetch('/ideas');
 */
export const useFetch = <T,>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(
        `%c[TU-HOOK] 🔄 Fetching data from ${url}...`,
        'color: #0ea5e9;'
      );

      const response = await tuApiService.get<T>(url);

      if (response.success && response.data) {
        setData(response.data);
        console.log('%c[TU-HOOK] ✅ Data fetched successfully', 'color: #10b981;');
      } else {
        const errorMsg = response.error?.message || 'Unknown error';
        setError(errorMsg);
        console.error('%c[TU-HOOK] ❌ Fetch error:', 'color: #ef4444;', errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      console.error('%c[TU-HOOK] ❌ Fetch error:', 'color: #ef4444;', err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * useAsync - Generic async operation hook
 */
export const useAsync = <T,>(asyncFunction: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  return { data, loading, error, execute };
};

/**
 * useLocalStorage - Hook để quản lý localStorage
 */
export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`%c[TU-HOOK] ❌ Error reading localStorage key "${key}"`, 'color: #ef4444;');
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        console.log(`%c[TU-HOOK] 💾 localStorage saved: ${key}`, 'color: #0ea5e9;');
      } catch (error) {
        console.error(
          `%c[TU-HOOK] ❌ Error writing to localStorage key "${key}"`,
          'color: #ef4444;',
          error
        );
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
};

/**
 * useDebounce - Hook để debounce values
 */
export const useDebounce = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useToggle - Hook để toggle boolean state
 */
export const useToggle = (initialValue: boolean = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle, setValue] as const;
};
