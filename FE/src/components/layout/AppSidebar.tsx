import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  MessageSquareText,
  User, 
  Settings, 
  LogOut,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandIcon } from '@/components/layout/BrandIcon';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatPlanLabel, userInitials } from '@/lib/plans';

export const AppSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { t, language } = useLanguage();
  const { user, logout } = useAuthContext();

  const menuItems = [
    { icon: LayoutDashboard, label: t('sidebar', 'dashboard'), path: '/app' },
    { icon: PlusCircle, label: t('sidebar', 'newSession'), path: '/app/new' },
    { icon: History, label: t('sidebar', 'sessions'), path: '/app/sessions' },
    { icon: MessageSquareText, label: t('sidebar', 'qna'), path: '/app/qna' },
    { icon: User, label: t('sidebar', 'profile'), path: '/app/profile' },
    { icon: Settings, label: t('sidebar', 'settings'), path: '/app/settings' },
  ];

  if (!user?.is_admin) {
    menuItems.splice(4, 0, {
      icon: CreditCard,
      label: language === 'vi' ? 'Nâng cấp gói' : 'Upgrade plan',
      path: '/app/upgrade',
    });
  }

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-40 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <Link to="/app" className="flex items-center gap-2.5">
            <BrandIcon className="w-9 h-9" />
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight">invera</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/app' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <Avatar className="h-8 w-8 border border-sidebar-border/70">
                <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.email ?? 'User avatar'} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm font-medium">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name || user?.email?.split('@')[0] || t('sidebar', 'user')}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{formatPlanLabel(user, language)}</p>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            size={collapsed ? "icon" : "default"}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed ? "justify-center" : "justify-start"
            )}
            onClick={logout}
          >
            <>
              <LogOut className="w-4 h-4" />
              {!collapsed && <span className="ml-2">{t('sidebar', 'logout')}</span>}
            </>
          </Button>
        </div>
      </div>
    </aside>
  );
};
