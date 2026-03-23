import { ChangeEvent, useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { profileApi } from '@/lib/api';
import { roles } from '@/lib/mock-data';
import { userInitials } from '@/lib/plans';
import {
  Briefcase,
  Calendar,
  Download,
  Loader2,
  Save,
  Target,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const RESUME_MAX_BYTES = 100 * 1024 * 1024;

const copy = {
  vi: {
    verifiedAccount: 'Tài khoản đã được xác thực',
    joinedOn: 'Tham gia từ',
    userId: 'User ID',
    avatarHint: 'Ảnh JPG, PNG hoặc WEBP tối đa 5MB.',
    uploadAvatar: 'Tải avatar',
    changeAvatar: 'Đổi avatar',
    removeAvatar: 'Xóa avatar',
    avatarUploaded: 'Avatar đã được cập nhật.',
    avatarRemoved: 'Avatar đã được xóa.',
    avatarBusy: 'Đang xử lý avatar...',
    invalidAvatarType: 'Avatar chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.',
    invalidAvatarSize: 'Avatar vượt quá 5MB.',
    resumeLabel: 'Resume hiện tại',
    noResume: 'Chưa có resume nào được tải lên.',
    resumeHint: 'Chỉ hỗ trợ PDF, tối đa 100MB.',
    uploadResume: 'Tải resume',
    replaceResume: 'Thay resume',
    downloadResume: 'Tải xuống',
    deleteResume: 'Xóa resume',
    resumeUploaded: 'Resume đã được tải lên.',
    resumeDeleted: 'Resume đã được xóa.',
    resumeBusy: 'Đang xử lý resume...',
    invalidResumeType: 'Resume chỉ hỗ trợ file PDF.',
    invalidResumeSize: 'Resume vượt quá 100MB.',
    downloadFailed: 'Không thể tải resume lúc này.',
    saveDone: 'Đã lưu',
    saveDescription: 'Cập nhật thông tin thành công.',
    saving: 'Đang lưu...',
    chooseFile: 'Chọn tệp',
  },
  en: {
    verifiedAccount: 'Verified account',
    joinedOn: 'Joined',
    userId: 'User ID',
    avatarHint: 'JPG, PNG, or WEBP up to 5MB.',
    uploadAvatar: 'Upload avatar',
    changeAvatar: 'Change avatar',
    removeAvatar: 'Remove avatar',
    avatarUploaded: 'Avatar updated successfully.',
    avatarRemoved: 'Avatar removed successfully.',
    avatarBusy: 'Updating avatar...',
    invalidAvatarType: 'Avatar must be JPG, JPEG, PNG, or WEBP.',
    invalidAvatarSize: 'Avatar exceeds the 5MB limit.',
    resumeLabel: 'Current resume',
    noResume: 'No resume uploaded yet.',
    resumeHint: 'PDF only, up to 100MB.',
    uploadResume: 'Upload resume',
    replaceResume: 'Replace resume',
    downloadResume: 'Download',
    deleteResume: 'Delete resume',
    resumeUploaded: 'Resume uploaded successfully.',
    resumeDeleted: 'Resume removed successfully.',
    resumeBusy: 'Processing resume...',
    invalidResumeType: 'Resume must be a PDF file.',
    invalidResumeSize: 'Resume exceeds the 100MB limit.',
    downloadFailed: 'Unable to download the resume right now.',
    saveDone: 'Saved',
    saveDescription: 'Profile preferences updated successfully.',
    saving: 'Saving...',
    chooseFile: 'Choose file',
  },
} as const;

const Profile = () => {
  const { t, language } = useLanguage();
  const { user, refreshUser } = useAuthContext();
  const { toast } = useToast();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const text = copy[language];

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const [targetRole, setTargetRole] = useState('frontend');
  const [careerGoal, setCareerGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const [isResumeBusy, setIsResumeBusy] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('invera_target_role', targetRole);
    localStorage.setItem('invera_career_goal', careerGoal);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSaving(false);
    toast({ title: text.saveDone, description: text.saveDescription });
  };

  useEffect(() => {
    const savedRole = localStorage.getItem('invera_target_role');
    const savedGoal = localStorage.getItem('invera_career_goal');
    if (savedRole) setTargetRole(savedRole);
    if (savedGoal) setCareerGoal(savedGoal);
  }, []);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const validAvatarType =
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

    if (!validAvatarType) {
      toast({ title: text.invalidAvatarType, variant: 'destructive' });
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast({ title: text.invalidAvatarSize, variant: 'destructive' });
      return;
    }

    setIsAvatarBusy(true);
    try {
      await profileApi.uploadAvatar(file);
      await refreshUser();
      toast({ title: text.avatarUploaded });
    } catch (error) {
      toast({
        title: text.invalidAvatarType,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsAvatarBusy(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setIsAvatarBusy(true);
    try {
      await profileApi.deleteAvatar();
      await refreshUser();
      toast({ title: text.avatarRemoved });
    } catch (error) {
      toast({
        title: text.removeAvatar,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsAvatarBusy(false);
    }
  };

  const handleResumeChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    if (!isPdf) {
      toast({ title: text.invalidResumeType, variant: 'destructive' });
      return;
    }

    if (file.size > RESUME_MAX_BYTES) {
      toast({ title: text.invalidResumeSize, variant: 'destructive' });
      return;
    }

    setIsResumeBusy(true);
    try {
      await profileApi.uploadResume(file);
      await refreshUser();
      toast({ title: text.resumeUploaded });
    } catch (error) {
      toast({
        title: text.uploadResume,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsResumeBusy(false);
    }
  };

  const handleDeleteResume = async () => {
    setIsResumeBusy(true);
    try {
      await profileApi.deleteResume();
      await refreshUser();
      toast({ title: text.resumeDeleted });
    } catch (error) {
      toast({
        title: text.deleteResume,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsResumeBusy(false);
    }
  };

  const handleDownloadResume = async () => {
    setIsResumeBusy(true);
    try {
      const { blob, filename } = await profileApi.downloadResume();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || user?.resume_filename || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: text.downloadFailed,
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsResumeBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('profile', 'title')}</h1>
        <p className="text-muted-foreground">{t('profile', 'subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('profile', 'personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <Avatar className="h-24 w-24 rounded-3xl border border-border shadow-sm">
              <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.email ?? 'Profile avatar'} />
              <AvatarFallback className="rounded-3xl gradient-accent text-2xl font-bold text-accent-foreground">
                {userInitials(user)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{text.verifiedAccount}</p>
                <p className="font-semibold text-foreground">{user?.email ?? '—'}</p>
                {user?.created_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    {text.joinedOn} {new Date(user.created_at).toLocaleDateString(locale)}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isAvatarBusy}
                >
                  {isAvatarBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {user?.avatar_url ? text.changeAvatar : text.uploadAvatar}
                </Button>
                {user?.avatar_url && (
                  <Button
                    variant="ghost"
                    onClick={handleDeleteAvatar}
                    disabled={isAvatarBusy}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    {text.removeAvatar}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{text.avatarHint}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('profile', 'email')}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label>{text.userId}</Label>
              <Input
                value={user?.id ? `${user.id.slice(0, 8)}…` : '—'}
                readOnly
                className="bg-muted cursor-not-allowed font-mono text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
              onChange={(event) => setCareerGoal(event.target.value)}
              placeholder={t('profile', 'careerPlaceholder')}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t('profile', 'cvTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-xl p-8 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-medium text-foreground">{text.resumeLabel}</h4>
                <p className="text-sm text-muted-foreground">
                  {user?.resume_uploaded ? user.resume_filename : text.noResume}
                </p>
                <p className="text-xs text-muted-foreground">{text.resumeHint}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleResumeChange}
                />
                <Button
                  variant="outline"
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={isResumeBusy}
                >
                  {isResumeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {user?.resume_uploaded ? text.replaceResume : text.uploadResume}
                </Button>

                {user?.resume_uploaded && (
                  <>
                    <Button variant="ghost" onClick={handleDownloadResume} disabled={isResumeBusy}>
                      <Download className="w-4 h-4" />
                      {text.downloadResume}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleDeleteResume}
                      disabled={isResumeBusy}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      {text.deleteResume}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {!user?.resume_uploaded && (
              <div className="rounded-xl bg-muted/50 p-6 text-center">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium text-foreground mb-2">{t('profile', 'uploadResume')}</h4>
                <p className="text-sm text-muted-foreground mb-4">{text.resumeHint}</p>
                <Button variant="outline" onClick={() => resumeInputRef.current?.click()} disabled={isResumeBusy}>
                  <Upload className="w-4 h-4" />
                  {text.chooseFile}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="accent" size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? text.saving : t('profile', 'saveChanges')}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
