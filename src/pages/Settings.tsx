import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { 
  Settings as SettingsIcon,
  Globe,
  Volume2,
  Shield,
  Moon,
  Save,
  Lock
} from 'lucide-react';

const Settings = () => {
  const [language, setLanguage] = useState('vi');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const { theme, setTheme, isAuthenticated } = useTheme();
  
  // Determine if dark mode is active (only for authenticated users)
  const isDarkMode = isAuthenticated && theme === 'dark';
  
  const handleDarkModeToggle = (checked: boolean) => {
    if (!isAuthenticated) {
      return; // Prevent toggle for non-authenticated users
    }
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý tùy chọn ứng dụng của bạn</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Ngôn ngữ
          </CardTitle>
          <CardDescription>Chọn ngôn ngữ ưa thích của bạn</CardDescription>
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
            Cài đặt âm thanh
          </CardTitle>
          <CardDescription>Cấu hình chuyển văn bản thành giọng nói và phản hồi âm thanh</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="tts" className="text-base">Chuyển văn bản thành giọng nói</Label>
              <p className="text-sm text-muted-foreground">
                Nghe phản hồi được đọc to cho bạn
              </p>
            </div>
            <Switch
              id="tts"
              checked={ttsEnabled}
              onCheckedChange={setTtsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Giao diện
          </CardTitle>
          <CardDescription>Tùy chỉnh giao diện và cảm giác</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="dark" className="text-base">Chế độ tối</Label>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated 
                  ? "Sử dụng giao diện tối cho ứng dụng"
                  : "Chỉ khả dụng cho người dùng đã đăng nhập"
                }
              </p>
              {!isAuthenticated && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Đăng nhập để thay đổi chủ đề</span>
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
            Quyền riêng tư
          </CardTitle>
          <CardDescription>Kiểm soát dữ liệu và cài đặt quyền riêng tư của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sharing" className="text-base">Chia sẻ dữ liệu ẩn danh</Label>
              <p className="text-sm text-muted-foreground">
                Giúp cải thiện AI của chúng tôi bằng cách chia sẻ dữ liệu luyện tập ẩn danh
              </p>
            </div>
            <Switch
              id="sharing"
              checked={dataSharing}
              onCheckedChange={setDataSharing}
            />
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" className="text-destructive hover:text-destructive">
              Xóa tất cả dữ liệu của tôi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg">
          <Save className="w-4 h-4" />
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
};

export default Settings;
