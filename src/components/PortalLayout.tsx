import React, { useState } from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';
import { ptBR } from '@clerk/localizations';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

interface PortalLayoutProps {
  publishableKey: string;
  portalName: string;
  signInUrl: string;
}

export default function PortalLayout({ publishableKey, portalName, signInUrl }: PortalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);

  // Check URL hash to determine if we should show sign up
  React.useEffect(() => {
    if (location.hash.startsWith('#sign-up')) {
      setIsSignUp(true);
    } else {
      setIsSignUp(false);
    }
  }, [location.hash]);

  if (!publishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro de Configuração</h2>
          <p className="text-slate-600 mb-4">A chave pública do Clerk para o portal {portalName} não foi encontrada.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-900 text-white rounded-lg">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={publishableKey} 
      afterSignOutUrl="/"
      localization={ptBR}
      appearance={{
        variables: {
          colorPrimary: '#00311c', // Operarum Green
          colorText: '#00311c',
          colorTextSecondary: '#64748b',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#00311c',
          borderRadius: '0.125rem',
          fontFamily: '"Inter", sans-serif',
        },
        elements: {
          card: 'shadow-lg border border-slate-200 rounded-sm',
          headerTitle: 'font-bold text-operarum text-xl uppercase tracking-[0.1em]',
          headerSubtitle: 'text-slate-500 font-medium',
          socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50 text-operarum rounded-sm',
          formButtonPrimary: 'bg-operarum hover:bg-operarum-light text-white shadow-md transition-all rounded-sm uppercase tracking-[0.2em] text-xs py-3',
          footerActionLink: 'text-operarum hover:text-operarum-light font-bold',
          formFieldInput: 'border-slate-300 focus:ring-operarum focus:border-operarum rounded-sm',
          formFieldLabel: 'text-slate-600 font-bold uppercase tracking-widest text-[10px]',
          dividerLine: 'bg-slate-200',
          dividerText: 'text-slate-400 font-bold uppercase tracking-widest text-[9px]',
          identityPreviewText: 'text-operarum',
          userButtonPopoverActionButtonText: 'text-operarum',
          userButtonHeaderTitle: 'text-operarum',
        }
      }}
    >
      <SignedIn>
        {/* Render the actual app content when signed in */}
        <Outlet />
      </SignedIn>
      <SignedOut>
        {/* Render Clerk's Auth components directly to avoid iframe issues */}
        <div className="min-h-screen bg-operarum flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          
          <div className="mb-8 text-center flex flex-col items-center z-10">
            <img 
              src="https://res.cloudinary.com/diaf6clsf/image/upload/v1771013135/logooperarum_qlxw5o.jpg" 
              alt="Operarum Logo" 
              className="h-24 w-auto object-contain" 
              referrerPolicy="no-referrer" 
            />
            <p className="text-emerald-100/60 font-medium uppercase tracking-[0.1em] text-xs mt-4">
              {isSignUp ? 'Crie sua conta para acessar' : 'Faça login para acessar sua conta'}
            </p>
          </div>
          
          <div className="z-10 w-full flex justify-center">
            {isSignUp ? (
              <SignUp 
                routing="hash" 
                fallbackRedirectUrl={signInUrl} 
                signInUrl={`${signInUrl}#sign-in`}
              />
            ) : (
              <SignIn 
                routing="hash" 
                fallbackRedirectUrl={signInUrl} 
                signUpUrl={`${signInUrl}#sign-up`}
              />
            )}
          </div>

          <button 
            onClick={() => navigate('/')} 
            className="mt-10 text-[10px] text-emerald-100/40 hover:text-white font-bold transition-colors z-10 uppercase tracking-[0.2em] border-b border-transparent hover:border-emerald-100/20 pb-1"
          >
            &larr; Voltar para a seleção de portal
          </button>
        </div>
      </SignedOut>
    </ClerkProvider>
  );
}
