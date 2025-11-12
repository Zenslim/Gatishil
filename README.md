# 🌅 Gatishil Nepal - Digital Chautari Sunlight Ledger

> **"From Guthi to DAO"** - Transforming Traditional Nepalese Community Governance into Digital Cooperative Systems

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![TinaCMS](https://img.shields.io/badge/TinaCMS-Latest-orange)](https://tina.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📖 Table of Contents

- [Overview](#overview)
- [🎯 Mission & Vision](#mission--vision)
- [✨ Features](#features)
- [🏗️ Architecture](#architecture)
- [🚀 Quick Start](#quick-start)
- [🛠️ Technology Stack](#technology-stack)
- [📊 Database Schema](#database-schema)
- [🔐 Authentication & Security](#authentication--security)
- [📱 Core Components](#core-components)
- [🧪 Development](#development)
- [🚀 Deployment](#deployment)
- [👥 Contributing](#contributing)
- [📄 License](#license)

## 🌟 Overview

Gatishil Nepal is a modern web application that digitizes and modernizes traditional Nepalese **Guthi** systems into a digital cooperative DAO (Decentralized Autonomous Organization). The platform serves as a **"digital chautari"** - a community gathering space in the digital realm - where traditional community decision-making processes are enhanced with blockchain-inspired governance mechanisms.

### What is a "Chautari"?

In Nepal, a **chautari** is a traditional resting place or community gathering spot where people meet, discuss important matters, and make collective decisions. Gatishil Nepal reimagines this concept for the digital age, creating a platform where communities can:

- Conduct transparent polls and proposals
- Manage collective resources
- Foster alumni networks
- Implement cooperative governance models
- Maintain financial transparency through the "sunlight ledger"

## 🎯 Mission & Vision

**Mission:** To bridge traditional Nepalese community governance with modern digital infrastructure, preserving cultural values while embracing technological innovation.

**Vision:** Create a self-sustaining digital ecosystem where communities can:
- Maintain collective ownership and responsibility
- Make transparent, democratic decisions
- Manage shared resources effectively
- Build lasting cooperative relationships
- Scale community impact beyond geographical boundaries

## ✨ Features

### 🏛️ Core Governance
- **🗳️ Democratic Polls** - Community-wide voting on important decisions
- **📋 Proposals System** - Structured proposal creation and management
- **👥 Member Management** - Comprehensive member directory and profiles
- **🏢 Cooperative Management** - Tools for managing collective resources

### 💰 Financial Transparency
- **☀️ Sunlight Ledger** - Transparent financial record system
- **💳 Tax Mirror** - Clear taxation and contribution tracking
- **📊 Financial Analytics** - Community wealth and resource visualization

### 🔐 Advanced Authentication
- **📱 OTP Authentication** - Secure phone-based verification
- **🔑 Passkey Integration** - Modern passwordless authentication
- **🛡️ Multi-Factor Security** - Comprehensive security layer
- **🌐 Session Management** - Robust user session handling

### 📝 Content Management
- **📰 Blog System** - Community news and updates
- **📚 Documentation** - Comprehensive guides and resources
- **🎨 CMS Integration** - TinaCMS for content management

### 🌐 Community Features
- **🎓 Alumni Engine** - Connect with community graduates
- **❓ FAQ System** - Common questions and answers
- **📋 Manifesto** - Community values and principles

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   (Next.js)     │◄──►│   (Supabase)    │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • React/TS      │    │ • Auth          │    │ • User Profiles │
│ • Tailwind CSS  │    │ • Real-time     │    │ • Organizations │
│ • Framer Motion │    │ • File Storage  │    │ • Transactions  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CMS Layer     │    │   Crypto Layer  │    │   Analytics     │
│   (TinaCMS)     │    │   (Argon2)      │    │   (Supabase)    │
│                 │    │                 │    │                 │
│ • Content Mgmt  │    │ • Password Hash │    │ • Usage Metrics │
│ • Media Assets  │    │ • Token System  │    │ • User Behavior │
│ • Markdown      │    │ • Secure Storage│    │ • Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Architectural Decisions

- **🔄 Edge-Optimized** - Middleware handles authentication at the edge for performance
- **🎯 Server Components** - Modern Next.js architecture for optimal performance
- **🛡️ Row Level Security** - Database-level security with Supabase RLS
- **⚡ Real-time Features** - Live updates using Supabase subscriptions

## 🚀 Quick Start

### Prerequisites
- **Node.js** 22.x or higher
- **pnpm** or **npm** package manager
- **Supabase Account** for database services

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Zenslim/Gatishil.git
   cd Gatishil
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Initialize the database**
   ```bash
   # Run the SQL migrations
   # (Run these in your Supabase SQL editor)
   ```
   Import the following SQL files in order:
   - `sql/postgres.sql` - Base tables and RLS policies
   - `sql/01_people_phone_unique.sql` - Unique constraints
   - `sql/people_email_unique.sql` - Email constraints
   - `sql/hr_upgrade.sql` - Human resources upgrade
   - `sql/otp_table.sql` - OTP system tables
   - `sql/chautari_seed.sql` - Initial data seed

5. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Technology Stack

### Frontend
- **[Next.js 14.2.5](https://nextjs.org/)** - React framework with App Router
- **[TypeScript 5.6.2](https://www.typescriptlang.org/)** - Type safety and better DX
- **[Tailwind CSS 3.4.13](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion 11.3.19](https://www.framer.com/motion/)** - Animation library
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend & Database
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service
  - **Authentication** - User management and sessions
  - **Database** - PostgreSQL with Row Level Security
  - **Real-time** - Live subscriptions
  - **Storage** - File and media management
- **[PostgreSQL](https://www.postgresql.org/)** - Primary database

### Security & Crypto
- **[@node-rs/argon2](https://github.com/RustCrypto/password-hashing/tree/master/argon2)** - Password hashing
- **[Zod 3.23.8](https://zod.dev/)** - Schema validation

### Content Management
- **[TinaCMS 1.5.57](https://tina.io/)** - Git-based CMS
- **[react-markdown](https://github.com/remarkjs/react-markdown)** - Markdown rendering

### Development & Testing
- **[Vitest 1.6.0](https://vitest.dev/)** - Testing framework
- **[ESLint 8.57.0](https://eslint.org/)** - Code linting
- **[Prettier 3.3.3](https://prettier.io/)** - Code formatting

## 📊 Database Schema

### Core Tables

#### `public.people`
Primary user profiles and member information:
```sql
- id: uuid (Primary Key)
- name: text (Required)
- email: text (Optional)
- phone: text (Optional)
- role: text (Role/position)
- created_at: timestamptz (Auto-generated)
- photo_url: text (Profile image)
- occupation: text (User's profession)
- skill: text[] (User skills)
- passion: text[] (User interests)
- compassion: text[] (User causes)
- vision: text (User's vision)
```

#### `public.trusted_factors`
Multi-factor authentication factors:
```sql
- auth_user_id: uuid (FK to auth.users)
- factor_type: text (otp, passkey, etc.)
- created_at: timestamptz
- updated_at: timestamptz
```

### Security Features
- **🔒 Row Level Security (RLS)** - Enabled on all tables
- **👤 Owner-only Access** - Users can only access their own data
- **🛡️ Policy-based Permissions** - Granular access control
- **🔑 JWT Authentication** - Secure session management

### Indexes & Performance
- **📊 `idx_people_created_at`** - Descending index on created_at
- **📱 Unique constraints** on email and phone numbers
- **🔄 Automatic timestamps** for audit trails

## 🔐 Authentication & Security

### Authentication Flow
```
User Input → OTP/Passkey → Supabase Auth → JWT Token → Protected Routes
    ↓              ↓             ↓              ↓           ↓
Phone/Email → Verification → Session Creation → Middleware → Dashboard
```

### Security Measures
- **🔒 Argon2 Hashing** - Industry-standard password hashing
- **📱 OTP Protection** - Time-based one-time passwords
- **🔑 Passkey Support** - Modern WebAuthn standards
- **🛡️ Edge Authentication** - Middleware verification at edge
- **🚫 Rate Limiting** - Protection against brute force attacks

### Session Management
- **⏰ Configurable Timeouts** - Automatic session expiration
- **🔄 Token Refresh** - Seamless session renewal
- **🚪 Secure Logout** - Complete session cleanup

## 📱 Core Components

### Navigation (`components/Nav.tsx`)
- **📱 Responsive Design** - Mobile-first approach
- **♿ Accessibility** - Full keyboard navigation support
- **🎯 Smart Routing** - Protected route handling

### Authentication Components
- **📝 Login Forms** - Multiple authentication methods
- **🔑 Passkey Setup** - WebAuthn integration
- **📱 OTP Interface** - Phone-based verification

### Community Features
- **👥 Member Directory** - Searchable member profiles
- **🗳️ Voting Interface** - Democratic decision making
- **💰 Financial Dashboard** - Transparent resource tracking

## 🧪 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run test         # Run test suite
```

### Code Quality
- **📝 ESLint Configuration** - Enforces coding standards
- **🎨 Prettier Setup** - Consistent code formatting
- **📊 TypeScript Strict Mode** - Enhanced type safety
- **🧪 Vitest Testing** - Comprehensive test coverage

### Development Workflow
1. **Feature Branch** - Create feature branches from `main`
2. **Development** - Implement features with tests
3. **Code Review** - Submit pull requests for review
4. **Testing** - Automated testing on CI/CD
5. **Deployment** - Automated deployment to production

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Connect your GitHub repository to Vercel
# Set environment variables in Vercel dashboard
# Deploy automatically on git push
```

### Environment Variables (Production)
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role
```

### Database Migration
1. **Supabase Dashboard** - Run SQL migrations in order
2. **Backup Strategy** - Regular automated backups
3. **Monitoring** - Database performance tracking

## 👥 Contributing

We welcome contributions from the community! Here's how you can help:

### 🤝 How to Contribute
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 📋 Development Guidelines
- **📝 Code Style** - Follow the existing code style
- **🧪 Write Tests** - Add tests for new features
- **📊 Type Safety** - Maintain TypeScript strict mode
- **📝 Documentation** - Update docs for significant changes

### 🐛 Bug Reports
- **Use** GitHub Issues for bug reports
- **Include** steps to reproduce the issue
- **Provide** environment details (OS, Node version, etc.)
- **Attach** relevant screenshots or logs

### 💡 Feature Requests
- **Search** existing issues first
- **Describe** the problem your feature would solve
- **Provide** use cases and examples
- **Discuss** implementation approach

### 📖 Documentation
- **Update** README.md for significant changes
- **Add** code comments for complex logic
- **Create** guides for new features
- **Maintain** API documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ **Commercial Use** - Use in commercial projects
- ✅ **Modification** - Modify and distribute
- ✅ **Distribution** - Share the software
- ✅ **Private Use** - Use privately
- ❌ **Liability** - No liability protection
- ❌ **Warranty** - No warranty guarantee

## 🙏 Acknowledgments

- **🇳🇵 Nepalese Community** - For inspiring traditional Guthi systems
- **🌐 Open Source Community** - For the amazing tools and libraries
- **🔐 Security Community** - For authentication and security best practices
- **💻 Developer Community** - For continuous improvement and innovation

## 📞 Support & Contact

- **🌐 Website:** [gatishilnepal.org](https://gatishilnepal.org)
- **📧 Email:** [contact@gatishilnepal.org](mailto:contact@gatishilnepal.org)
- **💬 Discussions:** [GitHub Discussions](https://github.com/Zenslim/Gatishil/discussions)
- **🐛 Issues:** [GitHub Issues](https://github.com/Zenslim/Gatishil/issues)

---

**Built with ❤️ for the Nepalese community and open source enthusiasts worldwide.**

*Transforming traditional governance into digital cooperative systems, one community at a time.* 🌅
