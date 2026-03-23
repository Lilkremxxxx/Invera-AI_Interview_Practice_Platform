import { CompanyPageShell } from '@/components/layout/CompanyPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const About = () => {
  const { language } = useLanguage();

  const copy = {
    eyebrow: language === 'vi' ? 'Công ty' : 'Company',
    title: language === 'vi' ? 'Chúng tôi xây Invera để biến luyện phỏng vấn thành một hệ thống rõ ràng hơn' : 'We built Invera to make interview practice feel measurable, clear, and repeatable',
    description:
      language === 'vi'
        ? 'Invera tập trung vào sinh viên năm cuối, fresher và người đi làm giai đoạn đầu sự nghiệp tại Việt Nam. Chúng tôi muốn thay cảm giác luyện phỏng vấn mơ hồ bằng một workflow có cấu trúc, có phản hồi, và có tiến độ nhìn thấy được.'
        : 'Invera focuses on final-year students, fresh graduates, and early-career candidates in Vietnam. The product replaces vague interview prep with a structured workflow, measurable feedback, and visible progress.',
    principlesTitle: language === 'vi' ? 'What we optimize for' : 'What we optimize for',
    principles: [
      {
        title: language === 'vi' ? 'Role-specific practice' : 'Role-specific practice',
        body:
          language === 'vi'
            ? 'Mỗi buổi luyện cần bám vào vai trò, cấp độ và loại câu hỏi mà người dùng thực sự sắp gặp.'
            : 'Practice should reflect the role, level, and interview style the candidate is actually preparing for.',
      },
      {
        title: language === 'vi' ? 'Structured feedback' : 'Structured feedback',
        body:
          language === 'vi'
            ? 'Người dùng cần biết họ mạnh ở đâu, yếu ở đâu và nên cải thiện gì trước tiên.'
            : 'Candidates need to know what is strong, what is weak, and what to improve first.',
      },
      {
        title: language === 'vi' ? 'Affordable access' : 'Affordable access',
        body:
          language === 'vi'
            ? 'Giá trị của Invera chỉ hợp lý khi người dùng Việt Nam có thể vào thử nhanh và nâng cấp dần khi cần.'
            : 'The product only works if Vietnamese candidates can try it quickly and upgrade only when it becomes useful.',
      },
    ],
    todayTitle: language === 'vi' ? 'What exists today' : 'What exists today',
    todayItems:
      language === 'vi'
        ? ['Email/password auth + email verification', 'Free-trial session limit for non-admin users', 'DeepSeek-backed scoring and structured feedback', 'Admin invite flow, question bank, and payment sandbox']
        : ['Email/password auth plus verification', 'Free-trial session limits for non-admin users', 'DeepSeek-backed scoring and structured feedback', 'Admin invite flow, question bank, and payment sandbox'],
  };

  return (
    <CompanyPageShell eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-950">{copy.principlesTitle}</h2>
          <div className="mt-6 grid gap-4">
            {copy.principles.map((item) => (
              <div key={item.title} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="text-lg font-semibold text-slate-950">{item.title}</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-slate-950 p-8 text-white shadow-sm">
          <h2 className="text-2xl font-semibold">{copy.todayTitle}</h2>
          <div className="mt-6 space-y-4">
            {copy.todayItems.map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/85">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </CompanyPageShell>
  );
};

export default About;
