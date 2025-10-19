import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './supabaseClient';
import { Card } from './components/ui';

const Auth = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 space-y-4">
            <h1 className="text-2xl font-bold text-center text-white">Barcode Sheet Generator</h1>
            <p className="text-center text-slate-400">Sign in to continue</p>
            <SupabaseAuth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={['google', 'github']}
              theme="dark"
            />
        </Card>
      </div>
    </div>
  );
};

export default Auth;

