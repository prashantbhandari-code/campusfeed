# 🎓 Campusfeed
## Full-Stack University Social & Learning Platform

> **Campusfeed** is a full-stack platform designed to bring university social networking, communication, groups, learning management, events, and notifications into one unified campus experience.

---

## 1. Document Control

| Field | Details |
|---|---|
| Project | Campusfeed |
| Version | 1.0.0 |
| Documentation Version | 2.0 |
| Last Updated | September 12, 2026 |
| Repository | https://github.com/prashantbhandari2024/Campusfeed |
| Live Demo | https://campusconnect-osm1.onrender.com |
| License | MIT |

### Documentation Purpose
This document is the primary technical and product reference for Campusfeed. It covers the product vision, implemented capabilities, architecture, data model, project structure, API surface, setup, configuration, deployment, security, performance, responsive behavior, roadmap, and contribution workflow.

---

## 2. Executive Summary

### 2.1 Product
Campusfeed is a university-focused social platform intended to reduce fragmentation between student communication, campus communities, and academic workflows.

### 2.2 Core Problem
The project identifies several fragmented student experiences:

- High-volume WhatsApp groups can make important information difficult to find.
- Email announcements can become buried.
- Learning management systems may be disconnected from social/community activity.
- Event information may be distributed informally.
- Study groups may lack organization.

### 2.3 Product Vision
Campusfeed aims to become a **single digital home for university students**, combining:

1. Social networking
2. Academic/LMS functionality
3. Campus events
4. Messaging and group communication
5. Study-resource sharing

### 2.4 Primary Users

| User Type | Primary Use |
|---|---|
| Students | Social, academic, groups, messaging, events |
| Faculty | Course and academic management |
| Administrators | Official campus communication |

---

## 3. Product Scope & Feature Matrix

### 3.1 Authentication & Identity

| Capability | Status |
|---|---|
| Email/password login | ✅ |
| Google OAuth | ✅ |
| Password reset | ✅ |
| Session management | ✅ |
| Profile completion | ✅ |

Profile completion currently includes branch, batch, and department.

### 3.2 Social Platform

| Capability | Status |
|---|---|
| Feed/posts | ✅ |
| Likes/comments | ✅ |
| Saved posts | ✅ |
| 24-hour stories | ✅ |
| Profiles | ✅ |
| Follow/unfollow | ✅ |
| User discovery/search | ✅ |

### 3.3 Messaging

| Capability | Status |
|---|---|
| Real-time messaging | ✅ |
| Image sharing | ✅ |
| Audio messages | ✅ |
| Message reactions | ✅ |
| Read receipts | ✅ |
| Typing indicators | ✅ |
| User search | ✅ |

### 3.4 Groups

| Capability | Status |
|---|---|
| Public/private groups | ✅ |
| Group posts | ✅ |
| Sections | ✅ |
| Join/leave | ✅ |
| Member list | ✅ |

### 3.5 Learning Management System

| Capability | Status |
|---|---|
| Courses | ✅ |
| Modules | ✅ |
| Materials/resources | ✅ |
| Enrollment | ✅ |
| Attendance | ✅ |
| Assignments | ✅ |
| Submissions | ✅ |
| Quizzes | ✅ |
| Auto-grading | ✅ |
| Grades | ✅ |
| Course forums | ✅ |

### 3.6 Campus Events

| Capability | Status |
|---|---|
| Event creation | ✅ |
| Event calendar | ✅ |
| RSVP | ✅ |

### 3.7 Notifications & Settings

| Capability | Status |
|---|---|
| Browser push notifications | ✅ |
| In-app notifications | ✅ |
| Notification preferences | ✅ |
| Dark mode | ✅ |
| Privacy settings | ✅ |
| Blocked users | ✅ |
| Language preferences | ✅ |
| Secure sign-out | ✅ |

---

## 4. Project Metrics

The supplied project documentation reports:

| Metric | Reported Value |
|---|---:|
| TypeScript files | 131 |
| API routes | 56 |
| React components | 19 |
| Pages | 36 |
| Database models | 33 |
| TypeScript errors | 0 |
| Security vulnerabilities | 0 |

> **Note:** These are project-documentation claims as of September 12, 2026. They should be revalidated against the repository and current deployment before being presented as independently verified metrics.

---

## 5. Technology Stack

### 5.1 Frontend

