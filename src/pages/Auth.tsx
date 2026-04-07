import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { toast } from 'sonner';

const Auth = () => {
  const { user, isReady } = useAuthReady();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Restoring session…</p>
      </div>
    );
  }

  if (user) return <Navigate to="/vault" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-border/40 bg-card/80 p-10 shadow-lg shadow-black/[0.04] backdrop-blur-xl"
      >
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Atrium Europe
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Curator's Suite
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access The Vault
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-border/50 bg-white/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-xl border border-border/50 bg-white/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none backdrop-blur-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Authenticating…' : 'Enter The Vault'}
        </button>
      </form>
    </div>
  );
};

export default Auth;
