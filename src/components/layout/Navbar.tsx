import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isLanding ? 'bg-transparent' : 'bg-background/80 backdrop-blur-md border-b'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className={`font-bold text-xl ${isLanding ? 'text-primary-foreground' : 'text-foreground'}`}>
              InterviewAI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/#features" 
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isLanding ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              Features
            </Link>
            <Link 
              to="/#pricing" 
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isLanding ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              Pricing
            </Link>
            <Link 
              to="/#faq" 
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isLanding ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              FAQ
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant={isLanding ? "hero-outline" : "ghost"} 
              size="sm" 
              asChild
            >
              <Link to="/login">Log in</Link>
            </Button>
            <Button 
              variant={isLanding ? "hero" : "accent"} 
              size="sm" 
              asChild
            >
              <Link to="/signup">Start practicing</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className={`w-6 h-6 ${isLanding ? 'text-primary-foreground' : 'text-foreground'}`} />
            ) : (
              <Menu className={`w-6 h-6 ${isLanding ? 'text-primary-foreground' : 'text-foreground'}`} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/20 animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link 
                to="/#features" 
                className={`text-sm font-medium ${isLanding ? 'text-primary-foreground' : 'text-foreground'}`}
                onClick={() => setIsOpen(false)}
              >
                Features
              </Link>
              <Link 
                to="/#pricing" 
                className={`text-sm font-medium ${isLanding ? 'text-primary-foreground' : 'text-foreground'}`}
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/#faq" 
                className={`text-sm font-medium ${isLanding ? 'text-primary-foreground' : 'text-foreground'}`}
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/20">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button variant="accent" size="sm" asChild className="w-full">
                  <Link to="/signup">Start practicing</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
