import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Entrance = () => {
  const { user, isReady } = useAuthReady();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground tracking-wider">Restoring session…</p>
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
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <p className="text-[13px] font-medium text-muted-foreground mb-3">
            Atrium Europe
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back.
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Sign in to access the Vault.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-foreground/20 focus:shadow-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-foreground/20 focus:shadow-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-foreground px-4 py-3.5 text-[15px] font-medium text-background transition-all hover:opacity-80 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Continue'}
        </button>
      </motion.form>
    </div>
  );
};

export default Entrance;
