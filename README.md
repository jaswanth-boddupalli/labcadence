# LabPulse - Collaborative Research Management Platform

A high-performance research lifecycle management platform designed for academic laboratories, doctoral scholars, project coordinators, and Principal Investigators (PI).

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Motion, Lucide Icons
- **Backend**: Express, TypeScript (Node.js)
- **Database**: PostgreSQL (`pg` pool)
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Email Notifications**: Nodemailer (SMTP)

---

## Demo Access Credentials
When evaluating the application or launching locally:
- **Application Gate Password**: `demo2026`
- **Default Profile / Member PINs**: `0000` (for all personas)
- **Coordinator Master PIN**: `0000` (unlocks any profile)

---

## Key Features
- **Research Kanban Sprints**: Visual lanes (Doing, Planned, Backlog, Stalled, Completed) tailored for laboratory experiments.
- **PI Review Clearance Loop**: Principal Investigator review clearances, thermal blocker flags, and revision logs.
- **Executive Intelligence & Reporting**: Academic progress summary compiler with automated Word document (.docx) export.
- **AI Research Assistant**: Floating chatbot powered by Google Gemini SDK for conversational lab state queries.
- **Instant Messaging & Alerts**: Automated SMTP alerts and direct WhatsApp integration links for task updates.
- **Gamification & Badges**: Milestone achievements rewarding experiment completion, inventory maintenance, and peer reviews.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. Setup Database
```bash
# Initialize PostgreSQL schema
psql -U postgres -d labpulse -f init_db.sql
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your local PostgreSQL credentials, optional SMTP details, and Gemini API key:
```bash
cp .env.example .env
```

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```

Navigate to `http://localhost:3000` to access the application.
