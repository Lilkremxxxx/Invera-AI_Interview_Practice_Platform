import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CheckCircle2, Clock3, Sparkles, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type DemoRole = 'frontend' | 'backend' | 'product';
type DemoRange = '7d' | '30d';

const trendData: Record<DemoRole, Record<DemoRange, Array<{ label: string; score: number; readiness: number }>>> = {
  frontend: {
    '7d': [
      { label: 'Mon', score: 66, readiness: 51 },
      { label: 'Tue', score: 70, readiness: 55 },
      { label: 'Wed', score: 72, readiness: 58 },
      { label: 'Thu', score: 75, readiness: 61 },
      { label: 'Fri', score: 78, readiness: 66 },
      { label: 'Sat', score: 80, readiness: 69 },
      { label: 'Sun', score: 83, readiness: 73 },
    ],
    '30d': [
      { label: 'W1', score: 62, readiness: 48 },
      { label: 'W2', score: 69, readiness: 54 },
      { label: 'W3', score: 76, readiness: 63 },
      { label: 'W4', score: 84, readiness: 72 },
    ],
  },
  backend: {
    '7d': [
      { label: 'Mon', score: 61, readiness: 49 },
      { label: 'Tue', score: 64, readiness: 52 },
      { label: 'Wed', score: 68, readiness: 56 },
      { label: 'Thu', score: 71, readiness: 60 },
      { label: 'Fri', score: 74, readiness: 64 },
      { label: 'Sat', score: 77, readiness: 66 },
      { label: 'Sun', score: 79, readiness: 69 },
    ],
    '30d': [
      { label: 'W1', score: 58, readiness: 45 },
      { label: 'W2', score: 65, readiness: 51 },
      { label: 'W3', score: 72, readiness: 59 },
      { label: 'W4', score: 79, readiness: 68 },
    ],
  },
  product: {
    '7d': [
      { label: 'Mon', score: 69, readiness: 57 },
      { label: 'Tue', score: 72, readiness: 61 },
      { label: 'Wed', score: 75, readiness: 64 },
      { label: 'Thu', score: 78, readiness: 68 },
      { label: 'Fri', score: 80, readiness: 71 },
      { label: 'Sat', score: 82, readiness: 74 },
      { label: 'Sun', score: 85, readiness: 78 },
    ],
    '30d': [
      { label: 'W1', score: 65, readiness: 54 },
      { label: 'W2', score: 71, readiness: 60 },
      { label: 'W3', score: 78, readiness: 68 },
      { label: 'W4', score: 86, readiness: 77 },
    ],
  },
};

const strengthData: Record<DemoRole, Array<{ skill: string; score: number }>> = {
  frontend: [
    { skill: 'React patterns', score: 88 },
    { skill: 'Accessibility', score: 82 },
    { skill: 'System design', score: 71 },
    { skill: 'Behavioral stories', score: 76 },
  ],
  backend: [
    { skill: 'API design', score: 86 },
    { skill: 'SQL reasoning', score: 79 },
    { skill: 'Distributed systems', score: 73 },
    { skill: 'Behavioral stories', score: 70 },
  ],
  product: [
    { skill: 'Product sense', score: 90 },
    { skill: 'Metrics thinking', score: 84 },
    { skill: 'Execution stories', score: 77 },
    { skill: 'Stakeholder alignment', score: 81 },
  ],
};

const sessionsData: Record<DemoRole, Array<{ title: string; score: number; status: 'strong' | 'mixed' }>> = {
  frontend: [
    { title: 'React hooks drill', score: 86, status: 'strong' },
    { title: 'Accessibility round', score: 79, status: 'mixed' },
    { title: 'System design warm-up', score: 74, status: 'mixed' },
  ],
  backend: [
    { title: 'REST API deep dive', score: 83, status: 'strong' },
    { title: 'Postgres troubleshooting', score: 78, status: 'mixed' },
    { title: 'Caching architecture', score: 75, status: 'mixed' },
  ],
  product: [
    { title: 'North-star metrics', score: 88, status: 'strong' },
    { title: 'Prioritization review', score: 81, status: 'strong' },
    { title: 'Execution breakdown', score: 76, status: 'mixed' },
  ],
};

