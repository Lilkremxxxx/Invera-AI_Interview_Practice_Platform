import { useEffect, useState } from 'react';
import { Loader2, MailPlus, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

import { adminApi, AdminAccessUser, AdminInviteOut } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function AdminAccess() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const copy = {
    loadErrorTitle: language === 'vi' ? 'Không thể tải quyền admin' : 'Unable to load admin access',
    loadErrorDescription: language === 'vi' ? 'Hãy kiểm tra lại quyền admin hiện tại.' : 'Please check the current admin permissions again.',
    inviteSentTitle: language === 'vi' ? 'Đã gửi lời mời admin' : 'Admin invitation sent',
    inviteSentDescription: language === 'vi'
      ? 'Invera đã gửi email hướng dẫn vào khu admin. Email mới sẽ nhận link tạo tài khoản, còn tài khoản đã xác thực sẽ nhận link đăng nhập admin.'
      : 'Invera has sent an admin-access email. New emails receive an admin-signup link, while verified existing accounts receive an admin-login link.',
    inviteErrorTitle: language === 'vi' ? 'Không thể tạo lời mời' : 'Unable to create invitation',
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
    revokeTitle: language === 'vi' ? 'Đã thu hồi lời mời' : 'Invitation revoked',
    revokeDescription: language === 'vi' ? 'Email này không còn được phép đăng ký admin nữa.' : 'This email can no longer use the admin invitation.',
    revokeErrorTitle: language === 'vi' ? 'Không thể thu hồi lời mời' : 'Unable to revoke invitation',
    removeTitle: language === 'vi' ? 'Đã gỡ quyền admin' : 'Admin access removed',
    removeDescription: language === 'vi' ? 'Tài khoản này không còn truy cập được khu vực admin.' : 'This account can no longer access the admin area.',
    removeErrorTitle: language === 'vi' ? 'Không thể gỡ quyền admin' : 'Unable to remove admin access',
    primaryOnlyDescription: language === 'vi' ? 'Chỉ admin chính mới được phép quản lý danh sách admin.' : 'Only the primary admin can manage the admin list.',
    pageSubtitle: language === 'vi' ? 'Quản lý email được mời đăng ký admin và danh sách admin đang hoạt động.' : 'Manage invited admin emails and the list of active admins.',
    inviteTitle: language === 'vi' ? 'Mời admin mới' : 'Invite a new admin',
    inviteDescription: language === 'vi'
      ? 'Nhập Gmail cần mời. Nếu email chưa có tài khoản, Invera sẽ gửi link mở `/admin/signup`. Nếu email đã có tài khoản và đã xác thực, hệ thống sẽ cấp quyền admin ngay và gửi link mở `/admin/login`.'
      : 'Enter the Gmail address to invite. If it has no account yet, Invera sends an `/admin/signup` link. If it already has a verified account, admin access is activated immediately and an `/admin/login` link is sent.',
    inviteEmail: language === 'vi' ? 'Gmail admin mới' : 'New admin Gmail',
    notes: language === 'vi' ? 'Ghi chú' : 'Notes',
    notesPlaceholder: language === 'vi' ? 'Ví dụ: admin hỗ trợ nội dung' : 'Example: content support admin',
    inviteButton: language === 'vi' ? 'Mời admin' : 'Invite admin',
    activeAdmins: language === 'vi' ? 'Admins đang hoạt động' : 'Active admins',
    protectedDescription: language === 'vi' ? 'Admin chính không thể bị gỡ quyền từ giao diện này.' : 'The primary admin cannot be demoted from this screen.',
    noName: language === 'vi' ? 'Chưa có tên' : 'No name yet',
    protectedLabel: language === 'vi' ? 'Bảo vệ' : 'Protected',
    removeButton: language === 'vi' ? 'Gỡ quyền' : 'Remove access',
    inviteList: language === 'vi' ? 'Danh sách lời mời' : 'Invitation list',
    inviteListDescription: language === 'vi'
      ? 'Pending là email chưa có tài khoản nên còn chờ tạo tài khoản admin. Activated là email đã có tài khoản xác thực và đã được cấp quyền admin.'
      : 'Pending means the email still needs to create an admin account. Activated means the email already had a verified account and has been granted admin access.',
    noInvites: language === 'vi' ? 'Chưa có lời mời admin nào.' : 'No admin invitations yet.',
    invitedBy: language === 'vi' ? 'mời bởi' : 'invited by',
    revokeButton: language === 'vi' ? 'Thu hồi' : 'Revoke',
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
  };
  const [admins, setAdmins] = useState<AdminAccessUser[]>([]);
  const [invites, setInvites] = useState<AdminInviteOut[]>([]);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminUsers, inviteRows] = await Promise.all([
        adminApi.getAdminUsers(),
        adminApi.getInvites(),
      ]);
      setAdmins(adminUsers);
      setInvites(inviteRows);
    } catch (err) {
      toast({
        title: copy.loadErrorTitle,
        description: err instanceof Error ? err.message : copy.loadErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await adminApi.createInvite(email, notes || undefined);
      setEmail('');
      setNotes('');
      toast({
        title: copy.inviteSentTitle,
        description: copy.inviteSentDescription,
      });
      await loadData();
    } catch (err) {
      toast({
        title: copy.inviteErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await adminApi.revokeInvite(inviteId);
      toast({ title: copy.revokeTitle, description: copy.revokeDescription });
      await loadData();
    } catch (err) {
      toast({
        title: copy.revokeErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      await adminApi.removeAdmin(adminId);
      toast({ title: copy.removeTitle, description: copy.removeDescription });
      await loadData();
    } catch (err) {
      toast({
        title: copy.removeErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    }
  };

  if (!user?.is_primary_admin) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Admin access</CardTitle>
          <CardDescription>{copy.primaryOnlyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Access</h2>
        <p className="text-muted-foreground mt-2">{copy.pageSubtitle}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{copy.inviteTitle}</CardTitle>
          <CardDescription>{copy.inviteDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{copy.inviteEmail}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="new-admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-notes">{copy.notes}</Label>
              <Input
                id="invite-notes"
                placeholder={copy.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailPlus className="w-4 h-4" />}
                {copy.inviteButton}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{copy.activeAdmins}</CardTitle>
            <CardDescription>{copy.protectedDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-4">
                {admins.map((adminUser) => (
                  <div key={adminUser.id} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        {adminUser.email}
                        {adminUser.is_primary_admin && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                            Primary
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {adminUser.full_name || copy.noName} · {adminUser.provider || 'local'} · {new Date(adminUser.created_at).toLocaleDateString(copy.locale)}
                      </p>
                    </div>
                    {adminUser.is_primary_admin ? (
                      <div className="inline-flex items-center gap-2 text-xs text-accent">
                        <ShieldCheck className="w-4 h-4" />
                        {copy.protectedLabel}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleRemoveAdmin(adminUser.id)}>
                        <ShieldX className="w-4 h-4" />
                        {copy.removeButton}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{copy.inviteList}</CardTitle>
          <CardDescription>{copy.inviteListDescription}</CardDescription>
        </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-4">
                {invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{copy.noInvites}</p>
                ) : (
                  invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{invite.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {invite.status} · {new Date(invite.created_at).toLocaleDateString(copy.locale)}
                          {invite.invited_by_email ? ` · ${copy.invitedBy} ${invite.invited_by_email}` : ''}
                        </p>
                      </div>
                      {invite.status === 'pending' ? (
                        <Button variant="outline" size="sm" onClick={() => handleRevokeInvite(invite.id)}>
                          <Trash2 className="w-4 h-4" />
                          {copy.revokeButton}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{invite.status}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
