import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Github } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandIcon } from '@/components/layout/BrandIcon';

export const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <BrandIcon className="w-8 h-8" />
              <span className="font-bold text-xl">invera</span>
            </Link>
            <p className="text-primary-foreground/70 max-w-md mb-6">
              {t('footer', 'tagline')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer', 'product')}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/#features" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'features')}
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'pricing')}
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'faq')}
                </Link>
              </li>
              <li>
                <Link to="/#dashboard-demo" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'dashboard')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer', 'company')}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'contact')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('footer', 'terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-center text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} invera. {t('footer', 'copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
