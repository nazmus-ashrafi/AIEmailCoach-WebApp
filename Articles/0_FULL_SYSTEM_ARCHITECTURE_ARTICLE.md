# AI Email Coach - Complete System Architecture

## System Overview

The AI Email Coach is a full-stack application that helps users manage emails through AI-powered classification and draft generation. The system consists of:

- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Frontend**: Next.js (React/TypeScript)
- **AI Engine**: LangGraph with OpenAI/Anthropic models
- **External APIs**: Microsoft Graph API (Outlook/Office 365)
- **Database**: SQLite (development)

---

## Architecture Components

### Backend Structure
```
webapp/backend/
├── auth/           # Authentication & JWT
├── users/          # User management
├── email_accounts/ # OAuth2 & account management
├── emails/         # Email sync & AI operations
├── entities/       # SQLAlchemy models
├── core/           # Shared utilities (Outlook client, config)
└── db/             # Database configuration
```

### Frontend Structure
```
webapp/frontend/app/
├── auth/           # Login & registration pages
├── accounts/       # Email account management
├── emails/         # Email inbox & detail views
└── profile/        # User profile management
```

### AI Engine Structure
```
src/ai_email_coach/
├── graph.py        # Main LangGraph workflow
├── agent_graph/    # Response agent with tools
├── state.py        # State management
├── prompts.py      # System prompts
└── configuration.py # Agent configuration
```

---

## Complete Data Flow Catalog

### Flow 1: User Registration
**Endpoint**: `POST /api/auth/register`

