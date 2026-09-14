# BUSINESS REQUIREMENTS DOCUMENT (BRD)

## 1. Tổng quan dự án

### 1.1. Tên dự án

**DECLARE**

### 1.2. Product concept

**DECLARE** là nền tảng giúp người dùng biến một yêu cầu tự nhiên, có thể còn mơ hồ hoặc thiếu thông tin, thành một **yêu cầu đã được làm rõ và xác nhận đầy đủ trước khi giao cho AI**.

Nguyên tắc cốt lõi:

> **Don't let AI guess. Make it ask.**

Thay vì để AI tự suy diễn các thông tin còn thiếu, DECLARE sử dụng một **AI Interview Engine** để:

1. Phân tích yêu cầu ban đầu.
2. Xác định những thông tin còn thiếu hoặc chưa rõ.
3. Tạo bảng phỏng vấn động.
4. Đưa ra các lựa chọn phù hợp.
5. Cho phép người dùng tự nhập câu trả lời nếu các lựa chọn không phù hợp.
6. Kiểm tra lại câu trả lời.
7. Tiếp tục hỏi nếu thông tin vẫn chưa đủ rõ.
8. Chỉ kết thúc khi yêu cầu đạt trạng thái **CLEAR / READY**.
9. Sinh ra một **Verified Prompt / Structured Request** để người dùng đưa vào ChatGPT, Claude, Gemini, Cursor hoặc các AI agent khác.

DECLARE không nhằm mục tiêu đơn thuần là "viết prompt hay hơn".

Mục tiêu là **giảm khoảng cách giữa ý định thực sự của người dùng và những gì AI được phép hiểu, suy luận và thực hiện.**

---

# 2. Vấn đề cần giải quyết

## 2.1. Vấn đề của AI hiện tại

Người dùng thường đưa cho AI những yêu cầu dạng free-form thiếu nhiều thông tin quan trọng. AI có xu hướng tự lựa chọn công nghệ, business rules, phạm vi, database, architecture, và bổ sung requirements chưa được xác nhận.

Kết quả có thể trông chuyên nghiệp nhưng **không nhất thiết phản ánh đúng ý định của người dùng**.

---

# 3. Problem Statement

> Users communicate with AI using incomplete natural-language instructions, while AI often fills missing information through assumptions rather than obtaining explicit confirmation.

DECLARE giải quyết bằng cách:

> **Convert ambiguity into an explicit interview process before AI execution.**

---

# 4. Vision

**Human Intent → Interview → Confirmed Intent → AI**

(thay vì Human Intent → AI Guess → AI Output)

---

# 5. Product Positioning

DECLARE = **AI Intent Clarification & Declaration Layer** / **A pre-execution clarification layer for AI.**

Không định vị là: Prompt Generator / Marketplace / Optimizer đơn thuần / Chatbot mới / Writing Assistant.

Thông điệp: **AI should ask when it doesn't know.**

---

# 6. Core Principle

## 6.1. Không tự quyết định thay người dùng

Nhận diện thiếu → hỏi → options nếu có → free-form → kiểm tra câu trả lời.

## 6.2. Free-form luôn được phép

Options chỉ là gợi ý. Mỗi câu hỏi cần **Other / Tự nhập**.

---

# 7. Target Users

AI users (ChatGPT, Claude, Gemini, Cursor, agents…); professional users; non-technical users (trả lời câu hỏi thay vì học prompt engineering).

---

# 8. Product Scope

## Phase 1 — Web Playground (DECLARE product)

Prove the Declaration Engine: input → interview → CLEAR → **verified answer** (+ prompt/structured copy).

App độc lập trong `web/`, local **port 3500**. Chỉ giống Userward ở lớp BYOK gọi provider; output và vai trò sản phẩm khác (câu trả lời không bịa theo confirmed intent).

---

# 9. Core User Journey

```text
User Request → Analyze → Detect Missing → Interview Table → User Answers
→ Re-evaluate → Still Unclear? YES→Ask Again / NO→CLEAR
→ Generate Verified Prompt → Copy/Export → Downstream AI
```

---

# 10–18. Functional Requirements (summary)

| ID | Requirement |
| --- | --- |
| FR-01 | Free-form input request |
| FR-02 | Requirement analysis (objective, scope, constraints, … only as relevant) |
| FR-03 | Missing information detection (prioritize outcome-changing gaps) |
| FR-04 | Dynamic interview (question, context, options, custom, not decided) |
| FR-05 | User-defined answers re-analyzed, not only stored |
| FR-06 | Continuous clarification; no hard round limit |
| FR-07 | Explicit NOT_CLEAR / CLEAR states; verified generate when CLEAR |
| FR-08 | Verified prompt: no new requirements; reflect confirmed only |
| FR-09 | Structured request intermediate form |
| FR-10 | Copy / export (prompt + structured) |

Full narrative examples live in `examples/` and `docs/SPEC.md`.

---

# 19–20. AI providers & API keys

Provider-independent engine. MVP may use one provider; BYOK preferred; do not store keys on server when avoidable.

---

# 21–26. Interview engine, question principles, CLEAR, anti-assumption, output integrity

Normative detail: `docs/SPEC.md`, `docs/ANTI-ASSUMPTION.md`, `docs/PSEUDOCODE.md`.

---

# 27–29. UX (product)

Simple entry: “What do you want AI to do?” → Declare. Interview as cards/table. Progress is UX hint only.

Principles: no prompt-engineering skill required; ask not assume; user decides; free-form always; stop when clear.

---

# 30. Non-functional

Privacy; provider independence; extensibility (web, extension, IDE, MCP, API).

---

# 31. MVP Scope (product)

**Must:** web UI path, free-form, analysis, dynamic interview, options + custom, re-analysis, CLEAR, verified prompt, copy.  
**Should:** structured view, progress, edit answers, restart, provider select.  
**Not initially:** accounts, billing, marketplace, analytics, extension, IDE, MCP, mobile, long-term memory.

---

# 32. Roadmap (product)

Phase 1 Web → Phase 2 Browser extension → Phase 3 IDE → Phase 4 Agent/MCP layer.

---

# 33–36. Metrics, experiment, differentiation, risks

Primary: Clarification Completion Rate. Differentiate as intent/requirement clarity, not “better prompt.” Risk: over-asking — mitigate by material-only questions and stop on CLEAR.

---

# 37–40. Architecture thesis

DECLARE owns: **What exactly does the human want?**  
Downstream AI owns: **How do I execute it?**

---

# 41. MVP Definition of Done

User can: enter free-form → get fitting questions → option or custom → continue if unclear → not over-asked → CLEAR → see confirmed decisions → verified prompt → copy to another AI — without prompt engineering.

Success = natural, useful interview that makes intent explicit — **not** merely a pretty prompt.

---

## Phase map (shipped in repo)

See `docs/ARCHITECTURE.md`.

1. Ontology + 8 intent families  
2. Domain packs: coding, data, business_ops (VI/EN)  
3. CLEAR scorer + gold set (`npm run test:gold`)  
4. Personal RAG **local only** (không telemetry / không train model)

Avoid: Call-A-only diversity; giant fixed questionnaires.

