import { Link, useLocation } from 'react-router-dom';
import { Home, Shield, Upload, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BottomNavProps {
  isAdmin?: boolean;
}

const BottomNav = ({ isAdmin }: BottomNavProps) => {
  const location = useLocation();
  const path = location.pathname;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const items = [
    { to: '/', icon: Home, label: 'Gallery', show: true },
    { to: '/vault', icon: Shield, label: 'Vault', show: !!isAdmin },
    { to: '/vault/upload', icon: Upload, label: 'Upload', show: !!isAdmin },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-auto max-w-lg px-4 pb-2 pt-0">
        <div className="flex items-center justify-around rounded-2xl border border-[#F1F1F4] bg-white/90 px-2 py-2.5 shadow-xl shadow-zinc-200/50 backdrop-blur-md">
          {items.filter(i => i.show).map(({ to, icon: Icon, label }) => {
            const active = path === to || (to !== '/' && path.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 ${
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground/60'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-muted-foreground/60 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Exit</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
