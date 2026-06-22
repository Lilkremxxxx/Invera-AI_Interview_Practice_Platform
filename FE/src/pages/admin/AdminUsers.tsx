import { useEffect, useState } from 'react';
import { Download, Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';

import { adminApi, AdminManagedUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatBillingPeriod, formatPlanLabel, formatPlanStatus } from '@/lib/plans';

export default function AdminUsers() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'admins' | 'non_admins'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'free_trial' | 'basic' | 'pro' | 'premium'>('all');
  const [planStatusFilter, setPlanStatusFilter] = useState<'all' | 'active' | 'expired' | 'trial_exhausted'>('all');
  const [createdDayFilter, setCreatedDayFilter] = useState<'all' | string>('all');
  const [createdMonthFilter, setCreatedMonthFilter] = useState<'all' | string>('all');
  const [createdYearFilter, setCreatedYearFilter] = useState<'all' | string>('all');
  const [planDrafts, setPlanDrafts] = useState<Record<string, { plan_tier: 'free_trial' | 'basic' | 'pro' | 'premium'; billing_period: 'month' | 'year' }>>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [downloadingResumeUserId, setDownloadingResumeUserId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const copy = {
    title: language === 'vi' ? 'Quản lý người dùng' : 'User Management',
    subtitle: language === 'vi' ? 'Xem danh sách toàn bộ người dùng, quản lý gói tài khoản và phân quyền admin.' : 'View all users, manage plan tiers, and assign admin access.',
    loadErrorTitle: language === 'vi' ? 'Không thể tải danh sách người dùng' : 'Unable to load user list',
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
    usersTitle: language === 'vi' ? 'Quản lý toàn bộ user' : 'All users',
    usersDescription: language === 'vi'
      ? 'Lọc theo email, quyền admin, xác thực email, gói hiện tại và ngày tạo tài khoản. Bạn cũng có thể hủy gói hoặc nâng gói thủ công.'
      : 'Filter by email, admin flag, email verification, current plan, and account creation date. You can also cancel or upgrade plans manually.',
    searchUsers: language === 'vi' ? 'Tìm email hoặc tên' : 'Search email or name',
    allUsers: language === 'vi' ? 'Tất cả user' : 'All users',
    onlyAdmins: language === 'vi' ? 'Chỉ admin' : 'Admins only',
    nonAdmins: language === 'vi' ? 'Chỉ user thường' : 'Non-admins only',
    verifiedOnly: language === 'vi' ? 'Đã xác thực email' : 'Verified only',
    unverifiedOnly: language === 'vi' ? 'Chưa xác thực email' : 'Unverified only',
    allVerification: language === 'vi' ? 'Mọi trạng thái xác thực' : 'Any verification state',
    allPlans: language === 'vi' ? 'Mọi gói' : 'Any plan',
    allStatuses: language === 'vi' ? 'Mọi trạng thái gói' : 'Any plan status',
    allDates: language === 'vi' ? 'Mọi ngày tạo' : 'Any created date',
    createdDay: language === 'vi' ? 'Ngày' : 'Day',
    createdMonth: language === 'vi' ? 'Tháng' : 'Month',
    createdYear: language === 'vi' ? 'Năm' : 'Year',
    manualPlan: language === 'vi' ? 'Đổi gói thủ công' : 'Manual plan update',
    cancelPlan: language === 'vi' ? 'Hủy gói' : 'Cancel plan',
    applyPlan: language === 'vi' ? 'Áp dụng' : 'Apply',
    userUpdatedTitle: language === 'vi' ? 'Đã cập nhật gói user' : 'User plan updated',
    userUpdatedDescription: language === 'vi' ? 'Thay đổi đã được lưu trên hệ thống.' : 'The change was saved successfully.',
    userUpdateErrorTitle: language === 'vi' ? 'Không thể cập nhật gói user' : 'Unable to update user plan',
    userDeletedTitle: language === 'vi' ? 'Đã xóa user' : 'User deleted',
    userDeletedDescription: language === 'vi' ? 'Tài khoản và dữ liệu liên quan đã được xóa khỏi hệ thống.' : 'The account and related data were deleted.',
    userDeleteErrorTitle: language === 'vi' ? 'Không thể xóa user' : 'Unable to delete user',
    deleteUser: language === 'vi' ? 'Xóa user' : 'Delete user',
    noUsers: language === 'vi' ? 'Không có user nào khớp bộ lọc.' : 'No users match the current filters.',
    planLabel: language === 'vi' ? 'Gói' : 'Plan',
    planStatusLabel: language === 'vi' ? 'Trạng thái' : 'Status',
    verifiedLabel: language === 'vi' ? 'Xác thực email' : 'Email verification',
    yes: language === 'vi' ? 'Có' : 'Yes',
    no: language === 'vi' ? 'Không' : 'No',
    expiresLabel: language === 'vi' ? 'Hết hạn' : 'Expires',
    sessionUsage: language === 'vi' ? 'Session' : 'Sessions',
    resumeLabel: language === 'vi' ? 'Resume' : 'Resume',
    resumeUploaded: language === 'vi' ? 'Đã tải lên' : 'Uploaded',
    resumeMissing: language === 'vi' ? 'Chưa có' : 'Not uploaded',
    downloadResume: language === 'vi' ? 'Tải resume' : 'Download resume',
    downloadResumeFailed: language === 'vi' ? 'Không thể tải resume của user này.' : 'Unable to download this user resume.',
    noName: language === 'vi' ? 'Chưa có tên' : 'No name yet',
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
  };

  const loadUsers = async (page = currentPage) => {
    setLoading(true);
    try {
      const rows = await adminApi.getUsers({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: userSearch || undefined,
        is_admin: adminFilter === 'all' ? undefined : adminFilter === 'admins',
        email_verified: verificationFilter === 'all' ? undefined : verificationFilter === 'verified',
        plan_tier: planFilter === 'all' ? undefined : planFilter,
        plan_status: planStatusFilter === 'all' ? undefined : planStatusFilter,
        created_day: createdDayFilter === 'all' ? undefined : Number(createdDayFilter),
        created_month: createdMonthFilter === 'all' ? undefined : Number(createdMonthFilter),
        created_year: createdYearFilter === 'all' ? undefined : Number(createdYearFilter),
      });
      setUsers(rows);
      setCurrentPage(page);

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
    } catch (err) {
      toast({
        title: copy.loadErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [adminFilter, verificationFilter, planFilter, planStatusFilter, createdDayFilter, createdMonthFilter, createdYearFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa người dùng này? Thao tác này không thể hoàn tác.' : 'Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    setUpdatingUserId(userId);
    try {
      await adminApi.deleteUser(userId);
      toast({ title: copy.userDeletedTitle, description: copy.userDeletedDescription });
      await loadUsers();
    } catch (err) {
      toast({
        title: copy.userDeleteErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDownloadResume = async (managedUser: AdminManagedUser) => {
    setDownloadingResumeUserId(managedUser.id);
    try {
      const { blob, filename } = await adminApi.downloadUserResume(managedUser.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || managedUser.resume_filename || `${managedUser.email}-resume.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: copy.downloadResumeFailed,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setDownloadingResumeUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-muted-foreground mt-2">{copy.subtitle}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            {copy.usersTitle}
          </CardTitle>
          <CardDescription>{copy.usersDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-5">
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
          </form>
          <div className="grid gap-3 md:grid-cols-4">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={createdDayFilter}
              onChange={(e) => setCreatedDayFilter(e.target.value as 'all' | string)}
            >
              <option value="all">{copy.allDates}</option>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {copy.createdDay} {day}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={createdMonthFilter}
              onChange={(e) => setCreatedMonthFilter(e.target.value as 'all' | string)}
            >
              <option value="all">{copy.allDates}</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {copy.createdMonth} {month}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={createdYearFilter}
              onChange={(e) => setCreatedYearFilter(e.target.value as 'all' | string)}
            >
              <option value="all">{copy.allDates}</option>
              {Array.from({ length: currentYear - 2015 + 1 }, (_, index) => currentYear - index).map((year) => (
                <option key={year} value={year}>
                  {copy.createdYear} {year}
                </option>
              ))}
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
              <div className="space-y-4">
                {users.map((managedUser) => {
                  const draft = planDrafts[managedUser.id] ?? {
                    plan_tier: (managedUser.plan_tier ?? 'free_trial') as 'free_trial' | 'basic' | 'pro' | 'premium',
                    billing_period: (managedUser.plan_billing_period ?? 'month') as 'month' | 'year',
                  };
                  return (
                    <div key={managedUser.id} className="rounded-xl border border-border p-4 space-y-4 bg-card">
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
                          <div className="text-sm text-muted-foreground">
                            {copy.resumeLabel}:{' '}
                            <strong className="text-foreground">
                              {managedUser.resume_uploaded ? (managedUser.resume_filename || copy.resumeUploaded) : copy.resumeMissing}
                            </strong>
                          </div>
                        </div>

                        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
                          <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full lg:w-32"
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
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full lg:w-28"
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
                          <Button onClick={() => handlePlanUpdate(managedUser.id)} disabled={updatingUserId === managedUser.id} className="w-full lg:w-auto">
                            {updatingUserId === managedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : copy.applyPlan}
                          </Button>
                          <Button variant="outline" onClick={() => handleCancelPlan(managedUser.id)} disabled={updatingUserId === managedUser.id} className="w-full lg:w-auto">
                            {copy.cancelPlan}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDownloadResume(managedUser)}
                            disabled={!managedUser.resume_uploaded || downloadingResumeUserId === managedUser.id}
                            className="w-full lg:w-auto"
                          >
                            {downloadingResumeUserId === managedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            {copy.downloadResume}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteUser(managedUser.id)}
                            disabled={updatingUserId === managedUser.id || managedUser.is_primary_admin}
                            className="w-full lg:w-auto"
                          >
                            {copy.deleteUser}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  {language === 'vi' ? `Trang ${currentPage}` : `Page ${currentPage}`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadUsers(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {language === 'vi' ? 'Trang trước' : 'Previous'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadUsers(currentPage + 1)}
                    disabled={users.length < pageSize || loading}
                  >
                    {language === 'vi' ? 'Trang sau' : 'Next'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
