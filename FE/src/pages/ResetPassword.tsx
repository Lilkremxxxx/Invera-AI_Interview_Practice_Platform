import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { language } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const copy = {
    invalidTitle: language === 'vi' ? 'Liên kết không hợp lệ' : 'Invalid link',
    invalidDescription: language === 'vi' ? 'Vui lòng kiểm tra lại đường dẫn đặt lại mật khẩu.' : 'Please check the password reset link again.',
    errorTitle: language === 'vi' ? 'Lỗi' : 'Error',
    mismatch: language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'The confirmation password does not match.',
    tooShort: language === 'vi' ? 'Mật khẩu phải dài ít nhất 6 ký tự.' : 'The password must be at least 6 characters long.',
    successTitle: language === 'vi' ? 'Thành công' : 'Success',
    successDescription: language === 'vi' ? 'Mật khẩu của bạn đã được cập nhật.' : 'Your password has been updated.',
    resetError: language === 'vi' ? 'Lỗi đổi mật khẩu' : 'Unable to reset password',
    retryLater: language === 'vi' ? 'Vui lòng thử lại sau.' : 'Please try again later.',
    pageTitle: language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset password',
    successBody: language === 'vi' ? 'Tuyệt vời! Bạn có thể đăng nhập bằng mật khẩu mới.' : 'Your password is ready. You can sign in with it now.',
    prompt: language === 'vi' ? 'Vui lòng nhập mật khẩu mới của bạn.' : 'Enter your new password below.',
    newPassword: language === 'vi' ? 'Mật khẩu mới' : 'New password',
    confirmPassword: language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm new password',
    savePassword: language === 'vi' ? 'Lưu mật khẩu mới' : 'Save new password',
    loginNow: language === 'vi' ? 'Đăng nhập ngay' : 'Log in now',
  };

  useEffect(() => {
    if (!token) {
      toast({
        title: copy.invalidTitle,
        description: copy.invalidDescription,
        variant: 'destructive',
      });
      navigate('/forgot-password');
    }
  }, [copy.invalidDescription, copy.invalidTitle, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: copy.errorTitle, description: copy.mismatch, variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: copy.errorTitle, description: copy.tooShort, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token!, password);
      setSuccess(true);
      toast({
        title: copy.successTitle,
        description: copy.successDescription,
      });
    } catch (err) {
      toast({
        title: copy.resetError,
        description: err instanceof Error ? err.message : copy.retryLater,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
            {success ? <CheckCircle2 className="w-6 h-6 text-accent" /> : <KeyRound className="w-6 h-6 text-accent" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{copy.pageTitle}</CardTitle>
          <CardDescription>
            {success ? copy.successBody : copy.prompt}
          </CardDescription>
        </CardHeader>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-left">
                <Input
                  id="password"
                  type="password"
                  placeholder={copy.newPassword}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2 text-left">
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={copy.confirmPassword}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : copy.savePassword}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              {copy.loginNow}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
