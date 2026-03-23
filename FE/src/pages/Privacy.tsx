import { CompanyPageShell } from '@/components/layout/CompanyPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const Privacy = () => {
  const { language } = useLanguage();

  const copy = {
    eyebrow: language === 'vi' ? 'Privacy' : 'Privacy',
    title: language === 'vi' ? 'Nguyên tắc xử lý dữ liệu tại Invera' : 'How Invera handles your data',
    description:
      language === 'vi'
        ? 'Đây là trang privacy demo để thay 404 và giải thích rõ dữ liệu nào được lưu, dùng để làm gì, và user kiểm soát được gì.'
        : 'This is a demo privacy page that replaces the old 404 and explains what data is stored, why it is used, and what controls users have.',
    sections: [
      {
        heading: language === 'vi' ? 'What we collect' : 'What we collect',
        body:
          language === 'vi'
            ? 'Tài khoản, session practice, câu trả lời, feedback, và một số file profile như avatar hoặc resume nếu người dùng chủ động tải lên.'
            : 'Account data, practice sessions, answers, feedback, and optional profile files such as an avatar or resume when the user uploads them.',
      },
      {
        heading: language === 'vi' ? 'Why we use it' : 'Why we use it',
        body:
          language === 'vi'
            ? 'Để xác thực tài khoản, chấm điểm câu trả lời, hiển thị tiến độ, và hỗ trợ quản trị hệ thống.'
            : 'To authenticate accounts, score answers, show progress, and support core product/admin operations.',
      },
      {
        heading: language === 'vi' ? 'Your controls' : 'Your controls',
        body:
          language === 'vi'
            ? 'Người dùng có thể chỉnh ngôn ngữ, profile, avatar, resume và các cài đặt cá nhân ngay trong ứng dụng.'
            : 'Users can update language, profile data, avatar, resume, and personal preferences directly inside the app.',
      },
    ],
  };

  return (
    <CompanyPageShell eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <div className="grid gap-5">
        {copy.sections.map((section) => (
          <div key={section.heading} className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold text-slate-950">{section.heading}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{section.body}</p>
          </div>
        ))}
      </div>
    </CompanyPageShell>
  );
};

export default Privacy;
