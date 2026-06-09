import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppConfigError } from '../types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in App component boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.error?.name === 'AppConfigError') {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-red-50 text-red-900">
            <h2 className="text-2xl font-bold mb-4">Configuração Necessária</h2>
            <p className="mb-4 max-w-md">{this.state.error.message}</p>
            <div className="text-left bg-white p-6 rounded-lg shadow-sm border border-red-200 mb-6 max-w-lg">
                <p className="font-semibold mb-2">Para corrigir, configure os seguintes Environment Variables no seu provedor de hospedagem (Vercel/Netlify/etc):</p>
                <ul className="list-disc pl-5 space-y-1 font-mono text-sm">
                    <li>VITE_SUPABASE_URL</li>
                    <li>VITE_SUPABASE_ANON_KEY</li>
                </ul>
            </div>
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition"
              onClick={() => window.location.reload()}
            >
              Recarregar Aplicação
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <h2 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h2>
          <p className="mb-4">A aplicação falhou ao carregar. Recarregue a página.</p>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