**Code Location**: [auth/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/auth/router.py#L23-L37)

**Steps**:
1. User submits registration form (email, first_name, last_name, password)
2. Frontend: `POST /api/auth/register` with JSON body
3. Backend: Validate email uniqueness
4. Backend: Hash password using bcrypt
5. Backend: Create User record in database
6. Backend: Return success message
7. Frontend: Redirect to login page

**Key Code**:
- Router: `auth/router.py::register_user()`
- Service: `auth/service.py::register_user()`
- Entity: `entities/users.py::User`

---

### Flow 2: User Authentication (Login)
**Endpoint**: `POST /api/auth/token`

**Code Location**: [auth/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/auth/router.py#L40-L54)

**Steps**:
1. User enters email/password in login form
2. Frontend: `POST /api/auth/token` (OAuth2 form-urlencoded)
3. Backend: Query user by email
4. Backend: Verify password hash
5. Backend: Generate JWT token (expires in 30 days)
6. Backend: Return `{"access_token": "...", "token_type": "bearer"}`
7. Frontend: Store token in localStorage
8. Frontend: Set Authorization header for future requests
9. Frontend: Redirect to emails page

**Key Code**:
- Router: `auth/router.py::login_for_access_token()`
- Service: `auth/service.py::login_for_access_token()`
- JWT Creation: `auth/service.py::create_access_token()`

---

### Flow 3: Get Current User Info
**Endpoint**: `GET /api/auth/me`

**Code Location**: [auth/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/auth/router.py#L57-L80)

**Steps**:
1. Frontend: Include JWT in Authorization header
2. Frontend: `GET /api/auth/me`
3. Backend: Extract JWT from header
4. Backend: Verify and decode JWT
5. Backend: Extract user_id from token
6. Backend: Query User from database
7. Backend: Return user profile (id, email, first_name, last_name, created_at)
8. Frontend: Display user information

**Key Code**:
- Router: `auth/router.py::get_current_user_info()`
- Auth Dependency: `auth/service.py::get_current_user()`
- JWT Verification: `auth/service.py::verify_token()`

---

### Flow 4: OAuth2 Email Account Connection
**Endpoints**: 
- `GET /api/email_accounts/oauth/authorize`
- `GET /api/email_accounts/oauth/callback`

**Code Location**: [email_accounts/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/email_accounts/router.py#L36-L151)

**Steps**:
1. User clicks "Connect Outlook Account" button
2. Frontend: Get JWT from localStorage
3. Frontend: Redirect to `GET /api/email_accounts/oauth/authorize?token=<jwt>`
4. Backend: Verify JWT, extract user_id
5. Backend: Create OAuth state (user_id + timestamp)
6. Backend: Store state in memory with expiration
7. Backend: Build Microsoft authorization URL
8. Backend: Redirect to Microsoft login page
9. Microsoft: User authorizes application
10. Microsoft: Redirect to callback with `code` and `state`
11. Backend: Verify state matches stored value
12. Backend: Exchange authorization code for tokens (access + refresh)
13. Backend: Call Microsoft Graph to get user email address
14. Backend: Check if account already exists
15. Backend: Encrypt refresh token using Fernet
16. Backend: Create EmailAccount record with encrypted token
17. Backend: Redirect to frontend success page
18. Frontend: Show success message, refresh account list

**Key Code**:
- Router: `email_accounts/router.py::oauth_authorize()`, `oauth_callback()`
- Service: `email_accounts/service.py::create_authorization_url()`, `exchange_code_for_tokens()`
- Encryption: `email_accounts/service.py::encrypt_token()`, `decrypt_token()`
- Entity: `entities/email_account.py::EmailAccount`

**Security Notes**:
- Refresh tokens encrypted at rest using Fernet (symmetric encryption)
- State parameter prevents CSRF attacks
- Tokens expire after 5 minutes

---

### Flow 5: Email Sync (Delta Sync)
**Endpoint**: `POST /api/emails/sync_outlook/{account_id}`

**Code Location**: [emails/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/emails/router.py#L554-L716)

**Steps**:
1. User clicks "Sync" on account card
2. Frontend: `POST /api/emails/sync_outlook/{account_id}` with JWT
3. Backend: Verify JWT, get user_id
4. Backend: Query EmailAccount by account_id and user_id
5. Backend: Verify account exists and belongs to user
6. Backend: Decrypt refresh token
7. Backend: Exchange refresh token for new access token
8. Backend: Update access token expiration in database
9. Backend: Load or create DeltaToken for this account
10. Backend: Build Microsoft Graph delta URL
11. Backend: Call Graph API with delta token (incremental sync)
12. Backend: Paginate through all changes (@odata.nextLink)
13. Backend: Process each message:
    - If `@removed`: Add to deletion list
    - Otherwise: Transform and upsert to database
14. Backend: Bulk delete removed messages
15. Backend: Save new delta token for next sync
16. Backend: Commit all changes atomically
17. Backend: Return statistics (inserted, updated, deleted)
18. Frontend: Show success message, update UI

**Key Code**:
- Router: `emails/router.py::sync_outlook()`
- Service: `emails/service.py::upsert_email()`, `bulk_delete_by_ids()`
- Outlook Client: `core/outlook.py::OutlookClient`
- Entities: `entities/email.py::Email`, `entities/delta_token.py::DeltaToken`

**Delta Sync Explained**:
- First sync: Downloads all emails from inbox
- Subsequent syncs: Only fetches changes (new, updated, deleted)
- Delta token is a URL from Microsoft Graph API
- Dramatically reduces API calls and bandwidth

---

### Flow 6: Email Classification (AI)
**Endpoint**: `POST /api/emails/classify_email?email_id={id}`

**Code Location**: [emails/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/emails/router.py#L119-L183)

**Steps**:
1. User clicks "Classify Email" button
2. Frontend: `POST /api/emails/classify_email?email_id={id}`
3. Backend: Query Email by ID
4. Backend: Check if classification already exists
5. Backend: If exists, return cached classification (idempotent)
6. Backend: Build LangGraph state with email data
7. Backend: Invoke LangGraph workflow (`graph.ainvoke()`)
8. LangGraph: Execute `triage_router` node
9. LangGraph: Call LLM with structured output (RouterSchema)
10. LangGraph: LLM classifies as "ignore", "notify", or "respond"
11. LangGraph: If "respond", route to `response_agent`
12. LangGraph: Agent generates draft using tools
13. LangGraph: Return state with classification, reasoning, ai_draft
14. Backend: Extract results from state
15. Backend: Create EmailClassification record
16. Backend: Commit to database
17. Backend: Return classification response
18. Frontend: Display classification badge and reasoning

**Key Code**:
- Router: `emails/router.py::classify_email()`
- LangGraph: `src/ai_email_coach/graph.py::triage_router()`
- State: `src/ai_email_coach/state.py::State`
- Entity: `entities/email.py::EmailClassification`

**AI Flow Details**:
- Uses structured output for reliable classification
- Three categories: ignore, notify, respond
- Reasoning explains LLM decision-making
- Results cached to avoid redundant LLM calls

---

### Flow 7: AI Draft Generation
**Endpoint**: `POST /api/emails/{email_id}/generate_draft?force={bool}`

**Code Location**: [emails/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/emails/router.py#L190-L265)

**Steps**:
1. User clicks "Generate Draft" button
2. Frontend: `POST /api/emails/{email_id}/generate_draft`
3. Backend: Query Email by ID
4. Backend: Check if draft already exists
5. Backend: If exists and force=false, return cached draft
6. Backend: Build LangGraph state with email data
7. Backend: Invoke LangGraph workflow
8. LangGraph: Execute `triage_router` (classify email)
9. LangGraph: If "respond", route to `response_agent`
10. LangGraph: Agent uses tools to draft response
11. LangGraph: Agent calls `write_email` tool
12. LangGraph: Return state with ai_draft
13. Backend: Extract draft from state
14. Backend: Update or create EmailClassification record
15. Backend: Commit to database
16. Backend: Return draft response
17. Frontend: Display draft in UI

**Key Code**:
- Router: `emails/router.py::generate_draft()`
- LangGraph Agent: `src/ai_email_coach/agent_graph/graph.py::agent`
- Tools: `src/ai_email_coach/agent_graph/tools.py`
- Prompts: `src/ai_email_coach/prompts.py`

**Force Regeneration**:
- `force=true` bypasses cache
- Useful for regenerating with different preferences
- Always re-invokes LangGraph workflow

---

### Flow 8: User Profile Management
**Endpoints**: 
- `GET /api/users/me` - Get profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/password` - Change password
- `DELETE /api/users/me` - Delete account

**Code Location**: [users/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/users/router.py)

#### Get Profile
1. Frontend: `GET /api/users/me` with JWT
2. Backend: Verify JWT, extract user_id
3. Backend: Query User from database
4. Backend: Return user profile
5. Frontend: Display profile information

#### Update Profile
1. User edits profile form (first_name, last_name, email)
2. Frontend: `PUT /api/users/me` with JSON body
3. Backend: Verify JWT, extract user_id
4. Backend: Validate new email is unique (if changed)
5. Backend: Update User record
6. Backend: Commit changes
7. Backend: Return updated profile
8. Frontend: Show success message

#### Change Password
1. User submits password change form
2. Frontend: `PUT /api/users/me/password` with current + new password
3. Backend: Verify JWT, extract user_id
4. Backend: Verify current password
5. Backend: Hash new password
6. Backend: Update User record
7. Backend: Commit changes
8. Backend: Return 204 No Content
9. Frontend: Show success message

#### Delete Account
1. User confirms account deletion
2. Frontend: `DELETE /api/users/me` with JWT
3. Backend: Verify JWT, extract user_id
4. Backend: Delete User (cascade deletes EmailAccounts, Emails, EmailClassifications)
5. Backend: Commit changes
6. Backend: Return 204 No Content
7. Frontend: Clear localStorage, redirect to login

**Key Code**:
- Router: `users/router.py`
- Service: `users/service.py`
- Entity: `entities/users.py::User`

---

### Flow 9: Email Account Management
**Endpoints**:
- `GET /api/email_accounts/` - List accounts
- `DELETE /api/email_accounts/{account_id}` - Delete account

**Code Location**: [email_accounts/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/email_accounts/router.py#L158-L186)

#### List Accounts
1. Frontend: `GET /api/email_accounts/` with JWT
2. Backend: Verify JWT, extract user_id
3. Backend: Query EmailAccounts for user
4. Backend: Return list of accounts (without sensitive tokens)
5. Frontend: Display account cards

#### Delete Account
1. User clicks delete on account card
2. Frontend: Confirm deletion
3. Frontend: `DELETE /api/email_accounts/{account_id}` with JWT
4. Backend: Verify JWT, extract user_id
5. Backend: Query EmailAccount by ID and user_id
6. Backend: Delete account (cascade deletes Emails, DeltaTokens)
7. Backend: Commit changes
8. Backend: Return success message
9. Frontend: Remove account from UI

**Key Code**:
- Router: `email_accounts/router.py::list_email_accounts()`, `delete_email_account()`
- Service: `email_accounts/service.py`

---

### Flow 10: Email Listing
**Endpoint**: `GET /api/emails/`

**Code Location**: [emails/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/emails/router.py#L59-L90)

**Steps**:
1. Frontend: `GET /api/emails/`
2. Backend: Query all Emails, ordered by created_at DESC
3. Backend: Return email list
4. Frontend: Display inbox with email previews

**Key Code**:
- Router: `emails/router.py::list_emails()`
- Entity: `entities/email.py::Email`

---

### Flow 11: Email Detail View
**Endpoint**: `GET /api/emails/{email_id}`

**Code Location**: [emails/router.py](file:///Users/nazmus/Documents/code/ai_email_coach/webapp/backend/emails/router.py#L106-L111)

**Steps**:
1. User clicks on email in inbox
2. Frontend: Navigate to `/emails/{id}`
3. Frontend: `GET /api/emails/{id}`
4. Backend: Query Email by ID
5. Backend: Return email with full content (HTML + text)
6. Frontend: Render email detail page
7. Frontend: Display ClassifyIsland component for AI actions

**Key Code**:
- Router: `emails/router.py::get_email()`
- Frontend: `webapp/frontend/app/emails/[id]/page.tsx`
- Component: `webapp/frontend/app/emails/[id]/ClassifyIsland.tsx`

---

## LangGraph Workflow Architecture

### Main Graph Structure
```
START → triage_router → [response_agent | END]
```

**Code**: [src/ai_email_coach/graph.py](file:///Users/nazmus/Documents/code/ai_email_coach/src/ai_email_coach/graph.py#L94-L104)

### Triage Router Node
- **Purpose**: Classify emails into ignore/notify/respond
- **Input**: Email data (author, to, subject, body)
- **Output**: Classification + reasoning
- **Routing Logic**:
  - "ignore" → END
  - "notify" → END
  - "respond" → response_agent

**Code**: [src/ai_email_coach/graph.py](file:///Users/nazmus/Documents/code/ai_email_coach/src/ai_email_coach/graph.py#L17-L93)

### Response Agent Node
- **Purpose**: Generate draft responses
- **Tools Available**:
  - `write_email(to, subject, content)` - Draft email
  - `Done` - Mark task complete
- **Behavior**: Uses ReAct pattern to reason and act
- **Output**: AI-generated draft in state

**Code**: `src/ai_email_coach/agent_graph/graph.py`

### State Management
```python
class State(MessagesState):
    email_input: dict
    classification_decision: Literal["ignore", "respond", "notify"]
    reasoning: Optional[str]
    ai_draft: Optional[str]
```

**Code**: [src/ai_email_coach/state.py](file:///Users/nazmus/Documents/code/ai_email_coach/src/ai_email_coach/state.py)

---

## Database Schema

### Users Table
- `id` (UUID, PK)
- `email` (String, unique)
- `first_name` (String)
- `last_name` (String)
- `hashed_password` (String)
- `created_at` (DateTime)

### EmailAccounts Table
- `id` (UUID, PK)
- `user_id` (UUID, FK → Users)
- `email_address` (String)
- `provider` (Enum: outlook)
- `ms_refresh_token_encrypted` (String)
- `access_token_expires_at` (DateTime)
- `created_at` (DateTime)

### Emails Table
- `id` (Integer, PK)
- `email_account_id` (UUID, FK → EmailAccounts)
- `message_id` (String, unique)
- `author` (String)
- `to` (String)
- `subject` (String)
- `email_thread_text` (Text)
- `email_thread_html` (Text)
- `created_at` (DateTime)

### EmailClassifications Table
- `id` (Integer, PK)
- `email_id` (Integer, FK → Emails)
- `classification` (String)
- `reasoning` (Text)
- `ai_draft` (Text, nullable)
- `created_at` (DateTime)

### DeltaTokens Table
- `id` (Integer, PK)
- `email_account_id` (UUID, FK → EmailAccounts)
- `folder` (String)
- `delta_token` (Text, nullable)
- `updated_at` (DateTime)

---

## Security Architecture

### Authentication
- **Method**: JWT (JSON Web Tokens)
- **Storage**: localStorage (frontend)
- **Expiration**: 30 days
- **Algorithm**: HS256
- **Secret**: Environment variable `SECRET_KEY`

### Authorization
- **Pattern**: Dependency injection with `get_current_user()`
- **Verification**: Every protected endpoint verifies JWT
- **User Context**: Extracts user_id from token claims

### Token Encryption
- **Algorithm**: Fernet (symmetric encryption)
- **Key**: Environment variable `ENCRYPTION_KEY`
- **Usage**: Encrypts Microsoft refresh tokens at rest
- **Decryption**: Only when needed for API calls

### OAuth2 Security
- **State Parameter**: Prevents CSRF attacks
- **State Storage**: In-memory with 5-minute expiration
- **PKCE**: Not implemented (could be added)
- **Redirect URI**: Validated by Microsoft

---

## External API Integration

### Microsoft Graph API
- **Base URL**: `https://graph.microsoft.com/v1.0`
- **Authentication**: OAuth2 with refresh tokens
- **Scopes**: `User.Read`, `Mail.ReadWrite`, `Mail.Send`
- **Endpoints Used**:
  - `/me` - Get user profile
  - `/me/mailFolders/inbox/messages/delta` - Delta sync
  - `/oauth2/v2.0/authorize` - OAuth authorization
  - `/oauth2/v2.0/token` - Token exchange

### Rate Limiting
- Not currently implemented
- Microsoft has throttling limits
- Consider implementing exponential backoff

---

## Error Handling Patterns

### Backend
- **HTTPException**: FastAPI standard exceptions
- **Custom Exceptions**: `exceptions.py` (AuthenticationError, etc.)
- **Status Codes**: Standard HTTP codes (400, 401, 404, 500)
- **Error Messages**: User-friendly descriptions

### Frontend
- **Try-Catch**: Wraps all API calls
- **Error State**: React state for error messages
- **User Feedback**: Toast notifications or inline errors
- **Fallbacks**: Graceful degradation

### LangGraph
- **Try-Catch**: Wraps graph invocations
- **500 Errors**: Returns internal server error
- **Logging**: Console logs for debugging

---

## Synchronous vs Asynchronous Operations

### Synchronous (Blocking)
- User registration
- Login
- Profile updates
- Email listing
- Account deletion

### Asynchronous (Non-Blocking)
- Email sync (uses `run_in_threadpool` for Outlook client)
- AI classification (async LangGraph invocation)
- AI draft generation (async LangGraph invocation)
- OAuth callbacks (async HTTP requests)

### Why Async Matters
- FastAPI is async-first
- LangGraph supports async operations
- External API calls benefit from async
- Prevents blocking event loop

---

## Data Transformation Points

### 1. Microsoft Graph → Database
**Location**: `emails/router.py::sync_outlook()`

**Transformation**:
```python
# Graph API format
{
  "id": "AAMkAGI...",
  "subject": "Meeting tomorrow",
  "from": {"emailAddress": {"address": "sender@example.com"}},
  "toRecipients": [{"emailAddress": {"address": "recipient@example.com"}}],
  "receivedDateTime": "2025-11-22T10:00:00Z",
  "body": {"content": "...", "contentType": "html"}
}

# Database format (Email model)
{
  "message_id": "AAMkAGI...",
  "subject": "Meeting tomorrow",
  "author": "sender@example.com",
  "to": "recipient@example.com",
  "email_thread_text": "...",
  "email_thread_html": "...",
  "created_at": datetime(2025, 11, 22, 10, 0, 0)
}
```

### 2. Database → LangGraph State
**Location**: `emails/router.py::classify_email()`

**Transformation**:
```python
# Email model
email = Email(
  author="sender@example.com",
  to="recipient@example.com",
  subject="Meeting tomorrow",
  email_thread_text="..."
)

# LangGraph State
state_input = State(email_input={
  "author": email.author,
  "to": email.to,
  "subject": email.subject,
  "email_thread": email.email_thread_text
})
```

### 3. LangGraph State → API Response
**Location**: `emails/router.py::classify_email()`

**Transformation**:
```python
# LangGraph result
result = {
  "classification_decision": "respond",
  "reasoning": "This email requires a response because...",
  "ai_draft": "Dear sender, ..."
}

# API response (EmailClassificationResponse)
{
  "email_id": 123,
  "classification": "respond",
  "reasoning": "This email requires a response because...",
  "ai_draft": "Dear sender, ..."
}
```

---

## Common Error Scenarios

### 1. OAuth Flow Errors
- **Invalid state**: State expired or tampered
- **Code exchange failure**: Microsoft API error
- **Email extraction failure**: User profile missing email
- **Duplicate account**: Account already connected
- **Solution**: Redirect to frontend with error parameter

### 2. Token Refresh Errors
- **Expired refresh token**: User must re-authenticate
- **Decryption failure**: Encryption key changed
- **Microsoft API error**: Network or service issue
- **Solution**: Return 400 error, prompt user to reconnect

### 3. Email Sync Errors
- **Network timeout**: Microsoft Graph unreachable
- **Invalid delta token**: Token expired or corrupted
- **Rate limiting**: Too many requests
- **Solution**: Return 500 error, log details, retry later

### 4. AI Classification Errors
- **LangGraph timeout**: Model taking too long
- **Invalid response**: Model returned unexpected format
- **API key error**: OpenAI/Anthropic key invalid
- **Solution**: Return 500 error, log for debugging

### 5. Authentication Errors
- **Invalid JWT**: Token expired or tampered
- **Missing token**: User not logged in
- **User not found**: User deleted after token issued
- **Solution**: Return 401 error, redirect to login

---

## Performance Considerations

### Database Queries
- **Indexing**: message_id, email_account_id, user_id
- **Eager Loading**: Use `joinedload()` for relationships
- **Pagination**: Not implemented (should add for large datasets)

### API Calls
- **Delta Sync**: Reduces bandwidth by 90%+
- **Token Caching**: Access tokens cached until expiration
- **Batch Operations**: Bulk delete for efficiency

### AI Operations
- **Caching**: Classification results cached in database
- **Idempotency**: Prevents redundant LLM calls
- **Streaming**: Not implemented (could add for drafts)

### Frontend
- **Server-Side Rendering**: Email list pre-rendered
- **Client-Side Islands**: Only interactive components client-side
- **Local Storage**: JWT cached to avoid re-login

---

## Summary of All Flows

| # | Flow Name | Endpoints | Type | AI Involved |
|---|-----------|-----------|------|-------------|
| 1 | User Registration | `POST /api/auth/register` | Sync | No |
| 2 | User Authentication | `POST /api/auth/token` | Sync | No |
| 3 | Get Current User | `GET /api/auth/me` | Sync | No |
| 4 | OAuth2 Connection | `GET /api/email_accounts/oauth/*` | Async | No |
| 5 | Email Sync | `POST /api/emails/sync_outlook/{id}` | Async | No |
| 6 | Email Classification | `POST /api/emails/classify_email` | Async | Yes |
| 7 | Draft Generation | `POST /api/emails/{id}/generate_draft` | Async | Yes |
| 8 | Profile Management | `GET/PUT/DELETE /api/users/me` | Sync | No |
| 9 | Account Management | `GET/DELETE /api/email_accounts/*` | Sync | No |
| 10 | Email Listing | `GET /api/emails/` | Sync | No |
| 11 | Email Detail View | `GET /api/emails/{id}` | Sync | No |

---

## Key Architectural Patterns

### 1. Repository Pattern
- Service layer abstracts database operations
- Routers call services, not direct DB queries
- Promotes testability and separation of concerns

### 2. Dependency Injection
- FastAPI's `Depends()` for database sessions
- `get_current_user()` for authentication
- Promotes loose coupling

### 3. State Management (LangGraph)
- Immutable state updates via `Command`
- Typed state with Pydantic models
- Clear data flow through graph

### 4. Token-Based Authentication
- Stateless JWT tokens
- No server-side session storage
- Scalable and simple

### 5. Encryption at Rest
- Sensitive tokens encrypted in database
- Decrypted only when needed
- Fernet symmetric encryption

### 6. Delta Sync Pattern
- Incremental updates only
- Checkpoint-based resumption
- Efficient for large datasets

### 7. Islands Architecture (Frontend)
- Server-side rendering by default
- Client-side only for interactivity
- Optimal performance and SEO

---

## Next Steps for Architecture Evolution

### Recommended Improvements
1. **Add pagination** to email listing
2. **Implement rate limiting** for API endpoints
3. **Add background jobs** for email sync (Celery/Redis)
4. **Implement PKCE** for OAuth2 (more secure)
5. **Add email search** and filtering
6. **Implement draft editing** before sending
7. **Add metrics/analytics** (LangSmith integration)
8. **Add database migrations** (Alembic)
9. **Implement proper logging** (structured logs)
10. **Add unit and integration tests**

### Scalability Considerations
- Move to PostgreSQL for production
- Add Redis for caching and job queue
- Implement horizontal scaling for API
- Use CDN for frontend assets
- Add monitoring and alerting (Sentry, DataDog)
