import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthComponent from './Auth';
import BarcodeGenerator from './BarcodeGenerator';
import { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check for an existing session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for changes in auth state (e.g., user signs in or out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div>
      {!session ? <AuthComponent /> : <BarcodeGenerator />}
    </div>
  );
}

export default App;

