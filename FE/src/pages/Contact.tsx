import { CompanyPageShell } from '@/components/layout/CompanyPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const Contact = () => {
  const { language } = useLanguage();

  const copy = {
    eyebrow: language === 'vi' ? 'Liên hệ' : 'Contact',
    title: language === 'vi' ? 'Trao đổi với nhóm Invera' : 'Talk to the Invera team',
    description:
      language === 'vi'
        ? 'Trang này là company/demo page để người dùng không còn rơi vào 404 từ footer. Bạn có thể thay các thông tin dưới đây bằng kênh hỗ trợ chính thức sau.'
        : 'This page exists so company links no longer drop visitors into a 404. You can replace the details below with your official support channels later.',
    cards: [
      {
        title: language === 'vi' ? 'Product & support' : 'Product and support',
        body: 'support@invera.pp.ua',
      },
      {
        title: language === 'vi' ? 'Partnerships' : 'Partnerships',
        body: 'partnerships@invera.pp.ua',
      },
      {
        title: language === 'vi' ? 'Response window' : 'Response window',
        body: language === 'vi' ? 'Trong vòng 1-2 ngày làm việc' : 'Within 1-2 business days',
      },
    ],
  };

  return (
    <CompanyPageShell eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <div className="grid gap-5 md:grid-cols-3">
        {copy.cards.map((item) => (
          <div key={item.title} className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm uppercase tracking-[0.16em] text-teal-600">{item.title}</div>
            <div className="mt-4 text-lg font-semibold text-slate-950">{item.body}</div>
          </div>
        ))}
      </div>
    </CompanyPageShell>
  );
};

export default Contact;