| Technology | Reported Version | Role |
|---|---|---|
| Next.js | 14.x | React framework / App Router |
| React | 18.x | UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Lucide React | Latest | Icons |
| date-fns | 3.x | Date handling |

### 5.2 Backend & Data

| Technology | Reported Version | Role |
|---|---|---|
| Next.js API Routes | 14.x | REST API |
| Prisma | 5.x | ORM |
| PostgreSQL | 15.x | Primary database |
| Socket.IO | 4.x | Real-time communication |
| bcryptjs | 2.x | Password hashing |
| Node crypto | Built-in | Session-token signing |

### 5.3 External Services

| Service | Role |
|---|---|
| Appwrite | Authentication |
| Google OAuth 2.0 | Social login |
| Resend | Transactional email |
| Supabase | PostgreSQL hosting and storage |
| Render | Application hosting |
| GitHub | Source control |

---

## 6. System Architecture

### 6.1 Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                                                              │
│  Next.js App Router → React Components → Tailwind CSS       │
│                                                              │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                         APPLICATION SERVER                   │
│                                                              │
│  API Routes │ Authentication/Middleware │ Socket.IO          │
│                                                              │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│       DATA LAYER          │     │    EXTERNAL SERVICES      │
│                           │     │                           │
│ Prisma → PostgreSQL       │     │ Appwrite                  │
│ PostgreSQL hosted by      │     │ Google OAuth              │
│ Supabase                  │     │ Resend                    │
│                           │     │ Supabase Storage           │
└───────────────────────────┘     └───────────────────────────┘
```

### 6.2 Authentication Flow

```text
User
  │
  ▼
Login / Registration
  │
  ▼
Appwrite Authentication
  │
  ▼
Session Creation
  │
  ▼
HMAC-Signed HttpOnly Cookie
  │
  ▼
Authenticated API Request
  │
  ▼
Server-Side Cookie Verification
  │
  ▼
User Data / Protected Resource
```

### 6.3 Real-Time Messaging Flow

```text
User A
  │
  ▼
Send Message
  │
  ▼
Socket.IO Server
  │
  ├──► Persist Message in Database
  │
  └──► Broadcast to User B
              │
              ▼
        User B Receives Message
```

### 6.4 Architectural Responsibilities

| Layer | Responsibility |
|---|---|
| UI | Pages, components, responsive interaction |
| API | CRUD operations, validation, authorization |
| Authentication | Identity, sessions, OAuth |
| Real-time layer | Messaging and live presence-related interaction |
| ORM | Database access through Prisma |
| Database | Persistent application data |
| Storage | Uploaded files/media |
| Email | Password-reset/transactional communication |
| Hosting | Production application delivery |

---

## 7. Database Design

### 7.1 Core Domain Model

The documented database contains 33 models covering identity, social activity, communication, groups, LMS functionality, events, and notifications.

### 7.2 Complete Model Inventory

| Domain | Models |
|---|---|
| Identity | User |
| Social | Post, Comment, Like, Save, Story, Follow, Block |
| Messaging | Message |
| Groups | Group, GroupMember, GroupPost, Section |
| LMS | Course, Module, Material, Enrollment, Attendance, Assignment, Submission, Quiz, QuizAttempt, Question, Answer, Grade, ForumPost, ForumReply |
| Events | Event |
| Notifications | Notification, PushSubscription |

### 7.3 Key Relationships

```text
User
 ├── Posts
 ├── Comments
 ├── Likes
 ├── Saves
 ├── Stories
 ├── Sent / Received Messages
 ├── Groups / Group Memberships
 ├── Courses / Enrollments
 ├── Attendance
 ├── Assignments / Submissions
 ├── Quizzes / Attempts
 ├── Grades
 └── Forum Posts / Replies

Course
 ├── Modules
 ├── Materials
 ├── Enrollments
 ├── Attendance
 ├── Assignments
 ├── Quizzes
 └── Forum
