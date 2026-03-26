import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, MailCheck, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, authApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { BrandIcon } from '@/components/layout/BrandIcon';

type VerifyEmailLocationState = {
  message?: string;
  resendAvailableInSeconds?: number;
  redirectTo?: string;
  loginPath?: string;
  mode?: 'admin' | 'user';
};

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { language, t } = useLanguage();
  const copy = {
    adminTitle: language === 'vi' ? 'Xác thực email admin' : 'Verify your admin email',
    codeHelper: language === 'vi' ? 'Nhập mã 6 số vừa được gửi đến Gmail của bạn.' : 'Enter the 6-digit code sent to your email.',
    resendWait: language === 'vi'
      ? (seconds: number) => `Bạn có thể yêu cầu mã mới sau ${seconds} giây.`
      : (seconds: number) => `You can request a new code in ${seconds} seconds.`,
  };

  const locationState = location.state as VerifyEmailLocationState | null;
  const initialEmail = searchParams.get('email') ?? '';
  const queryMessage = searchParams.get('message') ?? '';
  const queryResendCooldown = Number(searchParams.get('resend_available_in_seconds') ?? '0');

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState(locationState?.message ?? queryMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(locationState?.resendAvailableInSeconds ?? queryResendCooldown);
  const redirectTo = locationState?.redirectTo ?? '/app';
  const loginPath = locationState?.loginPath ?? '/login';
  const isAdminVerify = locationState?.mode === 'admin';

  const helperText = useMemo(() => {
    if (infoMsg) return infoMsg;
    return t('verifyEmail', 'instruction');
  }, [infoMsg, t]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const response = await authApi.verifyEmail(email, code);
      if (response.access_token) {
        await loginWithToken(response.access_token);
      }
      navigate(response.is_admin ? '/admin' : redirectTo, { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('verifyEmail', 'error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg('');
    setIsResending(true);
    try {
      const response = await authApi.resendVerificationCode(email);
      setInfoMsg(response.message);
      setResendCooldown(response.resend_available_in_seconds);
    } catch (err) {
      if (err instanceof ApiError && typeof err.payload?.retry_after_seconds === 'number') {
        setResendCooldown(err.payload.retry_after_seconds);
      }
      setErrorMsg(err instanceof Error ? err.message : t('verifyEmail', 'resendError'));
    } finally {
      setIsResending(false);
    }
  };

  const resendLabel = useMemo(() => {
    if (isResending) {
      return t('verifyEmail', 'resending');
    }
    if (resendCooldown > 0) {
      return language === 'vi'
        ? `Gửi lại sau ${resendCooldown}s`
        : `Resend in ${resendCooldown}s`;
    }
    return t('verifyEmail', 'resend');
  }, [isResending, language, resendCooldown, t]);

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
              {t('verifyEmail', 'panelTitle')}
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              {t('verifyEmail', 'panelSubtitle')}
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
                <MailCheck className="w-7 h-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
                {isAdminVerify ? copy.adminTitle : t('verifyEmail', 'title')}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {helperText}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="verify-email" className="text-sm font-semibold text-foreground">
                  {t('verifyEmail', 'email')}
                </Label>
                <Input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base border-border/80 focus:border-accent focus-visible:ring-accent"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="verification-code" className="text-sm font-semibold text-foreground">
                  {t('verifyEmail', 'code')}
                </Label>
                <InputOTP
                  id="verification-code"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  pattern="^[0-9]+$"
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground/80 mt-2">
                  {copy.codeHelper}
                </p>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={isSubmitting || code.length !== 6}
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('verifyEmail', 'submitting')}
                  </>
                ) : (
                  <>
                    {t('verifyEmail', 'submit')}
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                variant={resendCooldown > 0 || isResending ? 'outline' : 'accent'}
                size="lg"
                disabled={isResending || !email || resendCooldown > 0}
                onClick={handleResend}
                className="h-12 border-border/80 transition-all data-[ready=true]:border-accent/60 data-[ready=true]:shadow-md"
                data-ready={resendCooldown === 0 && !isResending ? 'true' : 'false'}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {resendLabel}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    {resendLabel}
                  </>
                )}
              </Button>

              {resendCooldown > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {copy.resendWait(resendCooldown)}
                </p>
              )}

              <p className="text-sm text-center text-muted-foreground">
                {t('verifyEmail', 'haveAccount')}{' '}
                <Link
                  to={loginPath}
                  className="text-accent hover:text-accent/80 font-semibold hover:underline transition-colors"
                >
                  {t('verifyEmail', 'login')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
