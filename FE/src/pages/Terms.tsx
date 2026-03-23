import { CompanyPageShell } from '@/components/layout/CompanyPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const Terms = () => {
  const { language } = useLanguage();

  const copy = {
    eyebrow: language === 'vi' ? 'Terms' : 'Terms',
    title: language === 'vi' ? 'Điều khoản sử dụng cho bản demo public của Invera' : 'Terms for the public Invera demo',
    description:
      language === 'vi'
        ? 'Trang này thay route 404 cũ và đưa ra một bản terms demo đủ rõ cho người dùng landing page hiểu cách dùng sản phẩm.'
        : 'This page replaces the old 404 route and gives visitors a clear demo version of the terms that govern the product experience.',
    sections: [
      {
        heading: language === 'vi' ? 'Accounts' : 'Accounts',
        body:
          language === 'vi'
            ? 'Người dùng chịu trách nhiệm với email, mật khẩu, mã xác thực và mọi hoạt động phát sinh từ tài khoản của mình.'
            : 'Users are responsible for their email, password, verification codes, and all activity performed under their account.',
      },
      {
        heading: language === 'vi' ? 'Usage' : 'Usage',
        body:
          language === 'vi'
            ? 'Không sử dụng sản phẩm để spam, lạm dụng tài nguyên, hoặc tải lên nội dung trái phép trong avatar, resume hay phần trả lời.'
            : 'Do not use the product for spam, abusive traffic, or prohibited content in avatars, resumes, or answer submissions.',
      },
      {
        heading: language === 'vi' ? 'Plans and billing' : 'Plans and billing',
        body:
          language === 'vi'
            ? 'Free trial, Basic và Pro có thể khác nhau về quota và quyền truy cập. Các trạng thái thanh toán demo hiện đang chạy trên môi trường sandbox.'
            : 'Free trial, Basic, and Pro may differ in quota and access. Payment flows in the current public demo run against sandbox infrastructure.',
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

export default Terms;
