import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings as SettingsIcon,
  Globe,
  Volume2,
  Shield,
  Moon,
  Save
} from 'lucide-react';

const Settings = () => {
  const [language, setLanguage] = useState('en');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language
          </CardTitle>
          <CardDescription>Choose your preferred language</CardDescription>
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
            Audio Settings
          </CardTitle>
          <CardDescription>Configure text-to-speech and audio feedback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="tts" className="text-base">Text-to-Speech</Label>
              <p className="text-sm text-muted-foreground">
                Have feedback read aloud to you
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
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark" className="text-base">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use dark theme for the interface
              </p>
            </div>
            <Switch
              id="dark"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy
          </CardTitle>
          <CardDescription>Control your data and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sharing" className="text-base">Anonymous Data Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Help improve our AI by sharing anonymized practice data
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
              Delete All My Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
