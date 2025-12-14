# AI Email Coach

> An intelligent email management system that uses AI to automatically classify, prioritize, and draft responses to your emails.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-green)](https://www.langchain.com/)

## 📖 About The Project

AI Email Coach is a full-stack web application that revolutionizes email management by leveraging AI to automatically triage incoming emails and generate intelligent draft responses. Built with modern technologies and best practices, it provides a seamless experience for managing multiple email accounts with real-time AI assistance.

### Key Highlights

- **🤖 AI-Powered Classification**: Automatically categorizes emails into `ignore`, `notify`, or `respond` with detailed reasoning
- **✍️ Smart Draft Generation**: Creates contextual email drafts using LangChain and OpenAI
- **📧 Multi-Account Support**: Connect multiple Outlook accounts via OAuth2 with encrypted token storage
- **🔄 Real-Time Streaming**: Watch AI "think" as it processes emails with Server-Sent Events
- **💬 Conversation Threading**: Intelligent email grouping with full thread context
- **🔐 Enterprise Security**: JWT authentication, Fernet encryption, and XSS protection
- **⚡ Modern Architecture**: React Query for state management, Next.js 15, FastAPI backend

## 🚀 Features

### Email Management
- **Delta Sync**: Efficient incremental email synchronization using Microsoft Graph API
- **Conversation Grouping**: Emails automatically grouped by conversation threads
- **Multi-Folder Sync**: Syncs both Inbox and SentItems for complete conversation context
- **HTML Email Rendering**: Conditional rendering for forwarded email chains with XSS protection
- **Subject-Based Search**: Real-time search with debouncing and client-side filtering
- **Account Filtering**: View emails from specific accounts with persistent URL-based filtering

### AI Capabilities
- **LangGraph Triage Agent**: Multi-step reasoning for email classification
- **Streaming Classification**: Real-time typewriter effect showing AI reasoning as it's generated
- **Draft Generation**: Context-aware email responses using LangChain
- **Reasoning Transparency**: See why the AI made each classification decision

### User Experience
- **Responsive Design**: Mobile-first design with Tailwind CSS and shadcn/ui components
- **Dark Theme**: Modern, professional dark mode interface
- **Scrollable Sidebars**: Fixed-height containers prevent excessive scrolling
- **Visual Feedback**: Blue ring highlighting, loading states, and success/error messages
- **Layout Persistence**: Next.js layouts prevent scroll reset during navigation

### Developer Experience
- **React Query Integration**: Professional server state management with automatic cache invalidation
- **Type Safety**: Full TypeScript coverage on frontend
- **Feature-Based Architecture**: Vertical slicing for better code organization
- **Comprehensive DevLog**: 2400+ lines documenting every architectural decision

## 🛠️ Built With

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[React Query](https://tanstack.com/query)** - Server state management
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Reusable component library
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - XSS sanitization

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** - SQL toolkit and ORM
- **[LangChain](https://www.langchain.com/)** - LLM application framework
- **[LangGraph](https://langchain-ai.github.io/langgraph/)** - Agent workflow orchestration
- **[MSAL](https://github.com/AzureAD/microsoft-authentication-library-for-python)** - Microsoft authentication
- **[Pydantic](https://docs.pydantic.dev/)** - Data validation

### Infrastructure
- **[Microsoft Graph API](https://learn.microsoft.com/en-us/graph/)** - Email synchronization
- **[OpenAI API](https://platform.openai.com/)** - Language model inference
- **[Fernet](https://cryptography.io/en/latest/fernet/)** - Symmetric encryption for tokens
- **[bcrypt](https://github.com/pyca/bcrypt/)** - Password hashing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.12+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **uv** - Python package manager - [Install](https://github.com/astral-sh/uv)

You'll also need:
- **Microsoft Azure App** - For OAuth2 email access ([Setup Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app))
- **OpenAI API Key** - For AI classification ([Get Key](https://platform.openai.com/api-keys))

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai_email_coach.git
cd ai_email_coach
```

### 2. Backend Setup

```bash
cd webapp/backend

# Install dependencies with uv
uv sync

# Create .env file
cp .env.example .env
```

Configure your `.env` file:

```bash
# Database
DATABASE_URL=sqlite:///./email_coach.db

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32
JWT_ALGORITHM=HS256

# Microsoft OAuth2
APPLICATION_ID=your-azure-app-client-id
CLIENT_SECRET=your-azure-app-client-secret
REDIRECT_URI=http://localhost:8000/api/email_accounts/oauth/callback
TENANT_ID=consumers

# Token Encryption
TOKEN_ENCRYPTION_KEY=your-fernet-key  # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.local.example .env.local
```

Configure your `.env.local` file:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 4. Database Initialization

The database tables are automatically created on first run. The backend uses SQLAlchemy with automatic table creation via `ensure_tables_exist()`.

## 🚀 Running the Application

### Start Backend Server

```bash
cd webapp/backend
uv run main.py
```

The API will be available at `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Start Frontend Development Server

```bash
cd webapp/frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## 📚 Usage

### 1. Create an Account

Navigate to `http://localhost:3000` and register with your email and password. The system uses bcrypt for password hashing and JWT for authentication.

### 2. Connect Email Account

1. Go to the **Accounts** page
2. Click **"Connect Outlook Account"**
3. Authorize with Microsoft
4. Your account will appear in the list

### 3. Sync Emails

Click **"Sync"** on any connected account to fetch emails via Microsoft Graph API. The system uses delta sync for efficient incremental updates.

### 4. Classify Emails

1. Navigate to any email
2. Click **"Classify Email"**
3. Watch the AI reasoning stream in real-time
4. See classification result (`ignore`, `notify`, or `respond`)
5. If classified as `respond`, click **"Generate Draft"** for an AI-written reply

### 5. Browse Conversations

- **Inbox View**: See conversation-grouped emails with message counts
- **Detail View**: Full conversation thread with chronological ordering
- **Search**: Filter conversations by subject in real-time
- **Account Filter**: View emails from specific accounts

## 🏗️ Architecture

### Backend Structure (Feature-Based)

```
webapp/backend/
├── auth/              # JWT authentication
│   ├── router.py      # /api/auth endpoints
│   ├── service.py     # Token generation, password hashing
│   └── schemas.py     # Pydantic models
├── users/             # User management
├── email_accounts/    # OAuth2 account connection
│   ├── router.py      # OAuth flow endpoints
│   ├── service.py     # MSAL integration, token encryption
│   └── schemas.py     # Account models
├── emails/            # Email operations
│   ├── router.py      # Email CRUD, sync, threads, streaming
│   ├── service.py     # Delta sync, upsert logic
│   └── schemas.py     # Email models
├── ai/                # AI classification
│   └── classification_service.py  # LangGraph agents, streaming
├── entities/          # SQLAlchemy models
│   ├── users.py
│   ├── email_account.py
│   ├── email.py
│   ├── email_classification.py
│   └── delta_token.py
├── core/              # Shared utilities
│   ├── config.py      # Environment configuration
│   └── outlook.py     # Microsoft Graph client
└── database/
    └── database.py    # SQLAlchemy setup
```

### Frontend Structure

```
webapp/frontend/
├── app/
│   ├── auth/          # Login, register pages
│   ├── accounts/      # Email account management
│   │   └── oauth-callback/  # OAuth redirect handler
│   └── emails/        # Email views
│       ├── layout.tsx       # Persistent sidebar layout
│       └── [id]/
│           └── page.tsx     # Email detail page
├── components/
│   ├── auth/          # Auth context, user menu
│   ├── accounts/      # Account cards, connect button
│   └── emails/        # Conversation list, thread list, search
├── hooks/             # React Query hooks
│   ├── useConversations.ts
│   ├── useUpdateClassification.ts
│   ├── useSyncAccount.ts
│   └── useDeleteAccount.ts
├── utils/             # API clients, utilities
│   ├── auth-client.ts
│   ├── email-accounts-client.ts
│   └── email-utils.ts
└── types/             # TypeScript interfaces
```

### Key Patterns

**Backend:**
- **Feature-Based Architecture**: Vertical slicing (auth/, emails/, etc.) instead of horizontal layers
- **Service Layer Pattern**: Business logic separated from HTTP concerns
- **Pydantic Validation**: Request/response schemas for type safety
- **Dependency Injection**: FastAPI's `Depends()` for database sessions and auth

**Frontend:**
- **Container/Presentational**: Separation of data fetching and UI rendering
- **React Query**: Server state management with automatic cache invalidation
- **Layout Persistence**: Next.js layouts prevent scroll reset
- **Prop Drilling**: Explicit data flow for selected email highlighting

## 🔐 Security Features

- **JWT Authentication**: HS256 tokens with 30-minute expiration
- **Password Hashing**: bcrypt with cost factor 12
- **Token Encryption**: Fernet symmetric encryption for OAuth refresh tokens
- **CSRF Protection**: State parameter validation in OAuth flow
- **XSS Prevention**: DOMPurify sanitization for HTML emails
- **SQL Injection Protection**: SQLAlchemy ORM with parameterized queries
- **Scope Minimization**: OAuth requests only necessary Microsoft Graph permissions

## 🗺️ Roadmap

### Completed ✅
- [x] Email sync with Microsoft Graph API
- [x] AI classification with LangGraph
- [x] OAuth2 multi-account support
- [x] Conversation threading
- [x] Real-time streaming classification
- [x] React Query state management
- [x] Responsive UI with dark theme

### In Progress 🚧
- [ ] Email search across all fields (sender, content, date)
- [ ] Background sync with cron jobs
- [ ] Email folders (Drafts, Archive, Trash)

### Future Enhancements 🔮
- [ ] Gmail OAuth2 support
- [ ] IMAP account support
- [ ] Email attachments handling
- [ ] Conversation analytics (response time, message count)
- [ ] Email templates for common responses
- [ ] Keyboard shortcuts (j/k navigation)
- [ ] Email verification and password reset
- [ ] Token refresh mechanism for longer sessions
- [ ] Admin panel for monitoring
- [ ] Usage analytics dashboard

## 📝 Development Journey

This project was built iteratively over 28 commits, each adding a specific feature or improvement. The complete development journey is documented in [`Articles/DEVLOG.md`](Articles/DEVLOG.md) (2400+ lines), which includes:

- Technical implementation details for each feature
- Architecture decisions and rationale
- Bug fixes and solutions
- Performance optimizations
- Testing procedures
- Dependencies added at each stage

**Notable Milestones:**
- **Commit 1-5**: FastAPI setup, LangGraph integration, database persistence
- **Commit 6-10**: Frontend UI, Outlook sync, HTML rendering
- **Commit 11-14**: Delta sync, backend restructure, authentication
- **Commit 15-18**: OAuth2 accounts, conversation threading, multi-folder sync
- **Commit 19-23**: Conversation grouping, component refactoring, email search
- **Commit 24-28**: React Query migration, account filtering, streaming classification


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

Nazmus Ashrafi - nazmus_s.ashrafi@gmail.com

Project Link: [https://github.com/nazmus-ashrafi/AIEmailCoach-WebApp](https://github.com/nazmus-ashrafi/AIEmailCoach-WebApp)

---

**Built with ❤️ using Next.js, FastAPI, and LangChain**

