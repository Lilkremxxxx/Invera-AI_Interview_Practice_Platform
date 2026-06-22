import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Globe,
  Volume2,
  Shield,
  Moon,
  Save,
  Lock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { profileApi } from '@/lib/api';

function safeGetItem(key: string, fallback: string | null = null): string | null {
  try {
    return typeof globalThis.localStorage?.getItem === 'function' ? globalThis.localStorage.getItem(key) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof globalThis.localStorage?.setItem === 'function') {
      globalThis.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

const Settings = () => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const { logout } = useAuthContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = safeGetItem('invera_tts');
    return saved !== null ? saved === 'true' : true;
  });
  const [dataSharing, setDataSharing] = useState(() => {
    const saved = safeGetItem('invera_data_sharing');
    return saved === 'true';
  });
  const { theme, setTheme, isAuthenticated } = useTheme();
  
  // Determine if dark mode is active (only for authenticated users)
  const isDarkMode = isAuthenticated && theme === 'dark';
  
  const handleDarkModeToggle = (checked: boolean) => {
    if (!isAuthenticated) return;
    setTheme(checked ? 'dark' : 'light');
  };

  const handleSave = async () => {
    setIsSaving(true);
    safeSetItem('invera_tts', String(ttsEnabled));
    safeSetItem('invera_data_sharing', String(dataSharing));
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast({
      title: language === 'vi' ? 'Đã lưu cài đặt' : 'Settings saved',
      description: language === 'vi' ? 'Tùy chọn của bạn đã được cập nhật.' : 'Your preferences have been updated.',
    });
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      language === 'vi'
        ? 'Bạn có chắc muốn xóa toàn bộ tài khoản và dữ liệu liên quan? Hành động này không thể hoàn tác.'
        : 'Are you sure you want to delete your account and all related data? This cannot be undone.',
    );
    if (!confirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      await profileApi.deleteAccount();
      toast({
        title: language === 'vi' ? 'Đã xóa tài khoản' : 'Account deleted',
        description: language === 'vi'
          ? 'Toàn bộ dữ liệu của bạn đã được xóa khỏi hệ thống.'
          : 'All of your data has been removed from the system.',
      });
      logout();
    } catch (error) {
      setIsDeleting(false);
      toast({
        title: language === 'vi' ? 'Không thể xóa tài khoản' : 'Unable to delete account',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('settings', 'title')}</h1>
        <p className="text-muted-foreground">{t('settings', 'subtitle')}</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('settings', 'language')}
          </CardTitle>
          <CardDescription>{t('settings', 'languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={language === 'en' ? 'accent' : 'outline'}
              onClick={() => setLanguage('en')}
            >
              🇺🇸 English
            </Button>
            <Button
              variant={language === 'vi' ? 'accent' : 'outline'}
              onClick={() => setLanguage('vi')}
            >
              🇻🇳 Tiếng Việt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            {t('settings', 'audio')}
          </CardTitle>
          <CardDescription>{t('settings', 'audioDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="tts" className="text-base">{t('settings', 'tts')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings', 'ttsDesc')}</p>
            </div>
            <Switch id="tts" checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            {t('settings', 'appearance')}
          </CardTitle>
          <CardDescription>{t('settings', 'appearanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="dark" className="text-base">{t('settings', 'darkMode')}</Label>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? t('settings', 'darkModeDesc') : t('settings', 'darkModeLocked')}
              </p>
              {!isAuthenticated && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>{t('settings', 'loginToChange')}</span>
                </div>
              )}
            </div>
            <Switch
              id="dark"
              checked={isDarkMode}
              onCheckedChange={handleDarkModeToggle}
              disabled={!isAuthenticated}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('settings', 'privacy')}
          </CardTitle>
          <CardDescription>{t('settings', 'privacyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sharing" className="text-base">{t('settings', 'dataSharing')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings', 'dataSharingDesc')}</p>
            </div>
            <Switch id="sharing" checked={dataSharing} onCheckedChange={setDataSharing} />
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('settings', 'deleteData')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : t('settings', 'save')}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
