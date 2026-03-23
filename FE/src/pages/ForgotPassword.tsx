import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const copy = {
    error: language === 'vi' ? 'Lỗi' : 'Error',
    validEmail: language === 'vi' ? 'Vui lòng nhập email hợp lệ.' : 'Please enter a valid email address.',
    requestError: language === 'vi' ? 'Lỗi yêu cầu gửi lại mật khẩu' : 'Unable to request a password reset',
    retryLater: language === 'vi' ? 'Vui lòng thử lại sau.' : 'Please try again later.',
    back: language === 'vi' ? 'Quay lại' : 'Back',
    title: language === 'vi' ? 'Quên mật khẩu' : 'Forgot password',
    successDescription: language === 'vi' ? 'Yêu cầu của bạn đã được tiếp nhận.' : 'Your request has been received.',
    prompt: language === 'vi' ? 'Nhập email của bạn để nhận hướng dẫn khôi phục mật khẩu.' : 'Enter your email to receive password reset instructions.',
    submit: language === 'vi' ? 'Gửi yêu cầu' : 'Send request',
    demoBody: language === 'vi'
      ? 'Trong hệ thống thực tế, một email nén chứa link khôi phục mật khẩu sẽ được gửi đến email của bạn.'
      : 'In a real deployment, an email containing the password reset link would be sent to your inbox.',
    demoToken: language === 'vi' ? 'Demo Mode - Token của bạn là:' : 'Demo mode — your token is:',
    goReset: language === 'vi' ? 'Đi tới trang Đặt lại mật khẩu' : 'Go to the reset password page',
    backLogin: language === 'vi' ? 'Trở về trang đăng nhập' : 'Return to the login page',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast({ title: copy.error, description: copy.validEmail, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const resp = await authApi.forgotPassword(email);
      setSuccess(true);
      if (resp.reset_token) {
        setResetToken(resp.reset_token);
      }
    } catch (err) {
      toast({
        title: copy.requestError,
        description: err instanceof Error ? err.message : copy.retryLater,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4"
        onClick={() => navigate('/login')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> {copy.back}
      </Button>

      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
            {success ? <CheckCircle2 className="w-6 h-6 text-accent" /> : <KeyRound className="w-6 h-6 text-accent" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{copy.title}</CardTitle>
          <CardDescription>
            {success ? copy.successDescription : copy.prompt}
          </CardDescription>
        </CardHeader>
        
        {!success ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : copy.submit}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4">
            <div className="bg-accent/10 p-4 rounded-lg text-sm text-foreground/80 space-y-2 border border-accent/20">
              <p>{copy.demoBody}</p>
              {resetToken && (
                <div className="mt-4">
                  <p className="font-semibold text-accent mb-1">{copy.demoToken}</p>
                  <code className="block w-full p-2 bg-background border rounded font-mono text-xs break-all text-muted-foreground select-all">
                    {resetToken}
                  </code>
                  <Button 
                    variant="outline" 
                    className="w-full mt-3" 
                    onClick={() => navigate(`/reset-password?token=${resetToken}`)}
                  >
                    {copy.goReset}
                  </Button>
                </div>
              )}
            </div>
            
            {!resetToken && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                {copy.backLogin}
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
