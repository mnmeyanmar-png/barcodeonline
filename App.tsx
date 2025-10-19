import { useState, useEffect } from 'react';
import Auth from './Auth';
import BarcodeGenerator from './BarcodeGenerator';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-slate-900">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-500"></div>
        </div>
    )
  }

  return (
    <div>
      {!session ? <Auth /> : <BarcodeGenerator />}
    </div>
  );
};

export default App;