```

### 7.4 Representative Prisma Models

The original documentation provides representative definitions for `User`, `Post`, `Message`, `Group`, and `Course`. These definitions should remain synchronized with `prisma/schema.prisma`; the schema file is the authoritative source for implementation-level details.

---

## 8. Repository Structure

```text
Campusfeed/
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   ├── feed/
│   │   │   ├── explore/
│   │   │   ├── messages/
│   │   │   ├── profile/
│   │   │   ├── groups/
│   │   │   ├── lms/
│   │   │   ├── events/
│   │   │   ├── notifications/
│   │   │   ├── settings/
│   │   │   └── create/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── login/
│   │   └── register/
│   ├── components/
│   │   ├── lms/
│   │   ├── AuthProvider.tsx
│   │   ├── CreatePost.tsx
│   │   ├── PostCard.tsx
│   │   ├── StoryBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── BottomNav.tsx
│   └── lib/
│       ├── appwrite.ts
│       ├── session-token.ts
│       ├── rateLimit.ts
│       ├── useFileUpload.ts
│       └── usePushNotifications.ts
├── prisma/
│   └── schema.prisma
├── server.ts
├── public/
├── android/
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## 9. API Reference

### 9.1 Authentication

| Method | Endpoint | Purpose | Rate Limit |
|---|---|---|---|
| POST | `/api/auth/register` | Create account | 10/min |
| POST | `/api/auth/login` | Sign in | 10/min |
| POST | `/api/auth/logout` | Sign out | — |
| GET | `/api/auth/me` | Current user | — |
| POST | `/api/auth/forgot-password` | Password reset request | 5/min |
| POST | `/api/auth/reset-password` | Reset password | 10/min |
| GET | `/api/auth/google` | Start Google OAuth | — |
| GET | `/api/auth/google/callback` | OAuth callback | — |

### 9.2 Users

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users` | Search/list users |
| GET | `/api/users/profile` | Own profile |
| PUT | `/api/users/profile` | Update own profile |
| GET | `/api/users/[id]` | User profile |
| POST | `/api/users/[id]/follow` | Follow/unfollow |
| GET | `/api/users/[id]/followers` | Followers |
| GET | `/api/users/[id]/following` | Following |
| POST | `/api/users/[id]/block` | Block/unblock |

### 9.3 Posts

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/posts` | Paginated feed |
| POST | `/api/posts` | Create post |
| DELETE | `/api/posts/[id]` | Delete post |
| POST | `/api/posts/[id]/like` | Like/unlike |
| POST | `/api/posts/[id]/save` | Save/unsave |
| GET | `/api/posts/[id]/comment` | Get comments |
| POST | `/api/posts/[id]/comment` | Add comment |

### 9.4 Messages

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/messages` | Conversations |
| GET | `/api/messages/[id]` | Conversation messages |
| GET | `/api/messages/search` | Search users |
| PUT | `/api/messages/[id]/read` | Mark as read |
| POST | `/api/messages/[id]/reactions` | Manage reactions |

### 9.5 Stories

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/stories` | Active stories |
| POST | `/api/stories` | Create story |
| DELETE | `/api/stories/[id]` | Delete story |

### 9.6 Groups

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/groups` | List groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/[id]` | Group details |
| POST | `/api/groups/[id]/join` | Join/leave |
| GET | `/api/groups/[id]/posts` | Group posts |
| POST | `/api/groups/[id]/posts` | Create group post |
| GET | `/api/groups/[id]/sections` | Sections |
| POST | `/api/groups/[id]/sections` | Create section |

### 9.7 LMS

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/courses` | List/create courses |
| GET | `/api/courses/[id]` | Course details |
| POST/DELETE | `/api/courses/[id]/enroll` | Enrollment |
| GET/POST | `/api/courses/[id]/modules` | Modules |
| GET/POST | `/api/courses/[id]/materials` | Materials |
| GET/POST | `/api/courses/[id]/attendance` | Attendance |
| GET/POST | `/api/courses/[id]/assignments` | Assignments |
| POST | `/api/assignments/[id]/submit` | Submit assignment |
| GET/POST | `/api/courses/[id]/forum` | Course forum |
| GET/POST | `/api/forum/[postId]/replies` | Forum replies |
| GET | `/api/quizzes/[id]` | Quiz |
| POST | `/api/quizzes/[id]/take` | Submit quiz attempt |
| GET | `/api/grades` | Student grades |

### 9.8 Platform Services

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload files |
| GET/POST | `/api/events` | Campus events |
| GET | `/api/notifications` | Notifications |
| PUT | `/api/notifications` | Mark notifications read |
| POST | `/api/push/subscribe` | Push subscription |
| GET | `/api/keepalive` | Render keepalive |

> **API governance recommendation:** For production maintenance, each endpoint should additionally document authentication requirement, authorization rule, request schema, response schema, error codes, pagination, and example request/response. These details are not fully specified in the supplied documentation and therefore are not invented here.

---

## 10. Local Development Setup

### 10.1 Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Supabase account
- Appwrite account
- Resend account
- Google Cloud Console project for OAuth

### 10.2 Installation

```bash
git clone https://github.com/prashantbhandari2024/Campusfeed.git
cd Campusfeed
npm install
```

### 10.3 Environment Configuration

```bash
cp .env.example .env
```

Populate the variables described in Section 11.

### 10.4 Database

```bash
npm run db:push
npm run db:seed
```

The seed command is documented as optional.

### 10.5 Run Development Server

```bash
npm run dev
```

The documented local URL is:

```text
http://localhost:3000
```

---

## 11. Environment Variables

### 11.1 Required

```env
DATABASE_URL="postgresql://postgres:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your-project-id"
APPWRITE_API_KEY="your-api-key"

GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

RESEND_API_KEY="re_your-resend-api-key"
EMAIL_FROM="Campusfeed <noreply@yourdomain.com>"

SESSION_SECRET="your-random-32-char-string"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 11.2 Optional

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

NODE_ENV="production"
PORT="3000"
```

### 11.3 Secret Management Rules

- Never commit `.env` or production secrets.
- Keep service-role credentials server-side.
- Use different credentials for development and production where possible.
- Rotate exposed credentials immediately.
- Treat `SESSION_SECRET`, API keys, OAuth secrets, and database credentials as sensitive.

---

## 12. User Workflows

### 12.1 Student Onboarding

```text
Register
  ↓
Complete Profile
  ↓
Explore Feed / Users / Groups
  ↓
Follow People
  ↓
Join Groups
  ↓
Enroll in Courses
  ↓
Use Events + Messaging + LMS
```

### 12.2 Social Workflow

```text
Create Post → Feed → Like / Comment / Save
                     ↓
                  Follow
                     ↓
               Community Growth
```

### 12.3 Messaging Workflow

```text
Messages → Search User → Open Conversation
                         ↓
                Text / Image / Audio
                         ↓
              Read / React / Reply
```

### 12.4 LMS Workflow

```text
Browse Course
   ↓
Enroll
   ↓
Modules / Materials
   ├──► Assignments → Submit
   ├──► Quizzes → Attempt → Grade
   ├──► Attendance
   └──► Forum
   ↓
Track Grades / Progress
```

### 12.5 Faculty Workflow

```text
Create Course
   ↓
Add Modules
   ↓
Upload Materials
   ↓
Create Assignments
   ↓
Mark Attendance
   ↓
Create Quizzes
   ↓
Monitor Student Progress
```

---

## 13. Security Architecture

### 13.1 Authentication Security

| Control | Documented Implementation |
|---|---|
| Password hashing | bcrypt |
| Session tokens | HMAC-SHA256 |
| Cookie storage | HttpOnly |
| Expiration | 7 days |
| SameSite | Enabled |
| Secure flag | Enabled |

### 13.2 API Security

| Control | Documented Implementation |
|---|---|
| Rate limiting | 13 critical routes |
| Input validation | Request-body validation |
| SQL injection mitigation | Prisma parameterized queries |
| XSS mitigation | React escaping |
| Error handling | try/catch route handling |

### 13.3 Rate Limits

| Endpoint | Limit |
|---|---|
| `/api/auth/login` | 10/min |
| `/api/auth/register` | 10/min |
| `/api/auth/forgot-password` | 5/min |
| `/api/posts` | 60/min |
| `/api/upload` | 30/min |

### 13.4 Real-Time Security

- Identity is verified server-side from the signed cookie.
- Room access is controlled by membership.
- Client-provided user IDs are not trusted.

> **Security verification note:** The documentation describes these controls but does not include a penetration-test report or independent security audit. The reported “0 vulnerabilities” metric should therefore be treated as a project claim until independently verified.

---

## 14. Performance & Scalability

### 14.1 Documented Optimizations

| Area | Optimization | Reported Impact |
|---|---|---|
| Posts | `_count` instead of `include` | 50% fewer DB queries |
| Stories | Selective fields | 40% faster response |
| Messages | 50-message pagination | 95% faster long-conversation loading |
| PostCard | `React.memo` | 30% fewer re-renders |
| Images | Lazy loading | 40% faster initial load |
| Requests | AbortController cleanup | Prevents stale work/memory leaks |

### 14.2 Caching

| Resource | Documented Strategy |
|---|---|
| Static assets | 1-year CDN cache |
| API responses | No cache |
| Sessions | 7 days |

### 14.3 Scalability Priorities

For future growth, the architecture should be evaluated around:

- Database indexing and query plans
- Connection pooling
- File/media storage and delivery
- WebSocket connection scaling
- Background jobs for notifications/email
- API pagination consistency
- Observability and error tracking
- CDN/media optimization

These are recommended engineering priorities rather than claims that they are already implemented.

---

## 15. Responsive & Mobile Experience

### 15.1 Breakpoints

| Device | Width |
|---|---|
| Mobile | < 640px |
| Tablet | 640–1024px |
| Desktop | > 1024px |

### 15.2 Mobile Capabilities

- Bottom navigation
- Story swipe interaction
- Touch-optimized controls
- Camera integration
- Responsive images
- Mobile-friendly uploads

### 15.3 Upload Compatibility

The documentation specifies a `<label>` + `sr-only` pattern for mobile file inputs rather than `className="hidden"` to improve cross-browser compatibility.

---

## 16. Deployment

### 16.1 Production Hosting

| Service | Responsibility |
|---|---|
| Render | Application hosting |
| Supabase | PostgreSQL |
| GitHub | Source control |

### 16.2 Render Configuration

```text
Build Command:
npm install && npm run build

