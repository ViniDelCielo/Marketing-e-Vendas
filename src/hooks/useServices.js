import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        setServices(data || []);
        setLoading(false);
      });
  }, []);

  return { services, loading };
}
