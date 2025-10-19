import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import BarcodeGenerator from './BarcodeGenerator';

const App = () => {
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

  // If there is no session, show the login page.
  // Otherwise, show the main barcode generator app.
  return (
    <div>
      {!session ? <Auth /> : <BarcodeGenerator key={session.user.id} />}
    </div>
  );
};

export default App;