export const DashboardDemoSection = () => {
  const { language } = useLanguage();
  const [role, setRole] = useState<DemoRole>('frontend');
  const [range, setRange] = useState<DemoRange>('30d');

  const copy = {
    badge: language === 'vi' ? 'Demo sản phẩm' : 'Product demo',
    title: language === 'vi' ? 'Một dashboard đủ rõ để bán trải nghiệm ngay trên landing page' : 'A dashboard demo that sells the experience before sign-up',
    body:
      language === 'vi'
        ? 'Thay vì đẩy thẳng người dùng vào app thật, section này mô phỏng cách Invera theo dõi độ sẵn sàng phỏng vấn, kỹ năng mạnh/yếu và các buổi luyện gần nhất.'
        : 'Instead of dropping visitors straight into the live app, this section previews how Invera tracks interview readiness, strengths, weak spots, and recent practice.',
    hint: language === 'vi' ? 'Chạm vào role và time range để xem dữ liệu demo đổi theo ngữ cảnh.' : 'Switch role and time range to see the demo data react in context.',
    kpiScore: language === 'vi' ? 'Interview score' : 'Interview score',
    kpiReadiness: language === 'vi' ? 'Readiness' : 'Readiness',
    kpiSessions: language === 'vi' ? 'Sessions this cycle' : 'Sessions this cycle',
    kpiFocus: language === 'vi' ? 'Current focus' : 'Current focus',
    chartTitle: language === 'vi' ? 'Progress over time' : 'Progress over time',
    chartBody: language === 'vi' ? 'Điểm trả lời và mức độ sẵn sàng tăng dần qua các phiên luyện.' : 'Answer quality and readiness trend upward as practice sessions accumulate.',
    strengthsTitle: language === 'vi' ? 'Skill breakdown' : 'Skill breakdown',
    strengthsBody: language === 'vi' ? 'Các chỉ số giả lập này cho thấy người dùng đang mạnh ở đâu và cần bồi tiếp phần nào.' : 'These mock metrics show where the user is already strong and where more repetition is needed.',
    sessionsTitle: language === 'vi' ? 'Recent mock sessions' : 'Recent mock sessions',
    sessionsBody: language === 'vi' ? 'Một danh sách rõ ràng hơn nhiều so với việc ném người dùng sang dashboard thật ngay từ footer.' : 'A clearer preview than sending someone directly into the real dashboard from the footer.',
    sidebarSummary: language === 'vi' ? 'Demo workspace' : 'Demo workspace',
    sidebarAnalytics: language === 'vi' ? 'Readiness analytics' : 'Readiness analytics',
    sidebarPractice: language === 'vi' ? 'Practice log' : 'Practice log',
    sidebarPlan: language === 'vi' ? 'Upgrade path' : 'Upgrade path',
    focusValue:
      role === 'frontend'
        ? language === 'vi'
          ? 'System design + storytelling'
          : 'System design + storytelling'
        : role === 'backend'
          ? language === 'vi'
            ? 'Caching + API trade-offs'
            : 'Caching + API trade-offs'
          : language === 'vi'
            ? 'Product sense + prioritization'
            : 'Product sense + prioritization',
    range7d: language === 'vi' ? '7 ngày' : '7 days',
    range30d: language === 'vi' ? '30 ngày' : '30 days',
    strong: language === 'vi' ? 'Strong' : 'Strong',
    mixed: language === 'vi' ? 'Needs work' : 'Needs work',
  };

  const roleLabels = {
    frontend: language === 'vi' ? 'Frontend' : 'Frontend',
    backend: language === 'vi' ? 'Backend' : 'Backend',
    product: language === 'vi' ? 'Product' : 'Product',
  } as const;

  const trend = trendData[role][range];
  const strengths = strengthData[role];
  const sessions = sessionsData[role];

  const latestPoint = trend[trend.length - 1];
  const sessionCount = range === '7d' ? 4 : 12;
  const strongestSkill = useMemo(
    () => [...strengths].sort((a, b) => b.score - a.score)[0],
    [strengths],
  );

  return (
    <section id="dashboard-demo" className="scroll-mt-24 bg-white py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-3xl">
          <span className="mb-5 inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
            {copy.badge}
          </span>
          <h2 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{copy.body}</p>
          <p className="mt-3 text-sm font-medium text-slate-500">{copy.hint}</p>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 shadow-[0_32px_80px_rgba(15,23,42,0.16)]">
          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-white/10 bg-slate-950/90 p-6 lg:border-b-0 lg:border-r">
              <div className="mb-8">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300/80">Invera</div>
                <div className="mt-3 text-2xl font-semibold text-white">{copy.sidebarSummary}</div>
              </div>
              <div className="space-y-3">
                {[copy.sidebarAnalytics, copy.sidebarPractice, copy.sidebarPlan].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl px-4 py-3 text-sm transition-all ${index === 0 ? 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20' : 'bg-white/5 text-white/75'}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-teal-400/15 p-3 text-teal-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">Live focus</div>
                    <div className="mt-1 text-sm font-semibold text-white">{copy.focusValue}</div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="bg-slate-50 p-5 md:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(roleLabels) as DemoRole[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        role === item
                          ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {roleLabels[item]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 self-start rounded-full bg-white p-1 ring-1 ring-slate-200">
                  {([
                    ['7d', copy.range7d],
                    ['30d', copy.range30d],
                  ] as Array<[DemoRange, string]>).map(([item, label]) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRange(item)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        range === item ? 'bg-teal-500 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: copy.kpiScore, value: `${latestPoint.score}%`, icon: Target },
                      { label: copy.kpiReadiness, value: `${latestPoint.readiness}%`, icon: CheckCircle2 },
                      { label: copy.kpiSessions, value: `${sessionCount}`, icon: Clock3 },
                      { label: copy.kpiFocus, value: strongestSkill.skill, icon: BarChart3 },
                    ].map((item) => (
                      <div key={item.label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-500">{item.label}</div>
                          <item.icon className="h-4 w-4 text-teal-500" />
                        </div>
                        <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-5">
                      <div className="text-lg font-semibold text-slate-950">{copy.chartTitle}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{copy.chartBody}</div>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend}>
                          <defs>
                            <linearGradient id="demoScoreGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="4 4" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} width={28} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#0f172a"
                            strokeWidth={3}
                            fill="url(#demoScoreGradient)"
                            activeDot={{ r: 6, fill: '#14b8a6' }}
                          />
                          <Area type="monotone" dataKey="readiness" stroke="#14b8a6" strokeWidth={2.2} fill="transparent" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="text-lg font-semibold text-slate-950">{copy.strengthsTitle}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{copy.strengthsBody}</div>
                    <div className="mt-5 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={strengths} layout="vertical" barCategoryGap={16}>
                          <XAxis type="number" hide domain={[0, 100]} />
                          <YAxis
                            type="category"
                            dataKey="skill"
                            axisLine={false}
                            tickLine={false}
                            width={110}
                            tick={{ fill: '#475569', fontSize: 12 }}
                          />
                          <Tooltip />
                          <Bar dataKey="score" fill="#14b8a6" radius={[0, 10, 10, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
                    <div className="text-lg font-semibold">{copy.sessionsTitle}</div>
                    <div className="mt-1 text-sm leading-6 text-white/60">{copy.sessionsBody}</div>
                    <div className="mt-5 space-y-3">
                      {sessions.map((session) => (
                        <div key={session.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium">{session.title}</div>
                              <div className="mt-1 text-sm text-white/60">{session.score}% score</div>
                            </div>
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                session.status === 'strong' ? 'bg-teal-400/20 text-teal-200' : 'bg-amber-300/15 text-amber-100'
                              }`}
                            >
                              {session.status === 'strong' ? copy.strong : copy.mixed}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