Start Command:
npm run start

Node Version:
18.x
```

### 16.3 Deployment Flow

```text
Developer
   ↓
Git Push
   ↓
GitHub
   ↓
Render Auto-Deploy
   ↓
Install Dependencies
   ↓
Build
   ↓
Production Deployment
```

### 16.4 Capacitor Android Build

```bash
npm run build
npx cap sync
cd android && ./gradlew assembleDebug
```

---

## 17. Reliability & Operational Checklist

### Before Release

- [ ] TypeScript/build passes
- [ ] Database migrations/schema are synchronized
- [ ] Environment variables are configured
- [ ] OAuth redirect URLs are correct
- [ ] Email delivery is tested
- [ ] File uploads are tested
- [ ] Authentication/session expiry is tested
- [ ] Rate limits are tested
- [ ] WebSocket authentication is tested
- [ ] Mobile layouts are tested
- [ ] Production error handling is reviewed
- [ ] Backup/recovery strategy is confirmed

### After Release

- [ ] Monitor application errors
- [ ] Monitor database performance
- [ ] Monitor API latency
- [ ] Monitor WebSocket failures
- [ ] Monitor email delivery
- [ ] Review storage usage
- [ ] Review authentication failures
- [ ] Re-test critical flows after deployments

> These checklists are structural recommendations added to make the documentation operationally useful; they are not statements that every item is currently implemented.

---

## 18. Testing Strategy

The supplied documentation reports zero TypeScript errors but does not provide a detailed automated testing inventory.

A production-ready testing structure should be documented separately as:

```text
Testing
├── Unit Tests
│   ├── Utilities
│   ├── Validation
│   └── Business logic
├── API Tests
│   ├── Authentication
│   ├── Authorization
│   ├── CRUD
│   └── Rate limits
├── Integration Tests
│   ├── Database
│   ├── Appwrite
│   ├── Storage
│   └── Email
├── E2E Tests
│   ├── Registration/login
│   ├── Social workflows
│   ├── Messaging
│   ├── Groups
│   └── LMS
└── Mobile / Responsive Tests
```

No specific automated test coverage numbers are asserted because they are not present in the source documentation.

---

## 19. API & Data Governance Recommendations

To make future development easier, each API should eventually have a standard specification containing:

```text
Endpoint
├── Purpose
├── Authentication
├── Authorization
├── Request Parameters
├── Request Body Schema
├── Response Schema
├── Pagination
├── Validation Rules
├── Error Codes
├── Rate Limit
└── Example Request / Response
```

Similarly, each database model should document:

```text
Model
├── Purpose
├── Fields
├── Relationships
├── Constraints
├── Indexes
├── Cascade behavior
└── Access rules
```

---

## 20. Roadmap

### Phase 2 — Q4 2026

- [ ] Video calling (WebRTC)
- [ ] Screen sharing
- [ ] Threaded comments
- [ ] Post scheduling
- [ ] Advanced analytics

### Phase 3 — Q1 2027

- [ ] Mobile apps / React Native
- [ ] Offline support
- [ ] AI-powered recommendations
- [ ] LMS chatbot
- [ ] University-system integrations

### Phase 4 — Q2 2027

- [ ] Student marketplace
- [ ] Job-board integration
- [ ] Alumni network
- [ ] Multi-language support
- [ ] Accessibility improvements

---

## 21. Development & Contribution

### 21.1 Workflow

```bash
git checkout -b feature/amazing-feature

