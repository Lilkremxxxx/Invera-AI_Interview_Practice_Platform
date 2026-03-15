-- Migration: Create sessions, questions, answers tables
-- Run this against your PostgreSQL database

-- Questions table (static seed data)
CREATE TABLE IF NOT EXISTS questions (
    id          SERIAL PRIMARY KEY,
    role        VARCHAR(50)  NOT NULL,   -- frontend, backend, fullstack
    level       VARCHAR(20)  NOT NULL,   -- intern, junior, mid
    text        TEXT         NOT NULL,
    category    VARCHAR(50)  NOT NULL,
    difficulty  VARCHAR(10)  NOT NULL DEFAULT 'medium',
    ideal_answer TEXT        NOT NULL DEFAULT ''
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(50)  NOT NULL,
    level        VARCHAR(20)  NOT NULL,
    mode         VARCHAR(20)  NOT NULL DEFAULT 'text',
    status       VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_id  INTEGER      NOT NULL REFERENCES questions(id),
    answer_text  TEXT         NOT NULL DEFAULT '',
    score        INTEGER      NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    feedback     TEXT         NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_role_level ON questions(role, level);

-- ─── Seed Questions ───────────────────────────────────────────────────────────

-- FRONTEND × INTERN
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('frontend', 'intern', 'HTML, CSS và JavaScript khác nhau như thế nào? Hãy mô tả vai trò của từng công nghệ trong web development.', 'Kiến thức cơ bản', 'easy',
 'HTML cấu trúc nội dung trang web, CSS tạo kiểu dáng giao diện, JavaScript thêm logic và tính tương tác. HTML là bộ khung, CSS là lớp trang trí, JS là bộ não xử lý. Ba công nghệ này hoạt động cùng nhau để tạo ra trang web hoàn chỉnh.'),
('frontend', 'intern', 'Flexbox trong CSS là gì? Khi nào bạn sẽ dùng flexbox thay vì các phương pháp layout khác?', 'CSS', 'easy',
 'Flexbox là mô hình layout 1 chiều giúp căn chỉnh và phân bố các phần tử trong container. Dùng khi cần layout hàng ngang hoặc dọc, căn giữa phần tử, phân bố đều khoảng cách. So với float, flexbox đơn giản và mạnh mẽ hơn. Dùng justify-content, align-items để điều chỉnh vị trí.'),
('frontend', 'intern', 'Event listener trong JavaScript là gì? Cho ví dụ về cách bắt sự kiện click trên một button.', 'JavaScript', 'easy',
 'Event listener là hàm lắng nghe và xử lý sự kiện từ người dùng hoặc trình duyệt. Sử dụng addEventListener để đăng ký: button.addEventListener("click", function() { ... }). Cần remove listener khi không dùng để tránh memory leak. Có thể dùng arrow function, named function hoặc anonymous function.'),
('frontend', 'intern', 'Git là gì và tại sao nó quan trọng trong phát triển phần mềm?', 'Công cụ', 'easy',
 'Git là hệ thống quản lý phiên bản phân tán, theo dõi thay đổi code theo thời gian. Quan trọng vì cho phép nhiều lập trình viên cùng làm việc, rollback khi có lỗi, tạo branch để phát triển tính năng song song, merge code. Các lệnh cơ bản: git init, add, commit, push, pull, branch, merge.'),
('frontend', 'intern', 'Responsive design là gì? Làm thế nào để thiết kế website hiển thị tốt trên cả mobile và desktop?', 'CSS', 'easy',
 'Responsive design là thiết kế website tự động điều chỉnh layout theo kích thước màn hình. Dùng CSS media queries (@media), đơn vị tương đối (%, vw, rem), flexbox/grid, meta viewport tag. Mobile-first approach: thiết kế cho mobile trước rồi mở rộng cho desktop. Breakpoints phổ biến: 768px (tablet), 1024px (desktop).');

-- FRONTEND × JUNIOR
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('frontend', 'junior', 'Giải thích sự khác biệt giữa var, let và const trong JavaScript. Khi nào nên dùng loại nào?', 'JavaScript', 'medium',
 'var có function scope và hoisting, có thể redeclare. let có block scope, không hoisting, có thể reassign. const có block scope, không thể reassign (nhưng object/array vẫn mutable). Best practice: dùng const mặc định, let khi cần reassign, tránh var vì gây nhầm lẫn về scope. Trong modern JS, var ít được dùng.'),
('frontend', 'junior', 'Virtual DOM trong React là gì và tại sao nó giúp cải thiện hiệu năng?', 'React', 'medium',
 'Virtual DOM là bản copy in-memory của DOM thật. React so sánh Virtual DOM mới với cũ (diffing algorithm) rồi chỉ cập nhật phần thay đổi vào DOM thật (reconciliation). Điều này hiệu quả hơn vì thao tác DOM thật rất tốn kém. Kết quả là UI cập nhật nhanh, mượt mà dù có nhiều thay đổi.'),
('frontend', 'junior', 'useEffect hook trong React dùng để làm gì? Giải thích về cleanup function và dependency array.', 'React', 'medium',
 'useEffect chạy side effects sau khi render: fetch data, subscriptions, thay đổi DOM. Dependency array kiểm soát khi nào effect chạy: [] chỉ chạy 1 lần, [dep] chạy khi dep thay đổi, không có array thì chạy mỗi render. Cleanup function (return từ effect) dọn dẹp: clear timer, unsubscribe để tránh memory leak và race condition.'),
('frontend', 'junior', 'Bạn sẽ tối ưu hiệu năng của một React component như thế nào khi nó render quá nhiều lần?', 'Performance', 'medium',
 'Dùng React.memo để skip re-render khi props không thay đổi. useMemo cache giá trị tính toán nặng. useCallback cache function để tránh tạo lại mỗi render. Tránh anonymous function/object trong JSX. Lazy loading với React.lazy + Suspense. Code splitting. Kiểm tra bằng React DevTools Profiler trước khi optimize.'),
('frontend', 'junior', 'Giải thích về CORS và cách xử lý CORS error khi làm việc với API.', 'Web Concepts', 'medium',
 'CORS (Cross-Origin Resource Sharing) là cơ chế bảo mật trình duyệt ngăn request từ domain khác. Browser gửi preflight OPTIONS request trước. Giải quyết ở server bằng cách thêm header Access-Control-Allow-Origin. Không nên dùng wildcard * cho production. Trong development có thể dùng proxy (Vite proxy, Create React App proxy) để bypass.');

-- FRONTEND × MID
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('frontend', 'mid', 'Giải thích về micro-frontend architecture. Ưu điểm, nhược điểm và khi nào nên áp dụng?', 'Architecture', 'hard',
 'Micro-frontend chia frontend monolith thành các app độc lập, mỗi team sở hữu 1 phần UI. Ưu điểm: deploy độc lập, technology agnostic, team autonomy, scale tốt. Nhược điểm: phức tạp hơn, bundle size lớn, consistent UX khó duy trì, latency. Phù hợp cho enterprise app lớn nhiều team. Implement qua Module Federation (Webpack), single-spa, iframe.'),
('frontend', 'mid', 'Bạn sẽ thiết kế hệ thống state management cho ứng dụng e-commerce lớn như thế nào?', 'Architecture', 'hard',
 'Phân tích loại state: UI state (local, useState), server state (React Query/SWR), global app state (Redux Toolkit/Zustand). E-commerce cần: cart (global, persist localStorage), auth (global), product catalog (server state với cache), checkout flow (local/context). Tránh over-engineer: không cần Redux cho mọi thứ. Cân nhắc React Query cho server state, Zustand cho global UI state.'),
('frontend', 'mid', 'Web Vitals là gì? Giải thích LCP, FID, CLS và cách cải thiện từng chỉ số.', 'Performance', 'hard',
 'Core Web Vitals là metrics Google đo UX: LCP (Largest Contentful Paint) < 2.5s - tốc độ load nội dung chính: optimize images, server response, remove render-blocking resources. FID (First Input Delay) / INP < 200ms - phản hồi tương tác: giảm JavaScript execution. CLS (Cumulative Layout Shift) < 0.1 - ổn định layout: set size cho image/video, tránh inject content trên phần đang xem.'),
('frontend', 'mid', 'Giải thích về accessibility (a11y) trong web development. Các tiêu chuẩn WCAG và cách implement?', 'Accessibility', 'medium',
 'Accessibility đảm bảo website dùng được bởi người khuyết tật. WCAG 2.1 có 4 nguyên tắc: Perceivable (text alternative cho image, captions), Operable (keyboard navigable, skip links), Understandable (clear language, error messages), Robust (semantic HTML, ARIA). Implement: dùng semantic HTML5, ARIA roles khi cần, đủ color contrast (4.5:1), focus visible, screen reader testing.'),
('frontend', 'mid', 'So sánh Server Side Rendering (SSR), Static Site Generation (SSG) và Client Side Rendering (CSR). Khi nào dùng cái nào?', 'Architecture', 'hard',
 'CSR: render hoàn toàn ở browser, JS bundle lớn, SEO kém, phù hợp SPA/dashboard sau login. SSR: server render HTML cho mỗi request, SEO tốt, TTFB cao hơn, phù hợp trang có nội dung dynamic và cần SEO (Next.js). SSG: build HTML tĩnh, performance tốt nhất, CDN friendly, phù hợp blog/docs nội dung ít thay đổi. ISR kết hợp SSG + SSR. Chọn theo SEO requirement và update frequency.');

-- BACKEND × INTERN
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('backend', 'intern', 'API REST là gì? Giải thích các HTTP methods phổ biến và khi nào dùng mỗi method.', 'API', 'easy',
 'REST (Representational State Transfer) là kiến trúc thiết kế API sử dụng HTTP. GET: lấy dữ liệu (không thay đổi state). POST: tạo mới resource. PUT: cập nhật toàn bộ resource. PATCH: cập nhật một phần. DELETE: xóa resource. Responses dùng HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error. RESTful API là stateless, mỗi request độc lập.'),
('backend', 'intern', 'Database là gì? Sự khác biệt giữa SQL và NoSQL database?', 'Database', 'easy',
 'Database lưu trữ và quản lý dữ liệu. SQL (relational): dữ liệu có cấu trúc, bảng với rows/columns, quan hệ rõ ràng, ACID transactions, phù hợp dữ liệu có cấu trúc (MySQL, PostgreSQL). NoSQL: schema flexible, horizontal scaling dễ, phù hợp dữ liệu unstructured (MongoDB document, Redis key-value, Cassandra column). Chọn SQL khi cần consistency, NoSQL khi cần flexibility và scale lớn.'),
('backend', 'intern', 'Authentication và Authorization khác nhau như thế nào? Giải thích với ví dụ thực tế.', 'Security', 'easy',
 'Authentication (Xác thực): xác minh danh tính "bạn là ai?" - đăng nhập bằng username/password, Google OAuth. Authorization (Phân quyền): kiểm tra quyền truy cập "bạn được làm gì?" - user thường vs admin. Ví dụ: đăng nhập vào hệ thống (auth), rồi chỉ admin mới xóa được user (authz). JWT thường dùng cho cả hai: token chứa user info và roles.'),
('backend', 'intern', 'Middleware trong web framework là gì? Cho ví dụ về các loại middleware phổ biến.', 'Web Concepts', 'easy',
 'Middleware là function xử lý request trước khi đến handler chính. Chạy theo chuỗi (chain), có thể modify request/response hoặc dừng chain. Ví dụ phổ biến: Authentication (kiểm tra token), Logging (ghi log request), CORS (thêm headers), Rate limiting (giới hạn số request), Error handling (bắt lỗi). Trong FastAPI dùng @app.middleware hoặc Depends.'),
('backend', 'intern', 'Bạn sẽ debug một API endpoint trả về lỗi 500 Internal Server Error như thế nào?', 'Debugging', 'easy',
 'Quy trình debug: 1) Kiểm tra server logs để xem stack trace và error message. 2) Reproduce lỗi với cùng request parameters. 3) Kiểm tra database connection và queries. 4) Xem xét edge cases trong input data. 5) Thêm logging chi tiết tại điểm nghi ngờ. 6) Test từng phần nhỏ của code (unit test). 7) Kiểm tra environment variables và config. Dùng debugger hoặc print statements để trace execution flow.');

-- BACKEND × JUNIOR
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('backend', 'junior', 'Giải thích về indexing trong database. Khi nào nên tạo index và những trade-off là gì?', 'Database', 'medium',
 'Index tăng tốc độ query bằng cách tạo cấu trúc dữ liệu (B-tree) cho phép tìm kiếm nhanh O(log n) thay vì O(n). Nên tạo index trên: columns trong WHERE clause, foreign keys, columns trong ORDER BY/GROUP BY. Trade-off: tốn thêm storage, làm chậm INSERT/UPDATE/DELETE (phải update index). Không index mọi column. Dùng EXPLAIN ANALYZE để phân tích query performance.'),
('backend', 'junior', 'JWT (JSON Web Token) hoạt động như thế nào? Ưu và nhược điểm so với session-based auth?', 'Security', 'medium',
 'JWT gồm 3 phần: Header (algorithm), Payload (claims/data), Signature (verify tính toàn vẹn). Server tạo token, client lưu (localStorage/cookie) và gửi kèm mỗi request. Ưu điểm JWT: stateless (không cần store ở server), scalable, mobile-friendly. Nhược điểm: không thể revoke trước khi hết hạn (cần blacklist), payload lớn hơn session ID. Session-based an toàn hơn khi cần revoke ngay.'),
('backend', 'junior', 'N+1 query problem là gì? Làm thế nào để phát hiện và giải quyết?', 'Database', 'medium',
 'N+1 problem: fetch 1 query để lấy list N records, rồi thêm N queries để lấy related data cho từng record. Ví dụ: 1 query lấy 100 users, 100 queries lấy posts của từng user. Giải quyết: 1) Eager loading / JOIN queries. 2) ORM: select_related (Django), include (Laravel). 3) DataLoader pattern (batching). 4) Denormalization nếu cần. Phát hiện bằng query logging, APM tools.'),
('backend', 'junior', 'Caching là gì? Giải thích về các loại caching và khi nào nên dùng?', 'Performance', 'medium',
 'Caching lưu kết quả tính toán/query để tái sử dụng, giảm latency và load cho database. Các loại: In-memory cache (ứng dụng, nhanh nhất, mất khi restart), Redis/Memcached (distributed, persist option, nhiều instance). Cache strategies: Cache-aside (lazy), Write-through, Write-behind. Invalidation khó nhất: TTL, event-based invalidation. Cache khi: data ít thay đổi, tính toán nặng, đọc nhiều hơn viết.'),
('backend', 'junior', 'Mô tả cách bạn thiết kế schema database cho hệ thống blog đơn giản với users, posts và comments.', 'Database', 'medium',
 'users(id PK, email UNIQUE, password_hash, created_at). posts(id PK, user_id FK→users, title, content, status, created_at, updated_at). comments(id PK, post_id FK→posts, user_id FK→users, content, created_at). Index: posts.user_id, comments.post_id, comments.user_id. Cân nhắc soft delete (deleted_at) thay vì xóa thật. Tags dùng bảng trung gian post_tags(post_id, tag_id). Normalized để tránh data duplication.');

-- BACKEND × MID
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('backend', 'mid', 'Giải thích về SOLID principles. Áp dụng chúng trong thiết kế API như thế nào?', 'Architecture', 'hard',
 'SOLID: Single Responsibility (mỗi class/module 1 trách nhiệm, endpoint làm 1 việc), Open/Closed (mở cho extension, đóng cho modification - dùng interface), Liskov Substitution (subclass thay thế được parent), Interface Segregation (interface nhỏ, specific), Dependency Inversion (depend vào abstraction không phải implementation - dependency injection). Trong API: controller chỉ handle HTTP, service chứa business logic, repository handle database.'),
('backend', 'mid', 'Thiết kế rate limiting cho một public API. Những approaches khác nhau là gì và trade-off?', 'System Design', 'hard',
 'Rate limiting ngăn abuse và bảo vệ server. Algorithms: Token Bucket (burst-friendly, smooth), Leaky Bucket (consistent rate), Fixed Window Counter (đơn giản, boundary issue), Sliding Window Log (chính xác, memory nhiều), Sliding Window Counter (balance). Lưu state: Redis (distributed), in-memory (single instance). Giới hạn theo: IP, User ID, API key. Headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After. Response: 429 Too Many Requests.'),
('backend', 'mid', 'Database transactions và ACID properties là gì? Isolation levels ảnh hưởng như thế nào đến concurrency?', 'Database', 'hard',
 'ACID: Atomicity (all or nothing), Consistency (valid state trước và sau), Isolation (transactions độc lập), Durability (committed data persist). Isolation levels và vấn đề: Read Uncommitted (dirty read), Read Committed (non-repeatable read), Repeatable Read (phantom read), Serializable (an toàn nhất, chậm nhất). PostgreSQL default: Read Committed. Dùng transactions cho operations phải atomic: transfer tiền, order + inventory. Deadlock: 2 transactions đợi nhau, database detect và rollback 1 cái.'),
('backend', 'mid', 'Giải thích về async/await và event loop trong Python. Khi nào dùng async thay vì threading?', 'Python', 'medium',
 'Event loop chạy coroutines trong 1 thread, switch giữa chúng tại await points. async def tạo coroutine, await suspend để event loop xử lý coroutine khác. Dùng async cho I/O-bound tasks: HTTP requests, database queries, file I/O - 1 thread xử lý nhiều connections. Dùng threading/multiprocessing cho CPU-bound tasks. asyncpg, aiohttp, FastAPI built on asyncio. asyncio.gather() chạy parallel. Không block event loop với sync code nặng.'),
('backend', 'mid', 'Thiết kế hệ thống queue-based background job processing. Đảm bảo reliability và monitoring.', 'System Design', 'hard',
 'Components: Job producer (API tạo jobs), Message queue (Redis/RabbitMQ/SQS), Workers (consume và process), Dead letter queue (jobs failed). Reliability: at-least-once delivery, idempotency (job xử lý 2 lần không gây vấn đề), retry với exponential backoff, DLQ cho failed jobs. Monitoring: queue depth, processing rate, failure rate, job latency. Celery + Redis là stack phổ biến cho Python. Cân nhắc exactly-once với distributed locks.');

-- FULLSTACK × INTERN
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('fullstack', 'intern', 'Mô tả flow khi user nhấn "Login" trên website cho đến khi họ thấy dashboard. Điều gì xảy ra?', 'Kiến thức cơ bản', 'easy',
 'User nhập email/password, nhấn submit. FE gửi POST request đến /auth/login. BE validate credentials, tạo JWT token. FE nhận token, lưu localStorage. React Router redirect đến /dashboard. Dashboard component mount, gọi API lấy data với Authorization header. BE verify token, query database, trả về data. FE render data. Mỗi bước có thể có loading states và error handling.'),
('fullstack', 'intern', 'Local storage, session storage và cookies khác nhau như thế nào? Nên lưu gì ở đâu?', 'Web Concepts', 'easy',
 'localStorage: persist đến khi xóa thủ công, ~5MB, không gửi với request. sessionStorage: mất khi đóng tab, ~5MB. Cookies: gửi với mọi HTTP request, có expiry, có thể HttpOnly (không đọc được bởi JS - an toàn hơn). Nên dùng: JWT token → localStorage hoặc HttpOnly cookie (cookie an toàn hơn vì tránh XSS), user preferences → localStorage, session data → sessionStorage, auth cookies → HttpOnly Secure cookie.'),
('fullstack', 'intern', 'Sự khác biệt giữa synchronous và asynchronous code trong JavaScript là gì? Promise là gì?', 'JavaScript', 'easy',
 'Synchronous: code chạy tuần tự, mỗi dòng đợi dòng trước xong. Asynchronous: code không đợi, tiếp tục chạy trong khi chờ (network request, timer). Promise là object đại diện cho kết quả tương lai: pending, fulfilled, rejected. .then() xử lý khi thành công, .catch() xử lý lỗi. async/await là syntax sugar cho Promise, code trông sync nhưng thực ra async. Quan trọng cho web vì UI không bị freeze khi chờ API.'),
('fullstack', 'intern', 'Explain về package.json và node_modules trong dự án JavaScript. Tại sao cần gitignore node_modules?', 'Công cụ', 'easy',
 'package.json chứa metadata dự án: tên, version, dependencies (packages cần cho production), devDependencies (chỉ cần khi develop: test, build tools), scripts (npm run dev). npm install đọc package.json và tạo node_modules chứa tất cả packages. node_modules nên gitignore vì: rất lớn (hàng nghìn files), có thể generate lại từ package.json, OS-specific binaries. package-lock.json nên commit để đảm bảo consistent versions.'),
('fullstack', 'intern', 'Bạn nhận được task tạo form đăng ký với validation. Bạn sẽ approach như thế nào từ FE đến BE?', 'Hành vi', 'easy',
 'FE: Thiết kế form với các fields cần thiết (tên, email, password). Validation client-side (real-time feedback): email format, password length, required fields. Submit: gửi POST request đến BE API. BE: Validate lại dữ liệu (không tin client). Check email unique trong database. Hash password. Insert vào database. Return success hoặc error với message rõ ràng. FE: Hiển thị error message từ BE, redirect sau khi thành công. Quan trọng: validate cả 2 phía.');

-- FULLSTACK × JUNIOR
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('fullstack', 'junior', 'Giải thích về REST API design. Cách đặt tên endpoint đúng chuẩn RESTful?', 'API', 'medium',
 'RESTful naming: dùng nouns không phải verbs, số nhiều (GET /users không phải /getUsers). Nested resources: GET /users/:id/posts. HTTP methods thể hiện action: GET (read), POST (create), PUT/PATCH (update), DELETE (delete). Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error, 500 Server Error. Versioning: /api/v1/. Filter/sort qua query params: GET /users?role=admin&sort=created_at.'),
('fullstack', 'junior', 'Component lifecycle trong React và khi nào dùng useEffect với dependencies khác nhau?', 'React', 'medium',
 'Lifecycle: Mount (component xuất hiện) → Update (state/props thay đổi) → Unmount. useEffect map: componentDidMount → useEffect(() => {}, []), componentDidUpdate → useEffect(() => {}, [dep]), componentWillUnmount → return cleanup từ useEffect. Không có deps → chạy mỗi render (thường là bug). Custom hooks tái sử dụng logic: useFetch, useLocalStorage. Quy tắc hooks: chỉ gọi ở top level, không trong conditions/loops.'),
('fullstack', 'junior', 'Thiết kế database schema cho hệ thống quản lý task (todo app) hỗ trợ multiple users và projects.', 'Database', 'medium',
 'users(id UUID PK, email UNIQUE, password_hash, name, created_at). projects(id UUID PK, owner_id FK→users, name, description, created_at). project_members(project_id FK, user_id FK, role VARCHAR, PRIMARY KEY(project_id, user_id)). tasks(id UUID PK, project_id FK→projects, assignee_id FK→users, title, description, status ENUM[todo/in_progress/done], priority, due_date, created_at). task_comments(id UUID PK, task_id FK, user_id FK, content, created_at). Index quan trọng: tasks.project_id, tasks.assignee_id, tasks.status.'),
('fullstack', 'junior', 'WebSocket khác HTTP như thế nào? Khi nào dùng WebSocket thay vì REST API?', 'Web Concepts', 'medium',
 'HTTP: request-response, client luôn initiate, stateless, mỗi request tốn overhead. WebSocket: full-duplex, persistent connection, server có thể push data bất cứ lúc nào, ít overhead sau khi kết nối. Dùng WebSocket cho: chat real-time, live notifications, collaborative editing, live scores/prices, multiplayer game. REST phù hợp cho: CRUD operations, không cần real-time, caching quan trọng. Thay thế cho WebSocket đơn giản hơn: Server-Sent Events (SSE) cho server push 1 chiều.'),
('fullstack', 'junior', 'Giải thích về code review. Bạn tìm kiếm gì khi review code của người khác?', 'Hành vi', 'medium',
 'Code review mục tiêu: đảm bảo quality, share knowledge, catch bugs sớm. Tìm kiếm: Correctness (logic đúng không, edge cases handled?), Security (SQL injection, XSS, exposed secrets?), Performance (N+1 queries, unnecessary re-renders?), Readability (naming rõ ràng, function ngắn, comments khi cần?), Tests (có test không, test có ý nghĩa không?), Consistency (follow coding conventions?). Feedback constructive, cụ thể, giải thích lý do. Phân biệt blocking vs non-blocking comments.');

-- FULLSTACK × MID
INSERT INTO questions (role, level, text, category, difficulty, ideal_answer) VALUES
('fullstack', 'mid', 'Thiết kế authentication system cho một SaaS product. Bao gồm JWT, refresh tokens và session management.', 'Security', 'hard',
 'Access token (JWT, short-lived 15-60 phút) + Refresh token (long-lived, 7-30 ngày, stored in httpOnly cookie). Access token trong memory hoặc localStorage (tradeoff XSS vs CSRF). Rotation: mỗi lần dùng refresh token, issue cái mới (detect token theft). Revocation: blacklist refresh tokens trong Redis. Security: HTTPS only, rate limit login, account lockout sau nhiều lần fail. OAuth 2.0 / OIDC cho social login. Multi-device: lưu device info với refresh token, cho phép revoke per device.'),
('fullstack', 'mid', 'Bạn cần migrate một monolith thành microservices. Bạn sẽ approach như thế nào?', 'Architecture', 'hard',
 'Strangler Fig Pattern: không rewrite toàn bộ, từng bước extract services. Identify bounded contexts (DDD). Bắt đầu với service ít dependency nhất. API Gateway làm entry point, route đến monolith hoặc microservice. Shared database → database per service (khó nhất, cần data migration). Async communication với message queue cho operations không cần real-time. Service discovery, distributed tracing, centralized logging. Đừng migrate vì trend - microservices có operational overhead lớn.'),
('fullstack', 'mid', 'Giải thích về Docker và container orchestration. Lợi ích trong development và production?', 'DevOps', 'medium',
 'Docker đóng gói app + dependencies vào container, chạy nhất quán mọi môi trường. Dockerfile define image, docker-compose cho local dev nhiều services. Lợi ích dev: "works on my machine" không còn là vấn đề, onboarding nhanh, isolate environments. Production: Kubernetes orchestrate containers (scheduling, scaling, health checks, rolling deploy). Concepts: pods, services, deployments, ingress. Horizontal scaling: thêm replicas. Self-healing: restart crashed containers. Lưu ý: stateless app containers, stateful data ở persistent volumes.'),
('fullstack', 'mid', 'Bạn sẽ implement search functionality như thế nào cho một ứng dụng có hàng triệu records?', 'System Design', 'hard',
 'Full-text search: PostgreSQL full-text search (tsvector) cho đơn giản. Elasticsearch/OpenSearch cho production scale: inverted index, relevance scoring, faceted search, auto-complete. Architecture: database là source of truth, sync sang Elasticsearch qua CDC (Change Data Capture) hoặc event queue. Optimize UX: debounce input (300ms), paginate kết quả, highlight matched terms, filter/facets. Cache popular searches. Cân nhắc: typo tolerance, Vietnamese text analysis (cần custom tokenizer), stemming.'),
('fullstack', 'mid', 'Mô tả cách bạn đảm bảo code quality trong một team. Các practices và tools bạn đề xuất?', 'Hành vi', 'medium',
 'Code quality strategy: Automated (không cần nhớ): linter (ESLint/flake8) enforce style, formatter (Prettier/Black) auto-format, type checker (TypeScript/mypy), pre-commit hooks (husky). CI/CD: run tests + lint trên mỗi PR, block merge nếu fail. Code review: minimum 1 approval, checklist. Testing: unit tests cho business logic, integration tests cho API, e2e cho critical flows, coverage threshold. Documentation: API docs (Swagger), README up-to-date, ADRs cho architectural decisions. Định kỳ: tech debt backlog, refactoring sprints.');
