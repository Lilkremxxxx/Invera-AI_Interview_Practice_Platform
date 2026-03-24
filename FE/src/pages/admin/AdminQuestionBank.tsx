import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Loader2, Plus, Search, Sparkles, Trash2, Wand2 } from 'lucide-react';

import {
  adminApi,
  type AdminQuestionGenerateRequest,
  type AdminQuestionOut,
  type AdminQuestionUpsert,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

type MajorKey = 'technology' | 'finance' | 'business';

type RoleOption = {
  value: string;
  en: string;
  vi: string;
};

const ROLE_OPTIONS: Record<MajorKey, RoleOption[]> = {
  technology: [
    { value: 'frontend', en: 'Frontend Developer', vi: 'Frontend Developer' },
    { value: 'backend', en: 'Backend Developer', vi: 'Backend Developer' },
    { value: 'fullstack', en: 'Fullstack Developer', vi: 'Fullstack Developer' },
    { value: 'data_scientist', en: 'Data Scientist', vi: 'Data Scientist' },
    { value: 'machine_learning_engineer', en: 'Machine Learning Engineer', vi: 'Machine Learning Engineer' },
    { value: 'devops_engineer', en: 'DevOps Engineer', vi: 'DevOps Engineer' },
    { value: 'product_manager', en: 'Product Manager', vi: 'Product Manager' },
    { value: 'marketing_manager', en: 'Marketing Manager', vi: 'Marketing Manager' },
    { value: 'sales_representative', en: 'Sales Representative', vi: 'Sales Representative' },
    { value: 'ux_designer', en: 'UX Designer', vi: 'UX Designer' },
  ],
  finance: [
    { value: 'financial_analyst', en: 'Financial Analyst', vi: 'Chuyên viên phân tích tài chính' },
    { value: 'accountant', en: 'Accountant', vi: 'Kế toán' },
    { value: 'auditor', en: 'Auditor', vi: 'Kiểm toán viên' },
    { value: 'investment_banking_analyst', en: 'Investment Banking Analyst', vi: 'Chuyên viên phân tích ngân hàng đầu tư' },
  ],
  business: [
    { value: 'business_analyst', en: 'Business Analyst', vi: 'Business Analyst' },
    { value: 'operations_analyst', en: 'Operations Analyst', vi: 'Chuyên viên phân tích vận hành' },
    { value: 'sales_executive', en: 'Sales Executive', vi: 'Nhân viên kinh doanh' },
    { value: 'marketing_executive', en: 'Marketing Executive', vi: 'Nhân viên marketing' },
  ],
};

const LEVEL_OPTIONS = ['intern', 'fresher', 'junior', 'mid', 'senior'] as const;
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'] as const;

function prettyLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseTagInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagInputValue(tags: string[] | undefined) {
  return (tags || []).join(', ');
}

function getLevelBadgeClass(level: string) {
  const map: Record<string, string> = {
    intern: 'border-sky-200 bg-sky-50 text-sky-700',
    fresher: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    junior: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    mid: 'border-amber-200 bg-amber-50 text-amber-700',
    senior: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return map[level] || 'border-slate-200 bg-slate-50 text-slate-700';
}

function getDifficultyBadgeClass(difficulty: string) {
  const map: Record<string, string> = {
    easy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    hard: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return map[difficulty] || 'border-slate-200 bg-slate-50 text-slate-700';
}

function getMajorBadgeClass(major: string) {
  const map: Record<string, string> = {
    technology: 'border-violet-200 bg-violet-50 text-violet-700',
    finance: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    business: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return map[major] || 'border-slate-200 bg-slate-50 text-slate-700';
}

function emptyQuestionForm(): AdminQuestionUpsert {
  return {
    major: 'technology',
    role: ROLE_OPTIONS.technology[0].value,
    level: 'intern',
    text: '',
    category: '',
    difficulty: 'medium',
    ideal_answer: '',
    tags: [],
  };
}

function emptyGenerateForm(): AdminQuestionGenerateRequest {
  return {
    major: 'technology',
    role: ROLE_OPTIONS.technology[0].value,
    level: 'intern',
    difficulty: 'medium',
    category: '',
    prompt: '',
    tags: [],
    output_language: 'en',
  };
}

export function AdminQuestionBank() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [questions, setQuestions] = useState<AdminQuestionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [major, setMajor] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState<AdminQuestionUpsert>(emptyQuestionForm());
  const [questionTagsInput, setQuestionTagsInput] = useState('');
  const [generatorForm, setGeneratorForm] = useState<AdminQuestionGenerateRequest>(emptyGenerateForm());
  const [generatorTagsInput, setGeneratorTagsInput] = useState('');
  const [duplicateDraft, setDuplicateDraft] = useState<AdminQuestionOut | null>(null);

  const copy = {
    title: language === 'vi' ? 'Ngân hàng câu hỏi - trả lời' : 'Question and answer bank',
    subtitle:
      language === 'vi'
        ? 'Quản lý ngân hàng câu hỏi, đáp án mẫu, major, tag và draft AI generation cho Invera.'
        : 'Manage the interview bank, ideal answers, majors, tags, and AI-generated drafts used by Invera.',
    filters: language === 'vi' ? 'Bộ lọc câu hỏi' : 'Question filters',
    filterDescription:
      language === 'vi'
        ? 'Lọc theo major, role, level hoặc tìm nhanh theo từ khóa trong câu hỏi, tag và đáp án mẫu.'
        : 'Filter by major, role, level, or search by keywords in the question, tags, and ideal answer.',
    allMajors: language === 'vi' ? 'Tất cả major' : 'All majors',
    allRoles: language === 'vi' ? 'Tất cả vị trí' : 'All roles',
    allLevels: language === 'vi' ? 'Tất cả level' : 'All levels',
    majorLabel: language === 'vi' ? 'Major' : 'Major',
    roleLabel: language === 'vi' ? 'Role' : 'Role',
    levelLabel: language === 'vi' ? 'Level' : 'Level',
    searchLabel: language === 'vi' ? 'Tìm kiếm' : 'Search',
    searchPlaceholder:
      language === 'vi'
        ? 'Tìm theo keyword, category, tag hoặc ideal answer...'
        : 'Search by keyword, category, tag, or ideal answer...',
    apply: language === 'vi' ? 'Áp dụng' : 'Apply',
    newQuestion: language === 'vi' ? 'Thêm câu hỏi' : 'New question',
    aiGenerate: language === 'vi' ? 'AI tạo draft' : 'AI generate',
    edit: language === 'vi' ? 'Chỉnh sửa' : 'Edit',
    delete: language === 'vi' ? 'Xóa' : 'Delete',
    noMatch: language === 'vi' ? 'Không có câu hỏi nào khớp với bộ lọc hiện tại.' : 'No questions match the current filters.',
    emptyIdealAnswer:
      language === 'vi' ? 'Chưa có ideal answer cho câu hỏi này.' : 'No ideal answer is available for this question yet.',
    idealAnswer: language === 'vi' ? 'Ideal answer' : 'Ideal answer',
    tags: language === 'vi' ? 'Tags' : 'Tags',
    createDialogTitle: language === 'vi' ? 'Tạo câu hỏi mới' : 'Create question',
    editDialogTitle: language === 'vi' ? 'Chỉnh sửa câu hỏi' : 'Edit question',
    editorDescription:
      language === 'vi'
        ? 'Cập nhật major, role, level, độ khó, tag, nội dung câu hỏi và đáp án mẫu.'
        : 'Update the major, role, level, difficulty, tags, question text, and ideal answer.',
    generateDialogTitle: language === 'vi' ? 'AI tạo draft câu hỏi' : 'AI question draft',
    generateDialogDescription:
      language === 'vi'
        ? 'Chọn major, role, level và độ khó. AI sẽ tạo câu hỏi + ideal answer để bạn chỉnh lại trước khi lưu.'
        : 'Choose the major, role, level, and difficulty. AI will generate a question + ideal answer draft for review before saving.',
    promptLabel: language === 'vi' ? 'Prompt cho AI' : 'AI prompt',
    promptPlaceholder:
      language === 'vi'
        ? 'Ví dụ: Gen cho tôi câu hỏi về CORS trong FastAPI, tập trung vào cách cấu hình và lỗi phổ biến.'
        : 'For example: Generate a question about CORS in FastAPI, focusing on configuration and common mistakes.',
    promptHelp:
      language === 'vi'
        ? 'Có thể để trống. Nếu nhập, AI sẽ dùng prompt này cùng major, role, level, difficulty và category để sinh draft.'
        : 'Optional. If provided, AI will use this prompt together with the major, role, level, difficulty, and category.',
    textLabel: language === 'vi' ? 'Câu hỏi' : 'Question',
    categoryLabel: language === 'vi' ? 'Category' : 'Category',
    difficultyLabel: language === 'vi' ? 'Mức độ' : 'Difficulty',
    idealAnswerLabel: language === 'vi' ? 'Đáp án mẫu' : 'Ideal answer',
    tagInputLabel: language === 'vi' ? 'Tags (cách nhau bằng dấu phẩy)' : 'Tags (comma-separated)',
    tagInputPlaceholder:
      language === 'vi'
        ? 'ví dụ: valuation, excel, financial-modeling'
        : 'for example: valuation, excel, financial-modeling',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    save: language === 'vi' ? 'Lưu câu hỏi' : 'Save question',
    generate: language === 'vi' ? 'Tạo draft' : 'Generate draft',
    loadErrorTitle: language === 'vi' ? 'Không thể tải ngân hàng câu hỏi' : 'Unable to load the question bank',
    saveErrorTitle: language === 'vi' ? 'Không thể lưu câu hỏi' : 'Unable to save question',
    generateErrorTitle: language === 'vi' ? 'AI chưa tạo được draft' : 'AI could not generate a draft',
    deleteErrorTitle: language === 'vi' ? 'Không thể xóa câu hỏi' : 'Unable to delete question',
    savedTitle: language === 'vi' ? 'Đã lưu câu hỏi' : 'Question saved',
    savedDescription: language === 'vi' ? 'Question bank đã được cập nhật.' : 'The question bank has been updated.',
    generatedTitle: language === 'vi' ? 'Đã tạo draft bằng AI' : 'AI draft ready',
    generatedDescription:
      language === 'vi'
        ? 'Bạn có thể chỉnh lại nội dung trước khi lưu vào question bank.'
        : 'You can refine the draft before saving it into the question bank.',
    duplicateTitle: language === 'vi' ? 'Câu hỏi tương tự đã tồn tại' : 'A matching question already exists',
    duplicateDescription:
      language === 'vi'
        ? 'Hệ thống tìm thấy câu hỏi phù hợp trong question bank nên không tạo draft mới.'
        : 'The bank already contains a matching question, so no new draft was generated.',
    openExisting: language === 'vi' ? 'Mở câu hiện có' : 'Open existing question',
    deletedTitle: language === 'vi' ? 'Đã xóa câu hỏi' : 'Question deleted',
    deletedDescription: (id: number) =>
      language === 'vi' ? `Question #${id} đã được gỡ khỏi ngân hàng.` : `Question #${id} was removed from the bank.`,
    retry: language === 'vi' ? 'Vui lòng thử lại.' : 'Please try again.',
  };

  const majorOptions = useMemo(
    () => [
      { value: '', label: copy.allMajors },
      { value: 'technology', label: language === 'vi' ? 'Technology' : 'Technology' },
      { value: 'finance', label: language === 'vi' ? 'Finance' : 'Finance' },
      { value: 'business', label: language === 'vi' ? 'Business' : 'Business' },
    ],
    [copy.allMajors, language],
  );

  const levelOptions = useMemo(
    () => [
      { value: '', label: copy.allLevels },
      ...LEVEL_OPTIONS.map((value) => ({ value, label: prettyLabel(value) })),
    ],
    [copy.allLevels],
  );

  const roleOptions = useMemo(() => {
    if (!major || !(major in ROLE_OPTIONS)) {
      const allRoles = Object.values(ROLE_OPTIONS)
        .flat()
        .map((option) => ({
          value: option.value,
          label: language === 'vi' ? option.vi : option.en,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return [{ value: '', label: copy.allRoles }, ...allRoles];
    }
    return [
      { value: '', label: copy.allRoles },
      ...ROLE_OPTIONS[major as MajorKey].map((option) => ({
        value: option.value,
        label: language === 'vi' ? option.vi : option.en,
      })),
    ];
  }, [copy.allRoles, language, major]);

  const editorRoleOptions = useMemo(() => {
    const selectedMajor = questionForm.major as MajorKey;
    return ROLE_OPTIONS[selectedMajor] || [];
  }, [questionForm.major]);

  const generatorRoleOptions = useMemo(() => {
    const selectedMajor = generatorForm.major as MajorKey;
    return ROLE_OPTIONS[selectedMajor] || [];
  }, [generatorForm.major]);

  const loadQuestions = async (
    nextMajor = major,
    nextRole = role,
    nextLevel = level,
  ) => {
    setLoading(true);
    try {
      const rows = await adminApi.getQuestions({
        major: nextMajor || undefined,
        role: nextRole || undefined,
        level: nextLevel || undefined,
      });
      setQuestions(rows);
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
    loadQuestions('', '', '');
  }, []);

  const filteredQuestions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return questions;
    return questions.filter((question) => {
      const haystack = [
        question.major || '',
        question.text,
        question.category,
        question.difficulty,
        question.role,
        question.level,
        ...(question.tags || []),
        question.ideal_answer || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [questions, search]);

  const handleFilterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadQuestions(major, role, level);
  };

  const handleDelete = async (questionId: number) => {
    try {
      await adminApi.deleteQuestion(questionId);
      setQuestions((current) => current.filter((question) => question.id !== questionId));
      toast({
        title: copy.deletedTitle,
        description: copy.deletedDescription(questionId),
      });
    } catch (err) {
      toast({
        title: copy.deleteErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    }
  };

  const resetEditor = () => {
    const nextForm = emptyQuestionForm();
    setEditingQuestionId(null);
    setQuestionForm(nextForm);
    setQuestionTagsInput('');
  };

  const openCreateDialog = () => {
    resetEditor();
    setEditorOpen(true);
  };

  const openEditDialog = (question: AdminQuestionOut) => {
    setEditingQuestionId(question.id);
    const nextForm: AdminQuestionUpsert = {
      major: question.major || 'technology',
      role: question.role,
      level: question.level,
      text: question.text,
      category: question.category,
      difficulty: question.difficulty,
      ideal_answer: question.ideal_answer || '',
      tags: question.tags || [],
    };
    setQuestionForm(nextForm);
    setQuestionTagsInput(tagInputValue(nextForm.tags));
    setEditorOpen(true);
  };

  const handleSaveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload: AdminQuestionUpsert = {
      ...questionForm,
      tags: parseTagInput(questionTagsInput),
    };

    try {
      const row = editingQuestionId
        ? await adminApi.updateQuestion(editingQuestionId, payload)
        : await adminApi.createQuestion(payload);

      setQuestions((current) => {
        const existingIndex = current.findIndex((question) => question.id === row.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = row;
          return next.sort((a, b) => a.id - b.id);
        }
        return [row, ...current].sort((a, b) => a.id - b.id);
      });

      setEditorOpen(false);
      resetEditor();
      toast({
        title: copy.savedTitle,
        description: copy.savedDescription,
      });
    } catch (err) {
      toast({
        title: copy.saveErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    setDuplicateDraft(null);
    try {
      const draft = await adminApi.generateQuestion({
        ...generatorForm,
        prompt: generatorForm.prompt?.trim() || undefined,
        tags: parseTagInput(generatorTagsInput),
        output_language: language,
      });
      if (draft.duplicate_found) {
        setDuplicateDraft({
          id: draft.existing_question_id || 0,
          major: draft.major,
          role: draft.role,
          level: draft.level,
          text: draft.text,
          category: draft.category,
          difficulty: draft.difficulty,
          ideal_answer: draft.ideal_answer,
          tags: draft.tags,
        });
        toast({
          title: copy.duplicateTitle,
          description: copy.duplicateDescription,
        });
        return;
      }
      setGeneratorOpen(false);
      setEditingQuestionId(null);
      setQuestionForm(draft);
      setQuestionTagsInput(tagInputValue(draft.tags));
      setEditorOpen(true);
      toast({
        title: copy.generatedTitle,
        description: copy.generatedDescription,
      });
    } catch (err) {
      toast({
        title: copy.generateErrorTitle,
        description: err instanceof Error ? err.message : copy.retry,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
          <p className="text-muted-foreground mt-2">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDuplicateDraft(null);
              setGeneratorForm(emptyGenerateForm());
              setGeneratorTagsInput('');
              setGeneratorOpen(true);
            }}
          >
            <Wand2 className="h-4 w-4" />
            {copy.aiGenerate}
          </Button>
          <Button type="button" variant="accent" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            {copy.newQuestion}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{copy.filters}</CardTitle>
          <CardDescription>{copy.filterDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilterSubmit} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="question-major">{copy.majorLabel}</Label>
              <select
                id="question-major"
                value={major}
                onChange={(event) => {
                  const nextMajor = event.target.value;
                  setMajor(nextMajor);
                  if (nextMajor && role) {
                    const allowedRoles = ROLE_OPTIONS[nextMajor as MajorKey] || [];
                    if (!allowedRoles.some((option) => option.value === role)) {
                      setRole('');
                    }
                  }
                }}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {majorOptions.map((option) => (
                  <option key={option.value || 'all-major'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-role">{copy.roleLabel}</Label>
              <select
                id="question-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {roleOptions.map((option) => (
                  <option key={option.value || 'all-role'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-level">{copy.levelLabel}</Label>
              <select
                id="question-level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {levelOptions.map((option) => (
                  <option key={option.value || 'all-level'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-search">{copy.searchLabel}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="question-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button type="submit" variant="accent" disabled={loading} className="w-full lg:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenText className="h-4 w-4" />}
                {copy.apply}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {copy.noMatch}
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => (
            <Card key={question.id} className="border-border/50 shadow-sm">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge className="border-transparent bg-accent/10 font-semibold uppercase tracking-wide text-accent">
                        #{question.id}
                      </Badge>
                      <Badge className={getMajorBadgeClass(question.major || 'technology')}>
                        {prettyLabel(question.major || 'technology')}
                      </Badge>
                      <Badge variant="outline">{prettyLabel(question.role)}</Badge>
                      <Badge className={getLevelBadgeClass(question.level)}>
                        {prettyLabel(question.level)}
                      </Badge>
                      <Badge variant="outline">{question.category}</Badge>
                      <Badge className={getDifficultyBadgeClass(question.difficulty)}>
                        {prettyLabel(question.difficulty)}
                      </Badge>
                      {(question.tags || []).map((tag) => (
                        <Badge key={`${question.id}-${tag}`} className="border-slate-200 bg-slate-50 text-slate-700">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="text-lg leading-relaxed">{question.text}</CardTitle>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(question)}>
                      <Sparkles className="h-4 w-4" />
                      {copy.edit}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(question.id)}>
                      <Trash2 className="h-4 w-4" />
                      {copy.delete}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <div className="mb-2 text-sm font-semibold text-foreground">{copy.idealAnswer}</div>
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {question.ideal_answer || copy.emptyIdealAnswer}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingQuestionId ? copy.editDialogTitle : copy.createDialogTitle}</DialogTitle>
            <DialogDescription>{copy.editorDescription}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuestion} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="editor-major">{copy.majorLabel}</Label>
                <select
                  id="editor-major"
                  value={questionForm.major}
                  onChange={(event) => {
                    const nextMajor = event.target.value as MajorKey;
                    const nextRole = ROLE_OPTIONS[nextMajor]?.[0]?.value || '';
                    setQuestionForm((current) => ({
                      ...current,
                      major: nextMajor,
                      role: ROLE_OPTIONS[nextMajor].some((option) => option.value === current.role)
                        ? current.role
                        : nextRole,
                    }));
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {majorOptions.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editor-role">{copy.roleLabel}</Label>
                <select
                  id="editor-role"
                  value={questionForm.role}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, role: event.target.value }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {editorRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === 'vi' ? option.vi : option.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editor-level">{copy.levelLabel}</Label>
                <select
                  id="editor-level"
                  value={questionForm.level}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, level: event.target.value }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {prettyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editor-difficulty">{copy.difficultyLabel}</Label>
                <select
                  id="editor-difficulty"
                  value={questionForm.difficulty}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, difficulty: event.target.value }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {prettyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-2">
                <Label htmlFor="editor-category">{copy.categoryLabel}</Label>
                <Input
                  id="editor-category"
                  value={questionForm.category}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editor-tags">{copy.tagInputLabel}</Label>
                <Input
                  id="editor-tags"
                  value={questionTagsInput}
                  onChange={(event) => setQuestionTagsInput(event.target.value)}
                  placeholder={copy.tagInputPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editor-question">{copy.textLabel}</Label>
              <Textarea
                id="editor-question"
                value={questionForm.text}
                onChange={(event) => setQuestionForm((current) => ({ ...current, text: event.target.value }))}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editor-ideal-answer">{copy.idealAnswerLabel}</Label>
              <Textarea
                id="editor-ideal-answer"
                value={questionForm.ideal_answer}
                onChange={(event) => setQuestionForm((current) => ({ ...current, ideal_answer: event.target.value }))}
                className="min-h-[220px]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                {copy.cancel}
              </Button>
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenText className="h-4 w-4" />}
                {copy.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={generatorOpen}
        onOpenChange={(open) => {
          setGeneratorOpen(open);
          if (!open) {
            setDuplicateDraft(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copy.generateDialogTitle}</DialogTitle>
            <DialogDescription>{copy.generateDialogDescription}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerateDraft} className="space-y-5">
            {duplicateDraft ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <div className="font-semibold text-amber-800">{copy.duplicateTitle}</div>
                <p className="mt-1 text-amber-700">{copy.duplicateDescription}</p>
                <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge className={getMajorBadgeClass(duplicateDraft.major || 'technology')}>
                      {prettyLabel(duplicateDraft.major || 'technology')}
                    </Badge>
                    <Badge variant="outline">{prettyLabel(duplicateDraft.role)}</Badge>
                    <Badge className={getLevelBadgeClass(duplicateDraft.level)}>{prettyLabel(duplicateDraft.level)}</Badge>
                    <Badge className={getDifficultyBadgeClass(duplicateDraft.difficulty)}>
                      {prettyLabel(duplicateDraft.difficulty)}
                    </Badge>
                  </div>
                  <div className="mt-3 font-medium text-slate-900">{duplicateDraft.text}</div>
                  <div className="mt-2 text-slate-600">{duplicateDraft.category}</div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setGeneratorOpen(false);
                        openEditDialog(duplicateDraft);
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      {copy.openExisting}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="generator-major">{copy.majorLabel}</Label>
                <select
                  id="generator-major"
                  value={generatorForm.major}
                  onChange={(event) => {
                    const nextMajor = event.target.value as MajorKey;
                    setGeneratorForm((current) => ({
                      ...current,
                      major: nextMajor,
                      role: ROLE_OPTIONS[nextMajor][0].value,
                    }));
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {majorOptions.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="generator-role">{copy.roleLabel}</Label>
                <select
                  id="generator-role"
                  value={generatorForm.role}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, role: event.target.value }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {generatorRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === 'vi' ? option.vi : option.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="generator-level">{copy.levelLabel}</Label>
                <select
                  id="generator-level"
                  value={generatorForm.level}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, level: event.target.value }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {prettyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="generator-difficulty">{copy.difficultyLabel}</Label>
                <select
                  id="generator-difficulty"
                  value={generatorForm.difficulty}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, difficulty: event.target.value }))}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {prettyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-2">
                <Label htmlFor="generator-category">{copy.categoryLabel}</Label>
                <Input
                  id="generator-category"
                  value={generatorForm.category || ''}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="generator-tags">{copy.tagInputLabel}</Label>
                <Input
                  id="generator-tags"
                  value={generatorTagsInput}
                  onChange={(event) => setGeneratorTagsInput(event.target.value)}
                  placeholder={copy.tagInputPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="generator-prompt">{copy.promptLabel}</Label>
              <Textarea
                id="generator-prompt"
                value={generatorForm.prompt || ''}
                onChange={(event) =>
                  setGeneratorForm((current) => ({ ...current, prompt: event.target.value }))
                }
                placeholder={copy.promptPlaceholder}
                className="min-h-[110px]"
              />
              <p className="text-xs text-muted-foreground">{copy.promptHelp}</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGeneratorOpen(false)}>
                {copy.cancel}
              </Button>
              <Button type="submit" variant="accent" disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {copy.generate}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
