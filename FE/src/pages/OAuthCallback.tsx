import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { language } = useLanguage();
  const copy = {
    successTitle: language === 'vi' ? 'Đăng nhập thành công' : 'Sign-in successful',
    successDescription: language === 'vi' ? 'Chào mừng bạn quay lại!' : 'Welcome back!',
    errorTitle: language === 'vi' ? 'Lỗi đăng nhập' : 'Sign-in error',
    errorDescription: language === 'vi' ? 'Không nhận được mã xác thực.' : 'No authentication token was received.',
    verifying: language === 'vi' ? 'Đang xác thực thông tin đăng nhập...' : 'Verifying your sign-in...',
  };
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Login with the token received from the backend
      loginWithToken(token);
      toast({
        title: copy.successTitle,
        description: copy.successDescription,
      });
      navigate('/app', { replace: true });
    } else {
      toast({
        title: copy.errorTitle,
        description: copy.errorDescription,
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
      <p className="text-muted-foreground animate-pulse">{copy.verifying}</p>
    </div>
  );
}
