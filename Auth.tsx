import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const AuthComponent = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-8">
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Welcome</h1>
                <p className="mt-2 text-slate-400">Sign in to continue to the Barcode Generator</p>
            </header>
            <Auth
                supabaseClient={supabase}
                appearance={{ 
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: '#4775f0',
                                brandAccent: '#3a62e8',
                                brandButtonText: 'white',
                                defaultButtonBackground: '#2f4895',
                                defaultButtonBackgroundHover: '#3350b9',
                                inputBackground: '#1e293b',
                                inputText: '#e2e8f0',
                                inputLabelText: '#94a3b8',
                                inputBorder: '#475569',
                                inputFocusBorder: '#4775f0',
                            },
                             radii: {
                                buttonBorderRadius: '0.5rem', 
                                inputBorderRadius: '0.5rem',
                            }
                        }
                    }
                }}
                providers={[]}
                theme="dark"
            />
        </div>
      </div>
    </div>
  );
};

export default AuthComponent;

