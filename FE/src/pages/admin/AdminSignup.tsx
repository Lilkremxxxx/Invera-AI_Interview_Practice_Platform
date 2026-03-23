import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

import { BrandIcon } from '@/components/layout/BrandIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { authApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export function AdminSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, user } = useAuth();
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const invitedEmail = searchParams.get('email')?.trim() || '';
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = {
    submitError: language === 'vi' ? 'Không thể tạo tài khoản admin lúc này.' : 'Unable to create the admin account right now.',
    panelBody: language === 'vi'
      ? 'Chỉ email đã được admin chính cho phép mới có thể tạo tài khoản admin. Sau khi đăng ký, bạn vẫn phải xác thực mã code như tài khoản thường.'
      : 'Only emails approved by the primary admin can create admin accounts. After sign-up, you still need to verify the email code like a regular account.',
    invitedDescription: language === 'vi'
      ? 'Lời mời này đã điền sẵn Gmail được cấp quyền. Bạn chỉ cần đặt mật khẩu local rồi xác thực mã code qua email.'
      : 'This invitation already filled in the approved Gmail address. Just set a local password and verify the code sent by email.',
    genericDescription: language === 'vi'
      ? 'Email này phải nằm trong danh sách được mời. Sau khi tạo tài khoản, bạn sẽ nhận mã xác thực qua Gmail như bình thường.'
      : 'This email must already be on the invite list. After account creation, you will receive the normal verification code by email.',
    fullName: language === 'vi' ? 'Họ và tên' : 'Full name',
    namePlaceholder: language === 'vi' ? 'Nguyễn Văn A' : 'Jane Doe',
    invitedGmail: language === 'vi' ? 'Gmail được mời' : 'Invited Gmail',
    emailPrefillHint: language === 'vi' ? 'Gmail này được điền từ email mời admin.' : 'This Gmail was prefilled from the admin invitation email.',
    password: language === 'vi' ? 'Mật khẩu' : 'Password',
    hidePassword: language === 'vi' ? 'Ẩn mật khẩu' : 'Hide password',
    showPassword: language === 'vi' ? 'Hiện mật khẩu' : 'Show password',
    creating: language === 'vi' ? 'Đang tạo tài khoản...' : 'Creating account...',
    createAdmin: language === 'vi' ? 'Tạo tài khoản admin' : 'Create admin account',
    alreadyAdmin: language === 'vi' ? 'Đã có tài khoản admin?' : 'Already have an admin account?',
    login: language === 'vi' ? 'Đăng nhập' : 'Log in',
    normalUser: language === 'vi' ? 'Chỉ là người dùng thường?' : 'Just a regular user?',
    userSignup: language === 'vi' ? 'Đăng ký tài khoản thường' : 'Create a regular account',
  };

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    navigate(user?.is_admin ? '/admin' : '/app', { replace: true });
  }, [isAuthenticated, loading, navigate, user]);

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const response = await authApi.adminRegister({
        email,
        password,
        full_name: name || undefined,
      });
      navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
        replace: true,
        state: {
          message: response.message,
          resendAvailableInSeconds: response.resend_available_in_seconds,
          redirectTo: '/admin',
          loginPath: '/admin/login',
          mode: 'admin',
        },
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-1/4 -right-32 w-96 h-96 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center p-12 lg:p-16">
          <div className="max-w-md">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-12 group">
              <BrandIcon className="w-10 h-10 shadow-lg transition-transform group-hover:-translate-y-0.5" />
              <span className="font-bold text-2xl text-white">invera</span>
            </Link>

            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Admin invite required
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              {copy.panelBody}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <BrandIcon className="w-10 h-10 shadow-md" />
            <span className="font-bold text-2xl text-foreground">invera</span>
          </Link>

          <div className="bg-card border border-border/60 rounded-2xl p-8 sm:p-10 shadow-lg">
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-5">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
                Admin signup
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {invitedEmail
                  ? copy.invitedDescription
                  : copy.genericDescription}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="admin-name" className="text-sm font-semibold text-foreground">
                  {copy.fullName}
                </Label>
                <Input
                  id="admin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy.namePlaceholder}
                  required
                  className="h-12 text-base border-border/80 focus:border-accent focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="admin-signup-email" className="text-sm font-semibold text-foreground">
                  {copy.invitedGmail}
                </Label>
                <Input
                  id="admin-signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  required
                  readOnly={Boolean(invitedEmail)}
                  className="h-12 text-base border-border/80 focus:border-accent focus-visible:ring-accent"
                />
                {invitedEmail && (
                  <p className="text-xs text-muted-foreground">
                    {copy.emailPrefillHint}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="admin-signup-password" className="text-sm font-semibold text-foreground">
                  {copy.password}
                </Label>
                <div className="relative">
                  <Input
                    id="admin-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 text-base pr-12 border-border/80 focus:border-accent focus-visible:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={isSubmitting || loading}
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {copy.creating}
                  </>
                ) : (
                  <>
                    {copy.createAdmin}
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/60 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                {copy.alreadyAdmin}{' '}
                <Link to="/admin/login" className="text-accent hover:text-accent/80 font-semibold hover:underline">
                  {copy.login}
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                {copy.normalUser}{' '}
                <Link to="/signup" className="text-accent hover:text-accent/80 font-semibold hover:underline">
                  {copy.userSignup}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
