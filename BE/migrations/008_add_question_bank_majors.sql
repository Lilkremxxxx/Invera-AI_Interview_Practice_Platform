ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS major VARCHAR(50);

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE questions
SET major = 'technology'
WHERE major IS NULL OR major = '';

ALTER TABLE questions
    ALTER COLUMN major SET DEFAULT 'technology';

CREATE INDEX IF NOT EXISTS idx_questions_major ON questions(major);
CREATE INDEX IF NOT EXISTS idx_questions_major_role_level ON questions(major, role, level);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'financial_analyst',
    'intern',
    'Ba báo cáo tài chính chính là gì và chúng liên kết với nhau như thế nào?',
    'Financial Statements',
    'easy',
    'Ba báo cáo tài chính chính gồm: bảng cân đối kế toán, báo cáo kết quả kinh doanh và báo cáo lưu chuyển tiền tệ. Lợi nhuận ròng từ báo cáo kết quả kinh doanh chảy vào lợi nhuận giữ lại trên bảng cân đối kế toán. Tiền cuối kỳ trên báo cáo lưu chuyển tiền tệ khớp với chỉ tiêu tiền và tương đương tiền trên bảng cân đối kế toán. Ba báo cáo cần được đọc cùng nhau để hiểu hiệu quả hoạt động, vị thế tài chính và khả năng tạo tiền của doanh nghiệp.',
    ARRAY['financial-statements', 'linkage', 'core-finance']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'financial_analyst' AND level = 'intern' AND text = 'Ba báo cáo tài chính chính là gì và chúng liên kết với nhau như thế nào?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'financial_analyst',
    'junior',
    'Bạn sẽ tiếp cận một bài định giá doanh nghiệp bằng DCF như thế nào?',
    'Valuation',
    'medium',
    'Một bài DCF thường bắt đầu bằng việc dự phóng doanh thu, biên lợi nhuận, thuế, CAPEX, khấu hao và biến động vốn lưu động để tính free cash flow. Sau đó chiết khấu dòng tiền bằng WACC, rồi tính terminal value bằng perpetual growth hoặc exit multiple. Cuối cùng cộng present value của forecast period và terminal value để ra enterprise value, điều chỉnh tiền mặt và nợ để ra equity value. Cần nhấn mạnh giả định đầu vào và độ nhạy của kết quả.',
    ARRAY['dcf', 'valuation', 'forecasting']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'financial_analyst' AND level = 'junior' AND text = 'Bạn sẽ tiếp cận một bài định giá doanh nghiệp bằng DCF như thế nào?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'accountant',
    'fresher',
    'Accrual accounting khác gì cash accounting? Trong thực tế doanh nghiệp thường dùng cách nào?',
    'Accounting Basics',
    'easy',
    'Cash accounting ghi nhận khi tiền thực sự vào hoặc ra. Accrual accounting ghi nhận doanh thu và chi phí khi nghĩa vụ kinh tế phát sinh, dù tiền chưa thu hoặc chưa chi. Doanh nghiệp quy mô vừa và lớn thường dùng accrual accounting vì phản ánh đúng hiệu quả hoạt động trong kỳ và phù hợp chuẩn mực kế toán. Câu trả lời tốt nên nêu ví dụ như bán hàng công nợ hoặc chi phí phải trả cuối kỳ.',
    ARRAY['accrual', 'cash-accounting', 'accounting-basics']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'accountant' AND level = 'fresher' AND text = 'Accrual accounting khác gì cash accounting? Trong thực tế doanh nghiệp thường dùng cách nào?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'accountant',
    'junior',
    'Hãy mô tả quy trình month-end closing và các rủi ro thường gặp nếu quy trình này làm không chặt.',
    'Closing Process',
    'medium',
    'Month-end closing thường gồm: khóa sổ giao dịch, đối chiếu ngân hàng, rà soát công nợ, ghi nhận accruals và prepayments, hạch toán khấu hao, kiểm tra tài khoản sai lệch rồi lập báo cáo. Nếu quy trình làm lỏng, doanh nghiệp có thể ghi nhận sai doanh thu hoặc chi phí, bỏ sót nghĩa vụ phải trả, báo cáo ra quyết định sai và tăng rủi ro audit findings. Ứng viên tốt nên nói thêm về checklist, maker-checker và timeline closing.',
    ARRAY['month-end', 'closing', 'reconciliation']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'accountant' AND level = 'junior' AND text = 'Hãy mô tả quy trình month-end closing và các rủi ro thường gặp nếu quy trình này làm không chặt.'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'auditor',
    'intern',
    'Materiality trong kiểm toán là gì và tại sao khái niệm này quan trọng?',
    'Audit Fundamentals',
    'easy',
    'Materiality là ngưỡng trọng yếu dùng để đánh giá xem một sai sót có đủ lớn để ảnh hưởng đến quyết định của người sử dụng báo cáo tài chính hay không. Kiểm toán viên dùng materiality để lập kế hoạch phạm vi kiểm tra, chọn mẫu và đánh giá sai sót tổng hợp. Khái niệm này quan trọng vì kiểm toán không thể kiểm tra 100% giao dịch, nên cần tập trung vào các khoản mục có ảnh hưởng trọng yếu.',
    ARRAY['audit', 'materiality', 'risk']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'auditor' AND level = 'intern' AND text = 'Materiality trong kiểm toán là gì và tại sao khái niệm này quan trọng?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'auditor',
    'junior',
    'Bạn sẽ thiết kế test of controls và substantive procedures khác nhau như thế nào cho khoản mục doanh thu?',
    'Audit Procedures',
    'hard',
    'Test of controls kiểm tra xem quy trình kiểm soát nội bộ quanh doanh thu có được thiết kế và vận hành hiệu quả hay không, ví dụ phê duyệt đơn hàng, tách nhiệm vụ, và đối chiếu giao hàng. Substantive procedures đi thẳng vào bằng chứng số liệu như vouching hóa đơn, cut-off testing, analytical review và xác nhận công nợ. Với doanh thu, cần nhấn mạnh rủi ro ghi nhận sớm và cut-off cuối kỳ. Câu trả lời tốt sẽ giải thích vì sao hai nhóm thủ tục bổ sung cho nhau.',
    ARRAY['audit-procedures', 'revenue', 'controls']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'auditor' AND level = 'junior' AND text = 'Bạn sẽ thiết kế test of controls và substantive procedures khác nhau như thế nào cho khoản mục doanh thu?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'investment_banking_analyst',
    'intern',
    'Các phương pháp định giá doanh nghiệp phổ biến trong investment banking là gì?',
    'Investment Banking',
    'medium',
    'Các phương pháp phổ biến gồm trading comparables, precedent transactions và discounted cash flow. Trading comps so sánh doanh nghiệp với các công ty niêm yết tương đồng. Precedent transactions nhìn vào các thương vụ M&A đã xảy ra. DCF dựa trên khả năng tạo dòng tiền tương lai. Ứng viên tốt nên nêu thêm vì sao thường dùng nhiều phương pháp để cross-check thay vì chỉ dựa vào một kết quả.',
    ARRAY['ib', 'valuation', 'comps']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'investment_banking_analyst' AND level = 'intern' AND text = 'Các phương pháp định giá doanh nghiệp phổ biến trong investment banking là gì?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'finance',
    'investment_banking_analyst',
    'junior',
    'Một pitch book thường gồm những phần nào và analyst đóng vai trò gì trong quá trình chuẩn bị?',
    'Pitch Book',
    'medium',
    'Một pitch book thường có market overview, company profile, investment thesis, valuation pages, transaction comparables, process timeline và đề xuất hành động. Analyst thường chịu trách nhiệm thu thập dữ liệu, cập nhật model, làm comps, chuẩn hóa slide và bảo đảm tính nhất quán giữa số liệu và narrative. Câu trả lời tốt nên nhấn mạnh độ chính xác, tốc độ và việc kiểm tra chéo số liệu trước khi gửi cho associate hoặc VP.',
    ARRAY['pitch-book', 'investment-banking', 'presentation']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'finance' AND role = 'investment_banking_analyst' AND level = 'junior' AND text = 'Một pitch book thường gồm những phần nào và analyst đóng vai trò gì trong quá trình chuẩn bị?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'business_analyst',
    'intern',
    'Business analyst thường làm gì trong một dự án chuyển đổi quy trình nội bộ?',
    'Business Analysis',
    'easy',
    'Business analyst giúp làm rõ vấn đề, thu thập yêu cầu từ stakeholders, phân tích quy trình hiện tại, xác định pain points và đề xuất giải pháp khả thi. Trong dự án chuyển đổi quy trình, BA thường viết requirement, vẽ flow, hỗ trợ ưu tiên và làm cầu nối giữa business với team kỹ thuật. Câu trả lời tốt nên nêu được cả vai trò lắng nghe stakeholder và kiểm soát scope.',
    ARRAY['requirements', 'process', 'stakeholders']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'business_analyst' AND level = 'intern' AND text = 'Business analyst thường làm gì trong một dự án chuyển đổi quy trình nội bộ?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'business_analyst',
    'junior',
    'Bạn sẽ thu thập và ưu tiên requirements như thế nào khi nhiều stakeholder yêu cầu những thứ khác nhau?',
    'Requirements Management',
    'medium',
    'Trước tiên cần làm rõ business objective, scope và constraint của dự án. Sau đó thu thập yêu cầu qua interview, workshop hoặc document review rồi nhóm lại theo theme. Để ưu tiên, có thể dùng MoSCoW, impact vs effort hoặc business value vs risk. Khi stakeholder xung đột, BA cần đưa cuộc thảo luận quay về mục tiêu kinh doanh, dữ liệu và trade-off rõ ràng thay vì chỉ ghi nhận tất cả. Deliverable có thể là backlog hoặc BRD đã được sign-off.',
    ARRAY['prioritization', 'requirements', 'moscow']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'business_analyst' AND level = 'junior' AND text = 'Bạn sẽ thu thập và ưu tiên requirements như thế nào khi nhiều stakeholder yêu cầu những thứ khác nhau?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'operations_analyst',
    'fresher',
    'Bạn sẽ xác định bottleneck trong một quy trình vận hành như thế nào?',
    'Operations',
    'easy',
    'Một cách tiếp cận tốt là vẽ lại quy trình end-to-end, xác định đầu vào/đầu ra của từng bước, rồi đo thời gian xử lý, khối lượng công việc và điểm nghẽn lặp lại. Bottleneck thường là bước có cycle time cao, backlog tăng hoặc phụ thuộc vào ít người/phần mềm nhất định. Ứng viên tốt nên nói thêm về cách xác minh bằng dữ liệu thực thay vì suy đoán, ví dụ dùng SLA, throughput hoặc defect rate.',
    ARRAY['operations', 'bottleneck', 'process-improvement']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'operations_analyst' AND level = 'fresher' AND text = 'Bạn sẽ xác định bottleneck trong một quy trình vận hành như thế nào?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'operations_analyst',
    'junior',
    'Nếu chi phí vận hành tăng nhưng SLA không cải thiện, bạn sẽ phân tích vấn đề này ra sao?',
    'Operations Analytics',
    'medium',
    'Cần bắt đầu bằng việc tách chi phí theo driver chính như headcount, overtime, vendor, logistics hoặc tooling rồi so sánh với throughput, SLA attainment và quality metrics. Nếu chi phí tăng mà SLA không cải thiện, có thể do capacity allocation sai, quy trình dư thừa, demand forecast kém hoặc productivity giảm. Phân tích nên kết hợp trend, cohort theo team/region và root-cause interviews để tránh kết luận chỉ từ dashboard tổng.',
    ARRAY['sla', 'cost-analysis', 'ops-analytics']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'operations_analyst' AND level = 'junior' AND text = 'Nếu chi phí vận hành tăng nhưng SLA không cải thiện, bạn sẽ phân tích vấn đề này ra sao?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'sales_executive',
    'intern',
    'Một sales pipeline cơ bản thường có những stage nào và tại sao việc cập nhật pipeline lại quan trọng?',
    'Sales Fundamentals',
    'easy',
    'Một pipeline cơ bản thường có lead, qualified lead, meeting/discovery, proposal, negotiation và closed won/lost. Việc cập nhật pipeline quan trọng vì nó giúp team dự báo doanh thu, nhận ra deal đang kẹt ở đâu và biết cần ưu tiên follow-up nào. Câu trả lời tốt nên nói rõ mỗi stage phải có tiêu chí chuyển trạng thái, không chỉ là tên gọi hình thức.',
    ARRAY['sales', 'pipeline', 'forecast']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'sales_executive' AND level = 'intern' AND text = 'Một sales pipeline cơ bản thường có những stage nào và tại sao việc cập nhật pipeline lại quan trọng?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'sales_executive',
    'junior',
    'Khi khách hàng nói sản phẩm quá đắt, bạn sẽ xử lý objection này như thế nào?',
    'Sales Execution',
    'medium',
    'Không nên phản xạ giảm giá ngay. Trước tiên cần hiểu “đắt” là so với gì: ngân sách, lựa chọn thay thế hay perceived value. Sau đó quay lại pain point, business outcome và ROI mà sản phẩm mang lại. Nếu cần, có thể đề xuất scope phù hợp hơn, gói nhỏ hơn hoặc timeline triển khai khác. Câu trả lời tốt nên thể hiện kỹ năng khám phá nhu cầu trước rồi mới xử lý objection.',
    ARRAY['objection-handling', 'sales', 'roi']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'sales_executive' AND level = 'junior' AND text = 'Khi khách hàng nói sản phẩm quá đắt, bạn sẽ xử lý objection này như thế nào?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'marketing_executive',
    'intern',
    'CAC và ROAS là gì? Hai chỉ số này giúp đánh giá chiến dịch marketing như thế nào?',
    'Marketing Metrics',
    'easy',
    'CAC là customer acquisition cost, tức chi phí để có được một khách hàng mới. ROAS là return on ad spend, tức doanh thu thu về trên mỗi đồng chi cho quảng cáo. CAC giúp nhìn hiệu quả chi phí ở cấp khách hàng, còn ROAS giúp nhìn hiệu quả doanh thu trực tiếp của media spend. Câu trả lời tốt nên nói thêm rằng cần nhìn cả quality của khách hàng và retention chứ không chỉ mỗi ROAS ngắn hạn.',
    ARRAY['marketing', 'cac', 'roas']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'marketing_executive' AND level = 'intern' AND text = 'CAC và ROAS là gì? Hai chỉ số này giúp đánh giá chiến dịch marketing như thế nào?'
);

