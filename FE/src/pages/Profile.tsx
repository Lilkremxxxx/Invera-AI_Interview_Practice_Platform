import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Upload, 
  Target,
  Briefcase,
  Save
} from 'lucide-react';
import { roles } from '@/lib/mock-data';
import { useLanguage } from '@/contexts/LanguageContext';

const Profile = () => {
  const { t, language } = useLanguage();
  const [name, setName] = useState('Nguyễn Văn A');
  const [email, setEmail] = useState('nguyen@example.com');
  const [targetRole, setTargetRole] = useState('frontend');
  const [careerGoal, setCareerGoal] = useState('');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('profile', 'title')}</h1>
        <p className="text-muted-foreground">{t('profile', 'subtitle')}</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('profile', 'personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl gradient-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-foreground">NA</span>
            </div>
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              {t('profile', 'uploadPhoto')}
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile', 'fullName')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('profile', 'email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Career Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t('profile', 'careerGoals')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('profile', 'targetRole')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {roles.slice(0, 6).map((role) => (
                <button
                  key={role.id}
                  onClick={() => setTargetRole(role.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    targetRole === role.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <span className="text-lg mr-2">{role.icon}</span>
                  <span className="text-sm font-medium">{role.name[language]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">{t('profile', 'careerDesc')}</Label>
            <Textarea
              id="goal"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder={t('profile', 'careerPlaceholder')}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* CV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t('profile', 'cvTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium text-foreground mb-2">{t('profile', 'uploadResume')}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('profile', 'fileTypes')}
            </p>
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              {t('profile', 'chooseFile')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg">
          <Save className="w-4 h-4" />
          {t('profile', 'saveChanges')}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
