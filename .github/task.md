# Invera MVP — Task List

> Phạm vi: **MVP** — chứng minh được vòng lặp cốt lõi: đăng ký → đăng nhập → tạo session → trả lời câu hỏi → xem kết quả.
> Mọi tính năng ngoài danh sách này đều **OUT OF SCOPE** cho MVP.

---

## MVP User Journey

```
Đăng ký / Đăng nhập (real JWT)
  → Dashboard (xem lịch sử sessions)
    → Tạo session mới (chọn role + level)
      → Phòng phỏng vấn (câu hỏi tĩnh + trả lời text)
        → Xem kết quả (điểm + feedback đơn giản)
```

---

## Phase 0 — BE Foundation (Unblock startup)

> BE hiện không khởi động được do import thiếu file.

- [ ] **0.1** Tạo `BE/app/schemas/user.py` — Pydantic models `UserCreate`, `UserOut`
- [ ] **0.2** Tạo `BE/app/services/storage/local.py` — `LocalStorageService` (lưu file lên disk)
- [ ] **0.3** Tạo `BE/requirements.txt` — liệt kê đủ deps (fastapi, uvicorn, asyncpg, python-jose, argon2-cffi, python-dotenv, pydantic)
- [ ] **0.4** Thêm `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` vào `.env`

---

## Phase 1 — BE: Sessions & Questions API

> Thêm domain mới. `meetings` API giữ nguyên, không xóa.

### 1.1 Database

- [ ] **1.1.1** Tạo migration SQL tạo bảng `questions` (id, role, level, text, category, difficulty, ideal_answer)
- [ ] **1.1.2** Tạo migration SQL tạo bảng `sessions` (id, user_id FK, role, level, mode, status ENUM[IN_PROGRESS/COMPLETED], created_at, completed_at)
- [ ] **1.1.3** Tạo migration SQL tạo bảng `answers` (id, session_id FK, question_id FK, answer_text, score 0-100, feedback, submitted_at)
- [ ] **1.1.4** Seed dữ liệu `questions`: ≥5 câu hỏi cho mỗi combination [frontend/backend/fullstack] × [intern/junior/mid]

### 1.2 Schemas (Pydantic)

- [ ] **1.2.1** `BE/app/schemas/session.py` — `SessionCreate`, `SessionOut`, `SessionDetail`
- [ ] **1.2.2** `BE/app/schemas/question.py` — `QuestionOut`
- [ ] **1.2.3** `BE/app/schemas/answer.py` — `AnswerSubmit`, `AnswerOut`

### 1.3 Endpoints

- [ ] **1.3.1** `POST /sessions` — tạo session mới (role, level, mode), trả về session id + danh sách questions
- [ ] **1.3.2** `GET /sessions` — list sessions của user hiện tại (role, level, status, created_at, score trung bình)
- [ ] **1.3.3** `GET /sessions/{id}` — chi tiết session + danh sách câu hỏi + answers đã nộp
- [ ] **1.3.4** `POST /sessions/{id}/answers` — nộp câu trả lời cho 1 câu hỏi, trả về score + feedback
- [ ] **1.3.5** `PUT /sessions/{id}/complete` — đánh dấu session hoàn thành, tính điểm tổng
- [ ] **1.3.6** `GET /questions` — query theo `?role=&level=` (dùng cho seed check, optional)

### 1.4 Scoring Logic (đơn giản, không cần AI)

- [ ] **1.4.1** Implement keyword-matching scorer: so sánh answer với `ideal_answer`, tính % từ khóa khớp → score 0-100
- [ ] **1.4.2** Generate feedback template theo score range: <40 "Cần cải thiện", 40-70 "Khá tốt", >70 "Tốt"

---

## Phase 2 — FE: Real Authentication

> Thay path-based mock bằng JWT thật.

- [ ] **2.1** Tạo `FE/src/lib/api.ts` — axios instance với base URL từ `VITE_API_URL`, interceptor tự attach `Authorization: Bearer <token>` từ localStorage, interceptor redirect về `/login` nếu 401
- [ ] **2.2** Cập nhật `FE/src/hooks/use-auth.ts` — đọc token từ `localStorage`, decode để lấy user info, expose `login(token)` / `logout()` / `user` / `isAuthenticated`
- [ ] **2.3** Cập nhật `FE/src/pages/Login.tsx` — gọi `POST /auth/login`, lưu token, redirect `/app`
- [ ] **2.4** Cập nhật `FE/src/pages/Signup.tsx` — gọi `POST /auth/register`, tự login sau khi register thành công, redirect `/app`
- [ ] **2.5** Cập nhật `FE/src/App.tsx` — thêm `<ProtectedRoute>` wrapper: nếu `!isAuthenticated` redirect về `/login`
- [ ] **2.6** Thêm `FE/.env` (hoặc `.env.local`) với `VITE_API_URL=http://localhost:8000`

---

## Phase 3 — FE: Wire Session Flow

- [ ] **3.1** Cập nhật `FE/src/pages/NewSession.tsx` — bước cuối gọi `POST /sessions`, redirect sang `/app/interview/:id`
- [ ] **3.2** Cập nhật `FE/src/pages/InterviewRoom.tsx` — load questions từ session data (GET /sessions/:id), gọi `POST /sessions/:id/answers` khi submit từng câu, gọi `PUT /sessions/:id/complete` khi hết câu, hiện kết quả thật
- [ ] **3.3** Cập nhật `FE/src/pages/Sessions.tsx` — gọi `GET /sessions` thay mock data
- [ ] **3.4** Cập nhật `FE/src/pages/SessionDetail.tsx` — gọi `GET /sessions/:id` thay mock data
- [ ] **3.5** Cập nhật `FE/src/pages/Dashboard.tsx` — tính stats từ `GET /sessions` (total, avg score, last session)

---

## Phase 4 — Integration & Polish

- [ ] **4.1** Xử lý loading states: skeleton/spinner khi đang fetch data
- [ ] **4.2** Xử lý error states: toast khi API lỗi (network error, 4xx, 5xx)
- [ ] **4.3** Xử lý token expired: tự logout + redirect `/login` khi nhận 401
- [ ] **4.4** Test toàn bộ happy path một lần: register → login → new session → answer → result → sessions list
- [ ] **4.5** Cập nhật CORS ở BE nếu cần (đảm bảo FE port 8080 được allow)

---

## OUT OF SCOPE (MVP)

Không làm trong MVP, để lại backlog:

| Tính năng | Lý do hoãn |
|-----------|------------|
| Voice / Video input | Cần speech-to-text infra |
| CV upload + parsing | Cần NLP pipeline |
| AI question generation | Cần LLM integration + cost |
| AI scoring (LLM-based) | Keyword scoring đủ cho MVP |
| Analytics / progress charts | Cần đủ data |
| Payment / subscription | Cần payment gateway |
| Social login (Google, GitHub) | Cần OAuth setup |
| PDF export | Feature của Pro tier |
| Mentor matching | Feature của Premium tier |
| Real-time feedback (streaming) | Cần WebSocket / SSE |
| Email verification | Nice-to-have, không block MVP |

---

## Definition of Done (MVP)

- [ ] User có thể **register** và **login** bằng email/password thật (JWT lưu localStorage)
- [ ] Route `/app/*` **redirect về /login** nếu chưa auth
- [ ] User có thể **tạo session** mới (chọn role + level)
- [ ] User có thể **trả lời câu hỏi** (text) và **nộp bài**
- [ ] User nhận được **điểm + feedback** sau khi nộp
- [ ] User có thể **xem lại lịch sử sessions** đã làm
- [ ] BE **khởi động không lỗi** (0 import error)
