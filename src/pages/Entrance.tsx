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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Geometric decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-foreground/[0.03]" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-foreground/[0.03]" />
      </div>

      <motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm space-y-8 rounded-3xl border border-border/30 bg-card/60 p-10 shadow-2xl shadow-black/[0.04] backdrop-blur-xl"
      >
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground">
            Atrium Europe
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Curator's Suite
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Authenticate to access The Vault
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Curator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="curator@atrium.eu"
              required
              className="w-full rounded-xl border-0 bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none ring-1 ring-border/30 backdrop-blur-xl transition-all focus:bg-muted/80 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Secret Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className="w-full rounded-xl border-0 bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none ring-1 ring-border/30 backdrop-blur-xl transition-all focus:bg-muted/80 focus:ring-primary/40"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border border-foreground/10 bg-transparent px-4 py-3.5 text-sm font-medium tracking-wide text-foreground transition-all hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {loading ? 'Authenticating…' : 'Enter the Atrium'}
        </button>
      </motion.form>
    </div>
  );
};

export default Entrance;
