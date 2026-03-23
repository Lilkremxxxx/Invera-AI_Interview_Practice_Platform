import { Star, Quote } from 'lucide-react';
import { useLanguage, translations } from '@/contexts/LanguageContext';

const testimonialAvatars = ['NM', 'TM', 'LH'];
const testimonialRatings = [5, 5, 5];

// Bilingual testimonial names/roles (not in translations dict to keep it lean)
const testimonialsData = [
  {
    nameVi: 'Nguyễn Thị Mai', roleVi: 'Kỹ sư phần mềm tại Google',
    nameEn: 'Mai Nguyen', roleEn: 'Software Engineer at Google',
    contentKey: 0,
  },
  {
    nameVi: 'Trần Văn Minh', roleVi: 'Quản lý sản phẩm tại Meta',
    nameEn: 'Minh Tran', roleEn: 'Product Manager at Meta',
    contentKey: 1,
  },
  {
    nameVi: 'Lê Thị Hương', roleVi: 'Nhà khoa học dữ liệu tại Amazon',
    nameEn: 'Huong Le', roleEn: 'Data Scientist at Amazon',
    contentKey: 2,
  },
];

const testimonialContents = [
  {
    vi: 'Nền tảng này đã giúp tôi có được công việc mơ ước! Phản hồi từ AI cực kỳ chi tiết và giúp tôi cải thiện kỹ năng giao tiếp đáng kể.',
    en: 'This platform helped me land my dream job! The AI feedback is incredibly detailed and helped me improve my communication skills significantly.',
  },
  {
    vi: 'Phản hồi có cấu trúc và theo dõi tiến độ giúp tôi có động lực trong suốt quá trình tìm việc. Rất khuyến khích cho bất kỳ ai chuẩn bị cho phỏng vấn công nghệ.',
    en: 'The structured feedback and progress tracking kept me motivated throughout my job search. Highly recommend for anyone preparing for tech interviews.',
  },
  {
    vi: 'Các câu hỏi theo vị trí rất chính xác. Tôi cảm thấy tự tin hơn nhiều khi tham gia các cuộc phỏng vấn thực tế sau khi luyện tập ở đây.',
    en: 'The role-specific questions were spot on. I felt much more confident going into real interviews after practicing here.',
  },
];

export const TestimonialsSection = () => {
  const { language, t } = useLanguage();

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            {t('testimonials', 'badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary dark:text-foreground mb-4">
            {t('testimonials', 'title')}
          </h2>
          <p className="text-lg text-primary/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {t('testimonials', 'desc')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonialsData.map((item, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-8 border border-border hover:shadow-lg transition-all duration-300 relative"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-accent/10" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonialRatings[index])].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                ))}
              </div>
              
              <p className="text-primary dark:text-foreground mb-6 leading-relaxed relative z-10">
                "{testimonialContents[index][language]}"
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-semibold">
                  {testimonialAvatars[index]}
                </div>
                <div>
                  <h4 className="font-semibold text-primary dark:text-foreground">
                    {language === 'vi' ? item.nameVi : item.nameEn}
                  </h4>
                  <p className="text-sm text-primary/60 dark:text-muted-foreground">
                    {language === 'vi' ? item.roleVi : item.roleEn}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
