import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, LogOut, ArrowLeft, LibraryBig } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const copy = {
    appBack: language === 'vi' ? 'Quay lại App' : 'Back to app',
    logout: language === 'vi' ? 'Đăng xuất' : 'Log out',
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Question Bank', path: '/admin/questions', icon: LibraryBig, exact: false },
    ...(user?.is_primary_admin
      ? [{ name: 'Admin Access', path: '/admin/access', icon: ShieldCheck, exact: false }]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-bold text-accent">Invera Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted-foreground hover:bg-accent/5 hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {copy.appBack}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {copy.logout}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/20">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 shadow-sm md:hidden">
            <h1 className="text-xl font-bold text-accent">Invera Admin</h1>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
