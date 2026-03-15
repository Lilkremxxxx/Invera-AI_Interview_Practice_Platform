import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { t } = useLanguage();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isLanding 
        ? 'bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm' 
        : 'bg-background/95 backdrop-blur-lg border-b border-border'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground group-hover:text-accent transition-colors">
              invera
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link 
              to="/#features" 
              className="px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-accent/10 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t('nav', 'features')}
            </Link>
            <Link 
              to="/#pricing" 
              className="px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-accent/10 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t('nav', 'pricing')}
            </Link>
            <Link 
              to="/#faq" 
              className="px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-accent/10 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t('nav', 'faq')}
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="font-semibold"
            >
              <Link to="/login">{t('nav', 'login')}</Link>
            </Button>
            <Button 
              variant="accent" 
              size="sm" 
              asChild
              className="font-semibold shadow-md hover:shadow-lg"
            >
              <Link to="/signup">{t('nav', 'signup')}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground hover:bg-accent/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50 bg-background/98 backdrop-blur-lg animate-fade-in">
            <div className="flex flex-col gap-2">
              <Link 
                to="/#features" 
                className="px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t('nav', 'features')}
              </Link>
              <Link 
                to="/#pricing" 
                className="px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t('nav', 'pricing')}
              </Link>
              <Link 
                to="/#faq" 
                className="px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent/10 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t('nav', 'faq')}
              </Link>
              <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
                <Button variant="outline" size="sm" asChild className="w-full font-semibold">
                  <Link to="/login">{t('nav', 'login')}</Link>
                </Button>
                <Button variant="accent" size="sm" asChild className="w-full font-semibold">
                  <Link to="/signup">{t('nav', 'signup')}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