INSERT INTO questions (major, role, level, text, category, difficulty, ideal_answer, tags)
SELECT
    'business',
    'marketing_executive',
    'junior',
    'Bạn sẽ đánh giá hiệu quả của một campaign đa kênh như thế nào khi conversion xảy ra muộn hoặc đi qua nhiều touchpoint?',
    'Campaign Analysis',
    'hard',
    'Cần xác định objective và chọn bộ metrics theo từng tầng funnel: reach, CTR, lead quality, conversion rate, revenue hoặc pipeline. Với multi-touch journeys, nên nhìn attribution đa điểm hoặc ít nhất so sánh theo cohort và assisted conversions thay vì last-click duy nhất. Khi conversion trễ, cần kéo dài observation window và kết hợp leading indicators như qualified leads hoặc demo bookings. Câu trả lời tốt sẽ nhấn mạnh trade-off giữa độ đơn giản của mô hình đo lường và độ chính xác.',
    ARRAY['attribution', 'multi-channel', 'campaign-analysis']
WHERE NOT EXISTS (
    SELECT 1 FROM questions WHERE major = 'business' AND role = 'marketing_executive' AND level = 'junior' AND text = 'Bạn sẽ đánh giá hiệu quả của một campaign đa kênh như thế nào khi conversion xảy ra muộn hoặc đi qua nhiều touchpoint?'
);
