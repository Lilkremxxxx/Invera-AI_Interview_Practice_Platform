import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandIcon } from '@/components/layout/BrandIcon';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { t, language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

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
            <BrandIcon className="w-9 h-9 shadow-md transition-transform group-hover:-translate-y-0.5" />
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
            <button
              onClick={toggleLanguage}
              title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/50 hover:bg-accent/15 border border-border hover:border-accent/40 text-xs font-semibold font-mono tracking-wider transition-all duration-300 shadow-sm hover:shadow-[0_0_12px_rgba(172,66,60,0.15)] text-foreground/90 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <Globe className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span className={language === 'vi' ? 'text-accent font-bold font-sans' : 'text-foreground/50'}>VI</span>
              <span className="text-border/60">|</span>
              <span className={language === 'en' ? 'text-accent font-bold font-sans' : 'text-foreground/50'}>EN</span>
            </button>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    toggleLanguage();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 font-semibold border-accent/40 text-accent bg-accent/5 hover:bg-accent/15 focus:ring-2 focus:ring-accent transition-all duration-300"
                >
                  <Globe className="w-4 h-4 animate-pulse" />
                  <span>{language === 'vi' ? 'Chuyển sang English' : 'Switch to Tiếng Việt'}</span>
                </Button>
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
