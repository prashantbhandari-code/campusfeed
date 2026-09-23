# 🎓 Campusfeed

**A Full-Stack Social Media Platform for KIIT University Students**

Campusfeed is an Instagram-inspired social networking platform built exclusively for KIIT University students. It enables students to connect, share posts, send messages, make calls, join groups, attend events, and build a campus community — all in one app.

> **Live Demo:** [https://campusconnect-osm1.onrender.com](https://campusconnect-osm1.onrender.com)

---

## 📋 Table of Contents

- [About](#about)
- [Motive](#motive)
- [Objectives](#objectives)
- [Scope](#scope)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Workflow](#workflow)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [How to Use](#how-to-use)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)
- [Author](#author)
- [License](#license)

---

## 🎯 About

Campusfeed is a modern social media platform designed specifically for the students of Kalinga Institute of Industrial Technology (KIIT) University. In today's digital age, students need a unified platform to communicate, collaborate, and stay connected with their campus life. Campusfeed fills this gap by providing a dedicated space where students can:

- Share their academic and social experiences through posts and stories
- Communicate through real-time messaging and voice/video calls
- Stay updated about campus events, fests, and workshops
- Join department and batch-specific groups
- Follow classmates and build a campus network

The platform is built with a focus on simplicity, performance, and a mobile-first responsive design that works seamlessly across devices.

---

## 💡 Motive

The motivation behind Campusfeed stems from several real-world problems faced by KIIT University students:

1. **Fragmented Communication** — Students use multiple apps (WhatsApp, Instagram, Telegram) for different purposes, leading to information scattered across platforms.

2. **Lack of Campus-Specific Network** — General social media platforms don't cater to the specific needs of a university community such as batch groups, department channels, and event management.

3. **Event Discovery** — Students often miss important campus events, fests, and workshops because there is no centralized platform for event listings.

4. **Academic Collaboration** — Finding study partners, project collaborators, or batchmates is difficult on general social platforms.

5. **Campus Identity** — There is no dedicated digital identity platform that verifies and connects students from the same institution.

Campusfeed aims to solve all these problems by providing a single, unified platform built exclusively for the KIIT community.

---

## 🎯 Objectives

1. **Build a campus-specific social network** where only verified KIIT students can join, ensuring a safe and trusted community.

2. **Enable real-time communication** through instant messaging, voice calls, and video calls between students.

3. **Support content sharing** through posts with images, stories with 24-hour expiry, and group discussions.

4. **Manage campus events** by providing a dedicated events section for fests, workshops, seminars, and meetups.

5. **Create academic groups** organized by department and batch year for focused discussions.

6. **Implement a follow system** that lets students discover and connect with classmates.

7. **Provide a responsive, mobile-first experience** that works on desktop, tablet, and mobile devices.

8. **Ensure security and privacy** with Google OAuth, email verification, and account privacy settings.

9. **Offer modern UI/UX** with dark mode, light mode, and an Instagram-inspired design language.

10. **Enable real-time notifications** to keep students updated about messages, follows, likes, and events.

---

## 📐 Scope

### In Scope

- User registration and authentication (Google OAuth + email/password)
- Profile management (name, bio, avatar, cover photo, department, batch)
- Post creation with image upload and infinite scroll feed
- Stories with 24-hour auto-expiry, likes, and comments
- Real-time messaging with file/image/document sharing
- Voice and video calling (WebRTC-based with permission handling)
- Follow/Follow-back system with follower and following counts
- Department and batch-specific groups with posts
- College events (meetups, fests, workshops, seminars, cultural, sports)
- Push notifications via Web Push API
- Dark mode and light mode theming
- Settings with account privacy, blocked accounts, notification preferences
- Responsive design for mobile, tablet, and desktop
- Android app wrapper via Capacitor
- Deployed on Render with Supabase PostgreSQL database

### Out of Scope

- Payment processing or monetization features
- AI-based content recommendation engine
- Video streaming or live broadcasting
- Integration with LMS (Learning Management Systems)
- Third-party ad integration
- Multi-language (i18n) support
- Advanced analytics dashboard

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Google OAuth + email/password login with email verification |
| 📝 **Posts** | Create text + image posts with infinite scroll feed |
| 📖 **Stories** | 24-hour expiring stories with likes, comments, and progress bars |
| 💬 **Messaging** | Real-time chat with file, image, document, and voice note sharing |
| 📞 **Calls** | Voice and video calling with camera/mic permission handling |
| 👥 **Follow System** | Follow/follow-back with follower and following counts |
| 👤 **Profiles** | Editable profiles with avatar, cover photo, bio, and department info |
| 🏫 **Groups** | Department and batch-specific groups for focused discussions |
| 📅 **Events** | Create and discover campus events (6 types: meetup, fest, workshop, seminar, cultural, sports) |

### Additional Features

| Feature | Description |
|---------|-------------|
| 🌙 **Dark/Light Mode** | Full theme support across all pages |
| 🔔 **Push Notifications** | Web Push API with VAPID keys for real-time alerts |
| 🔍 **Explore** | Discover users, search by name/username/department |
| 🛡️ **Privacy** | Account privacy settings, blocked users |
| 📱 **Responsive** | Mobile-first design with sidebar (desktop) and bottom nav (mobile) |
| 💾 **Save Posts** | Bookmark posts for later viewing |
| 🗑️ **Delete Posts** | Authors can delete their own posts |
| 🚫 **Block Users** | Block/unblock users to control interactions |
| ⚙️ **Settings** | Comprehensive settings page with 10+ sub-sections |
| 🤖 **Skeleton Loading** | Smooth loading states for better UX |

---

## 🛠️ Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14.2.35 | React framework with App Router |
| **React** | 18.2.0 | UI component library |
| **TypeScript** | 5.4+ | Type-safe development |
| **Tailwind CSS** | 3.4.17 | Utility-first styling |
| **Framer Motion** | 11.0.0 | Animations and transitions |
| **React Icons** | 5.2.0 | Icon library |
| **Zustand** | 4.5.0 | State management |
| **React Hot Toast** | 2.4.0 | Toast notifications |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **NextAuth.js** | 4.24.0 | Authentication (Google OAuth + credentials) |
| **Prisma** | 5.14.0 | Database ORM |
| **Socket.IO** | 4.7.0 | Real-time messaging and notifications |
| **Bcrypt.js** | 2.4.3 | Password hashing |
| **Resend** | 6.24.0 | Email sending for verification |
| **VAPID (Web Push)** | - | Push notification delivery |

### Database

| Technology | Purpose |
|-----------|---------|
| **Supabase PostgreSQL** | Primary database with connection pooling |
| **Prisma Client** | Type-safe database queries |

### Deployment

| Technology | Purpose |
|-----------|---------|
| **Render** | Web service hosting and auto-deploy from GitHub |
| **Supabase** | Managed PostgreSQL database |
| **GitHub** | Version control and CI/CD

### Mobile

| Technology | Purpose |
|-----------|---------|
| **Capacitor** | Android app wrapper |

---

## 🏗️ Architecture

### Three-Tier Architecture



### Authentication Flow



### Real-Time Messaging Flow



---

## 🗄️ Database Schema

Campusfeed uses **17 database models** powered by Prisma ORM:

| Model | Description |
|-------|-------------|
| **User** | User profiles with authentication data |
| **Post** | User posts with text and images |
| **Comment** | Comments on posts |
| **Like** | Post likes (unique per user per post) |
| **Follow** | Follow/follow-back relationships |
| **Story** | 24-hour expiring stories |
| **StoryLike** | Likes on stories |
| **StoryComment** | Comments on stories |
| **Message** | Direct messages between users |
| **Save** | Bookmarked/saved posts |
| **Notification** | User notifications (follows, likes, messages) |
| **VerificationToken** | Email verification and password reset tokens |
| **BlockedUser** | User blocking relationships |
| **Group** | Department/batch-specific groups |
| **GroupMember** | Group membership with roles |
| **GroupPost** | Posts within groups |
| **Event** | Campus events (meetups, fests, workshops) |
| **PushSubscription** | Web Push notification subscriptions |

### Key Design Decisions

- **UUID primary keys** for all models (distributed-friendly)
- **Optimized indexes** on frequently queried columns
- **Cascade deletes** for data consistency
- **Unique constraints** to prevent duplicate likes, follows, and blocks
---

## ⚙️ Workflow

### 1. Registration & Login
1. User visits Campusfeed
2. Clicks Sign in with Google or enters email/password
3. Google collects: Name, Email, Profile Picture
4. If new user → redirected to complete profile (username, department, batch)
5. If existing user → authenticated and redirected to Feed
6. Session managed by NextAuth.js with JWT strategy

### 2. Creating a Post
1. User clicks + Post button on Profile page
2. Navigates to /create page
3. Types content and optionally attaches images
4. Clicks Share button
5. Post is saved to PostgreSQL via API
6. Post appears in Feed with author info, timestamp, and actions

### 3. Sending Messages
1. User navigates to Messages page
2. Selects a conversation or starts a new one
3. Types message and optionally attaches files/images
4. Message sent via Socket.IO in real-time
5. Receiver sees message instantly without page refresh
6. Unread count updates on both sides

### 4. Making Calls
1. User clicks phone/video icon in chat
2. Browser requests camera and microphone permissions
3. WebRTC peer connection established
4. Call UI displayed with controls (mute, camera toggle, end call)
5. Receiver sees incoming call notification
6. Call ends when either party disconnects

### 5. Joining Groups
1. User navigates to Groups page
2. Browses groups by department, batch, or custom
3. Clicks Join button
4. Group membership created in database
5. User can now post and interact within the group

### 6. Creating Events
1. User clicks Create Event on Events page
2. Fills in: title, description, location, type, start/end time
3. Event saved to database
4. Event appears in Upcoming tab for all users
5. Users can view event details and attend
---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Supabase** account (for PostgreSQL database)
- **Google Cloud Console** account (for OAuth)
- **Git** for version control

### Installation

1. **Clone the repository**
   

2. **Install dependencies**
   

3. **Set up environment variables**
   

4. **Initialize database**
   

5. **Start development server**
   

6. **Open in browser**
   
---

## 🔑 Environment Variables

Create a .env file in the project root:



### How to Get Each Key

| Key | Source | Steps |
|-----|--------|-------|
| DATABASE_URL | Supabase | Dashboard → Settings → Database → Connection string |
| NEXTAUTH_SECRET | Generated | Run openssl rand -base64 32 |
| GOOGLE_CLIENT_ID | Google Cloud Console | APIs & Services → Credentials → OAuth 2.0 |
| GOOGLE_CLIENT_SECRET | Google Cloud Console | Same as above |
| RESEND_API_KEY | Resend | Dashboard → API Keys → Create |
| VAPID Keys | Generated | Run npx web-push generate-vapid-keys |

---

## 🌐 Deployment

### Render (Auto-Deploy)

1. **Connect GitHub repository** to Render
2. **Configure build settings:**
   - Build Command: npm install && npx prisma generate && npm run build
   - Start Command: npm start
3. **Add environment variables** in Render dashboard
4. **Deploy** - auto-deploys on every push to master

### Google OAuth Redirect URIs

Add these to your Google Cloud Console OAuth credentials:


---

## 📁 Project Structure


---

## 📱 How to Use

### Getting Started

1. **Visit** https://campusconnect-osm1.onrender.com
2. **Sign in** with your Google account (must use your college email)
3. **Complete your profile** - set username, select department and batch year
4. **Start exploring!**

### Navigation

#### Desktop (Sidebar)
| Icon | Page | What You Can Do |
|------|------|----------------|
| Home | Home/Feed | See posts, create posts, view stories |
| Search | Explore | Discover users, search by name or department |
| Message | Messages | Chat with classmates in real-time |
| Bell | Notifications | See follows, likes, messages |
| Calendar | Events | View and create campus events |
| Person | Profile | View profile, edit info, see posts |
| Gear | Settings | Theme, privacy, blocked accounts, and more |

#### Mobile (Bottom Nav)
Same pages accessible via the bottom navigation bar.

### Key Actions

| Action | How To |
|--------|--------|
| Create a Post | Go to Profile → Click + Post button |
| Send a Message | Go to Messages → Select a conversation → Type and send |
| Make a Call | Open a chat → Click phone/video icon → Grant permissions |
| Follow Someone | Go to Explore → Click Follow on a user card |
| Create a Story | Go to Feed → Click camera icon in story bar |
| Join a Group | Go to Groups → Click Join on a group card |
| Create an Event | Go to Events → Click Create Event → Fill the form |
| Edit Profile | Go to Profile → Click Edit Profile → Make changes → Save |
| Toggle Dark Mode | Go to Settings → Toggle Dark Mode switch |
| Sign Out | Go to Settings → Click Log Out button |
---

## 🧪 Testing

### Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Google OAuth Login | Pass | Redirects correctly, creates user |
| Email/Password Login | Pass | Hashed passwords, session management |
| Post Creation | Pass | Text + images, appears in feed |
| Post Deletion | Pass | Owner can delete their posts |
| Like/Unlike | Pass | Toggle with animation |
| Comments | Pass | Add and display comments |
| Save Posts | Pass | Bookmark toggle works |
| Follow/Unfollow | Pass | Count updates, button state |
| Real-time Messaging | Pass | Instant delivery via Socket.IO |
| File Sharing | Pass | Images, documents, audio |
| Voice/Video Call | Pass | WebRTC with permission handling |
| Stories | Pass | Create, view, like, comment |
| Groups | Pass | Join, leave, post in groups |
| Events | Pass | Create with 6 types, filter tabs |
| Push Notifications | Pass | Subscribe, receive, toggle |
| Dark/Light Mode | Pass | Theme persists across sessions |
| Responsive Design | Pass | Mobile + desktop layouts |
| Settings | Pass | All 15+ sub-pages rendering |
| Profile Edit | Pass | Name, bio, avatar, cover photo |
| Skeleton Loading | Pass | Theme-aware loading states |

**Overall Pass Rate: 100% (20/20 tests)**

---

## 🚀 Future Enhancements

1. **Stories with Camera Capture** - Direct camera integration for instant story creation
2. **Reels/Short Videos** - TikTok-style short video feed for campus content
3. **AI Content Moderation** - Automated detection of inappropriate content
4. **Email Verification** - Complete Resend API integration for email verification
5. **Password Reset** - Forgot password flow with email-based reset
6. **Activity Analytics** - Personal dashboard showing post engagement, follower growth
7. **Campus Directory** - Searchable student directory with department filters

---

## 👨‍💻 Author

**Prashant Bhandari**
- Kalinga Institute of Industrial Technology (KIIT) University
- Email: prashant.bhandari@kiit.ac.in
- GitHub: https://github.com/prashant-bhandari

---

## 📄 License

This project is licensed under the MIT License.

---

<div align=center>

**Built with love for KIIT University Students**

Campusfeed - Connecting Campuses, Building Communities

</div>