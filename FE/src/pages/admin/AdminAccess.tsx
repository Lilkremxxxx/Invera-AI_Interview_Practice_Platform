import { useEffect, useState } from 'react';
import { Loader2, MailPlus, ShieldCheck, ShieldX, Trash2, Users } from 'lucide-react';

import { adminApi, AdminAccessUser, AdminInviteOut, AdminManagedUser } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatBillingPeriod, formatPlanLabel, formatPlanStatus } from '@/lib/plans';

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
    usersTitle: language === 'vi' ? 'Quản lý toàn bộ user' : 'All users',
    usersDescription: language === 'vi'
      ? 'Lọc theo email, quyền admin, xác thực email và gói hiện tại. Bạn cũng có thể hủy gói hoặc nâng gói thủ công.'
      : 'Filter by email, admin flag, email verification, and current plan. You can also cancel or upgrade plans manually.',
    searchUsers: language === 'vi' ? 'Tìm email hoặc tên' : 'Search email or name',
    allUsers: language === 'vi' ? 'Tất cả user' : 'All users',
    onlyAdmins: language === 'vi' ? 'Chỉ admin' : 'Admins only',
    nonAdmins: language === 'vi' ? 'Chỉ user thường' : 'Non-admins only',
    verifiedOnly: language === 'vi' ? 'Đã xác thực email' : 'Verified only',
    unverifiedOnly: language === 'vi' ? 'Chưa xác thực email' : 'Unverified only',
    allVerification: language === 'vi' ? 'Mọi trạng thái xác thực' : 'Any verification state',
    allPlans: language === 'vi' ? 'Mọi gói' : 'Any plan',
    allStatuses: language === 'vi' ? 'Mọi trạng thái gói' : 'Any plan status',
    manualPlan: language === 'vi' ? 'Đổi gói thủ công' : 'Manual plan update',
    cancelPlan: language === 'vi' ? 'Hủy gói' : 'Cancel plan',
    applyPlan: language === 'vi' ? 'Áp dụng' : 'Apply',
    userUpdatedTitle: language === 'vi' ? 'Đã cập nhật gói user' : 'User plan updated',
    userUpdatedDescription: language === 'vi' ? 'Thay đổi đã được lưu trên hệ thống.' : 'The change was saved successfully.',
    userUpdateErrorTitle: language === 'vi' ? 'Không thể cập nhật gói user' : 'Unable to update user plan',
    noUsers: language === 'vi' ? 'Không có user nào khớp bộ lọc.' : 'No users match the current filters.',
    planLabel: language === 'vi' ? 'Gói' : 'Plan',
    planStatusLabel: language === 'vi' ? 'Trạng thái' : 'Status',
    verifiedLabel: language === 'vi' ? 'Xác thực email' : 'Email verification',
    yes: language === 'vi' ? 'Có' : 'Yes',
    no: language === 'vi' ? 'Không' : 'No',
    expiresLabel: language === 'vi' ? 'Hết hạn' : 'Expires',
    sessionUsage: language === 'vi' ? 'Session' : 'Sessions',
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
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'admins' | 'non_admins'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'free_trial' | 'basic' | 'pro' | 'premium'>('all');
  const [planStatusFilter, setPlanStatusFilter] = useState<'all' | 'active' | 'expired' | 'trial_exhausted'>('all');
  const [planDrafts, setPlanDrafts] = useState<Record<string, { plan_tier: 'free_trial' | 'basic' | 'pro' | 'premium'; billing_period: 'month' | 'year' }>>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    const rows = await adminApi.getUsers({
      limit: 100,
      search: userSearch || undefined,
      is_admin: adminFilter === 'all' ? undefined : adminFilter === 'admins',
      email_verified: verificationFilter === 'all' ? undefined : verificationFilter === 'verified',
      plan_tier: planFilter === 'all' ? undefined : planFilter,
      plan_status: planStatusFilter === 'all' ? undefined : planStatusFilter,
    });
    setUsers(rows);
    setPlanDrafts((current) => {
      const next = { ...current };
      for (const row of rows) {
        next[row.id] = {
          plan_tier: (row.plan_tier ?? 'free_trial') as 'free_trial' | 'basic' | 'pro' | 'premium',
          billing_period: (row.plan_billing_period ?? 'month') as 'month' | 'year',
        };
      }
      return next;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminUsers, inviteRows] = await Promise.all([
        adminApi.getAdminUsers(),
        adminApi.getInvites(),
      ]);
      setAdmins(adminUsers);
      setInvites(inviteRows);
      await loadUsers();
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

  useEffect(() => {
    if (!user?.is_primary_admin) return;
    void loadUsers();
  }, [userSearch, adminFilter, verificationFilter, planFilter, planStatusFilter]);

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

  const handlePlanUpdate = async (userId: string) => {
    const draft = planDrafts[userId];
    if (!draft) return;
    setUpdatingUserId(userId);
    try {
      await adminApi.updateUserPlan(userId, draft);
      toast({ title: copy.userUpdatedTitle, description: copy.userUpdatedDescription });
      await loadUsers();
    } catch (err) {
      toast({
        title: copy.userUpdateErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCancelPlan = async (userId: string) => {
    setUpdatingUserId(userId);
    try {
      await adminApi.updateUserPlan(userId, { plan_tier: 'free_trial', billing_period: 'month' });
      toast({ title: copy.userUpdatedTitle, description: copy.userUpdatedDescription });
      await loadUsers();
    } catch (err) {
      toast({
        title: copy.userUpdateErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
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

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {copy.usersTitle}
          </CardTitle>
          <CardDescription>{copy.usersDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              placeholder={copy.searchUsers}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={adminFilter} onChange={(e) => setAdminFilter(e.target.value as typeof adminFilter)}>
              <option value="all">{copy.allUsers}</option>
              <option value="admins">{copy.onlyAdmins}</option>
              <option value="non_admins">{copy.nonAdmins}</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as typeof verificationFilter)}>
              <option value="all">{copy.allVerification}</option>
              <option value="verified">{copy.verifiedOnly}</option>
              <option value="unverified">{copy.unverifiedOnly}</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={planFilter} onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}>
              <option value="all">{copy.allPlans}</option>
              <option value="free_trial">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={planStatusFilter} onChange={(e) => setPlanStatusFilter(e.target.value as typeof planStatusFilter)}>
              <option value="all">{copy.allStatuses}</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="trial_exhausted">Trial exhausted</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noUsers}</p>
          ) : (
            <div className="space-y-4">
              {users.map((managedUser) => {
                const draft = planDrafts[managedUser.id] ?? {
                  plan_tier: (managedUser.plan_tier ?? 'free_trial') as 'free_trial' | 'basic' | 'pro' | 'premium',
                  billing_period: (managedUser.plan_billing_period ?? 'month') as 'month' | 'year',
                };
                return (
                  <div key={managedUser.id} className="rounded-xl border border-border p-4 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{managedUser.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {managedUser.full_name || copy.noName} · {managedUser.provider || 'local'} · {new Date(managedUser.created_at).toLocaleDateString(copy.locale)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {copy.verifiedLabel}: <strong className="text-foreground">{managedUser.email_verified ? copy.yes : copy.no}</strong> · {copy.planLabel}:{' '}
                          <strong className="text-foreground">{formatPlanLabel(managedUser, language)}</strong> · {copy.planStatusLabel}:{' '}
                          <strong className="text-foreground">{formatPlanStatus(managedUser, language)}</strong>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {copy.sessionUsage}: <strong className="text-foreground">{managedUser.sessions_used ?? 0}</strong>
                          {typeof managedUser.session_limit === 'number' ? ` / ${managedUser.session_limit}` : ' / Unlimited'} · {copy.expiresLabel}:{' '}
                          <strong className="text-foreground">
                            {managedUser.plan_expires_at ? new Date(managedUser.plan_expires_at).toLocaleString(copy.locale) : '-'}
                          </strong> · {formatBillingPeriod(managedUser.plan_billing_period ?? null, language)}
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-[160px_140px_auto_auto]">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={draft.plan_tier}
                          onChange={(e) =>
                            setPlanDrafts((current) => ({
                              ...current,
                              [managedUser.id]: {
                                ...draft,
                                plan_tier: e.target.value as 'free_trial' | 'basic' | 'pro' | 'premium',
                              },
                            }))
                          }
                        >
                          <option value="free_trial">Free</option>
                          <option value="basic">Basic</option>
                          <option value="pro">Pro</option>
                          <option value="premium">Premium</option>
                        </select>
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={draft.billing_period}
                          onChange={(e) =>
                            setPlanDrafts((current) => ({
                              ...current,
                              [managedUser.id]: {
                                ...draft,
                                billing_period: e.target.value as 'month' | 'year',
                              },
                            }))
                          }
                        >
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                        </select>
                        <Button onClick={() => handlePlanUpdate(managedUser.id)} disabled={updatingUserId === managedUser.id}>
                          {updatingUserId === managedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : copy.applyPlan}
                        </Button>
                        <Button variant="outline" onClick={() => handleCancelPlan(managedUser.id)} disabled={updatingUserId === managedUser.id}>
                          {copy.cancelPlan}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