# Make changes

npm run build

git add .
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

Then open a Pull Request.

### 21.2 Code Standards

- TypeScript strict mode
- Next.js recommended ESLint configuration
- Prettier formatting
- Functional React components
- Hooks where appropriate
- try/catch error handling in API routes

### 21.3 Commit Convention

| Prefix | Meaning |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `style:` | Formatting |
| `refactor:` | Code restructuring |
| `test:` | Tests |
| `chore:` | Maintenance |

---

## 22. Known Documentation Gaps

The original documentation is strong as a project overview, but the following areas would make it significantly more professional and maintainable:

1. **No formal requirements specification** — functional and non-functional requirements should be separated.
2. **No role/permission matrix** — student, faculty, and administrator permissions should be explicitly mapped.
3. **No complete ER diagram** — the model inventory exists, but a visual relationship diagram would improve comprehension.
4. **No endpoint schemas** — request/response examples are missing.
5. **No error-code catalog** — clients need standardized error responses.
6. **No test report** — test types, coverage, and CI status should be documented.
7. **No observability section** — logging, monitoring, alerts, and incident handling are not described.
8. **No backup/recovery procedure** — database recovery expectations should be documented.
9. **No CI/CD specification** — automated quality gates should be described if implemented.
10. **No accessibility standard** — WCAG target and testing approach should be stated.
11. **No data-retention policy** — important for messages, stories, uploads, and account deletion.
12. **No media/storage policy** — upload size, allowed formats, lifecycle, and abuse controls should be documented.
13. **No threat model** — security controls are listed, but threats and mitigations are not mapped.
14. **No versioning policy** — API/documentation versioning should be defined.

---

## 23. Recommended Final Documentation Architecture

For long-term maintainability, the project documentation can eventually be split into:

```text
docs/
├── README.md
├── product/
│   ├── vision.md
│   ├── requirements.md
│   ├── user-roles.md
│   └── roadmap.md
├── architecture/
│   ├── overview.md
│   ├── authentication.md
│   ├── realtime.md
│   ├── storage.md
│   └── decisions/
├── database/
│   ├── schema.md
│   └── er-diagram.md
├── api/
│   ├── authentication.md
│   ├── users.md
│   ├── social.md
│   ├── messaging.md
│   ├── groups.md
│   ├── lms.md
│   └── events.md
├── development/
│   ├── setup.md
│   ├── environment.md
│   ├── coding-standards.md
│   └── contributing.md
├── operations/
│   ├── deployment.md
│   ├── monitoring.md
│   ├── backups.md
│   └── incident-response.md
├── security/
│   ├── security.md
│   ├── threat-model.md
│   └── privacy.md
└── testing/
    ├── strategy.md
    ├── api-testing.md
    └── e2e-testing.md
```

This structure separates **product**, **architecture**, **implementation**, **operations**, **security**, and **testing**, making the repository easier for developers, evaluators, contributors, and future maintainers to navigate.

---

## 24. License & Acknowledgments

Campusfeed is documented as being released under the MIT License.

The original documentation acknowledges:

- Next.js
- Prisma
- Supabase
- Appwrite
- Resend
- Tailwind CSS
- Lucide

---

## 25. Support

For project support, the original documentation directs users to:

- The project's GitHub repository
- `support@campusconnect.com`

---

## 26. Source of Truth

This improved document is a **restructured and enhanced version of the supplied Campusfeed documentation**. Existing implementation claims have been preserved, while additional headings, workflows, checklists, governance recommendations, and documentation-gap analysis have been clearly identified as recommendations rather than silently presented as implemented functionality.

---

**Built with ❤️ for university students everywhere.**
