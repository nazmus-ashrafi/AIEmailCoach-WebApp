# Frontend Authentication & Email Accounts System - Complete Tutorial

## Table of Contents
1. [System Overview](#system-overview)
2. [Authentication Flow](#authentication-flow)
3. [Email Accounts OAuth2 Flow](#email-accounts-oauth2-flow)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Rewriting sync_outlook Endpoint](#rewriting-sync_outlook-endpoint)

---

## System Overview

### High-Level Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Browser   │ ←──→ │   Frontend   │ ←──→ │    Backend      │
│             │      │  (Next.js)   │      │   (FastAPI)     │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │                        │
                            ↓                        ↓
                     localStorage              PostgreSQL DB
                     (JWT Token)          (Users, EmailAccounts)
```

### Key Components

**Frontend:**
- Authentication pages (login, register)
- Protected routes
- Email accounts management page
- OAuth2 callback handler

**Backend:**
- JWT authentication
- User management
- Email accounts with OAuth2
- Token encryption (Fernet)

---

## Authentication Flow

### 1. User Registration

**Frontend Flow:**
```
User fills form → Validation → POST /api/auth/register → Auto-login → Redirect to /accounts
```

**File:** `webapp/frontend/app/auth/register/page.tsx`

**Key Code:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Client-side validation
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  
  // Call backend
  await register({
    email: formData.email,
    first_name: formData.first_name,
    last_name: formData.last_name,
    password: formData.password,
  });
  
  // Auto-login happens in register function
  router.push('/accounts');  // ← Redirects to accounts page
};
```

**Backend Endpoint:** `POST /api/auth/register`
- Creates user in database
- Hashes password with bcrypt
- Returns success (no token yet)

**Auto-Login:**
After registration, the frontend automatically calls login:

```typescript
// In utils/auth-client.ts
register: async (data: RegisterData): Promise<void> => {
  await api.post('/api/auth/register', data);
  // Then auto-login
  await authClient.login({
    email: data.email,
    password: data.password
  });
}
```

---

### 2. User Login

**Frontend Flow:**
```
User enters credentials → POST /api/auth/token → Store JWT → Redirect to /accounts
```

**File:** `webapp/frontend/app/auth/login/page.tsx`

**Key Code:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  await login({ email, password });
  
  // Redirect to return URL or default to /accounts
  const returnUrl = searchParams.get('returnUrl') || '/accounts';
  router.push(returnUrl);
};
```

**Backend Endpoint:** `POST /api/auth/token`
- Validates credentials
- Returns JWT token

**Token Storage:**
```typescript
// In utils/auth-client.ts
login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
  // OAuth2 Password Flow
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);
  formData.append('grant_type', 'password');
  
  const response = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  
  const tokens = await response.json();
  
  // Store token in localStorage
  tokenManager.set(tokens.access_token);
  
  return tokens;
}
```

---

### 3. Protected Routes

**How It Works:**

Every protected page is wrapped with `<ProtectedRoute>`:

```typescript
// Example: app/accounts/page.tsx
export default function AccountsPage() {
  return (
    <ProtectedRoute>
      <AccountsPageContent />
    </ProtectedRoute>
  );
}
```

**ProtectedRoute Component:**
```typescript
// components/auth/protected-route.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (!loading && !user) {
      // Not authenticated, redirect to login with returnUrl
      router.push(`/auth/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  return <>{children}</>;
}
```

**Auth Context:**
```typescript
// components/auth/auth-context.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadUser();
  }, []);
  
  const loadUser = async () => {
    if (!tokenManager.exists()) {
      setLoading(false);
      return;
    }
    
    try {
      const userData = await authClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      tokenManager.remove();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Email Accounts OAuth2 Flow

### Overview

The OAuth2 flow allows users to connect their Outlook accounts securely without storing passwords.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌────────────┐
│ Frontend │ ──→ │ Backend  │ ──→ │Microsoft │ ──→ │  Backend   │
│          │     │/authorize│     │  Login   │     │ /callback  │
└──────────┘     └──────────┘     └──────────┘     └────────────┘
     ↑                                                      │
     └──────────────────────────────────────────────────────┘
                    Redirect with success
```

### Step-by-Step Flow

#### Step 1: User Clicks "Connect Outlook Account"

**File:** `components/accounts/connect-account-button.tsx`

```typescript
export function ConnectAccountButton() {
  const handleConnectOutlook = () => {
    // Get JWT token from localStorage
    const token = tokenManager.get();
    if (!token) {
      alert('Please login first');
      return;
    }
    
    // Redirect to backend with token as query parameter
    const oauthUrl = `${emailAccountsClient.getOAuthUrl()}?token=${encodeURIComponent(token)}`;
    window.location.href = oauthUrl;
    // ↑ This is a full browser redirect (not fetch)
  };
  
  return <Button onClick={handleConnectOutlook}>Connect Outlook Account</Button>;
}
```

**Why pass token in URL?**
- Browser redirects (`window.location.href`) don't include HTTP headers
- Can't send `Authorization: Bearer <token>` header
- Solution: Pass token as query parameter

---

#### Step 2: Backend Receives Request & Creates Auth URL

**Endpoint:** `GET /api/email_accounts/oauth/authorize?token=<jwt>`

**File:** `webapp/backend/email_accounts/router.py`

```python
@router.get("/oauth/authorize")
async def oauth_authorize(
    token: str = Query(..., description="JWT access token"),
    db: Session = Depends(get_db)
):
    try:
        # 1. Verify JWT token
        from auth.service import verify_token
        token_data = verify_token(token)
        user_id = token_data.get_uuid()
        
        # 2. Create OAuth state (for CSRF protection)
        # State contains: user_id, timestamp, nonce
        auth_url = service.create_authorization_url(user_id)
        
        # 3. Redirect browser to Microsoft login
        return RedirectResponse(url=auth_url)
    except Exception as e:
        logger.exception(f"Failed: {e}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts/oauth-callback?error=auth_failed")
```

**What happens in `create_authorization_url`:**

**File:** `webapp/backend/email_accounts/service.py`

```python
def create_authorization_url(user_id: UUID) -> str:
    # 1. Create MSAL app
    app = get_msal_app()
    
    # 2. Create state parameter (CSRF protection)
    state = create_oauth_state(user_id)
    # State = JSON: {"user_id": "...", "timestamp": "...", "nonce": "..."}
    
    # 3. Generate Microsoft authorization URL
    auth_url = app.get_authorization_request_url(
        scopes=["User.Read", "Mail.ReadWrite", "Mail.Send"],
        state=state,
        redirect_uri="http://localhost:8000/api/email_accounts/oauth/callback"
    )
    
    return auth_url
    # Returns: https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?
    #          client_id=...&scope=...&state=...&redirect_uri=...
```

---

#### Step 3: User Sees Microsoft Login Page

User is now on Microsoft's website:
- Enters Microsoft credentials
- Sees consent screen (permissions requested)
- Clicks "Accept"

---

#### Step 4: Microsoft Redirects to Callback

After user accepts, Microsoft redirects to:
```
http://localhost:8000/api/email_accounts/oauth/callback?code=<auth_code>&state=<state>
```

**Endpoint:** `GET /api/email_accounts/oauth/callback`

**File:** `webapp/backend/email_accounts/router.py`

```python
@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db)
):
    # 1. Handle OAuth errors
    if error:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts/oauth-callback?error={error}")
    
    # 2. Verify state parameter (CSRF protection)
    user_id = service.verify_oauth_state(state)
    if not user_id:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts/oauth-callback?error=invalid_state")
    
    # 3. Exchange authorization code for tokens
    token_response = service.exchange_code_for_tokens(code)
    # Returns: {
    #   "access_token": "...",
    #   "refresh_token": "...",
    #   "expires_in": 3600
    # }
    
    # 4. Get user's email address from Microsoft Graph
    import httpx
    access_token = token_response["access_token"]
    graph_response = httpx.get(
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    user_profile = graph_response.json()
    email_address = user_profile.get("mail") or user_profile.get("userPrincipalName")
    
    # 5. Check if account already exists
    existing_accounts = service.get_user_email_accounts(db, user_id)
    for account in existing_accounts:
        if account.email_address.lower() == email_address.lower():
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts/oauth-callback?success=true&existing=true")
    
    # 6. Encrypt and store refresh token
    from datetime import datetime, timezone, timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_response.get("expires_in", 3600))
    
    service.create_email_account(
        db=db,
        user_id=user_id,
        email_address=email_address,
        provider=ProviderEnum.outlook,
        refresh_token=token_response["refresh_token"],  # ← This gets encrypted
        access_token_expires_at=expires_at
    )
    
    # 7. Redirect to frontend success page
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/accounts/oauth-callback?success=true")
```

**Token Encryption:**

**File:** `webapp/backend/email_accounts/service.py`

```python
def create_email_account(
    db: Session,
    user_id: UUID,
    email_address: str,
    provider: ProviderEnum,
    refresh_token: str,
    access_token_expires_at: Optional[datetime] = None
) -> EmailAccount:
    # Encrypt refresh token using Fernet
    encrypted_token = encrypt_token(refresh_token)
    
    # Store in appropriate field based on provider
    token_field = {}
    if provider == ProviderEnum.outlook:
        token_field["ms_refresh_token_encrypted"] = encrypted_token
    elif provider == ProviderEnum.google:
        token_field["google_refresh_token_encrypted"] = encrypted_token
    
    # Create database record
    account = EmailAccount(
        user_id=user_id,
        email_address=email_address,
        provider=provider,
        access_token_expires_at=access_token_expires_at,
        **token_field
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return account
```

---

#### Step 5: Frontend Shows Success Message

**File:** `app/accounts/oauth-callback/page.tsx`

```typescript
export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const existing = searchParams.get('existing');
    
    if (success) {
      if (existing) {
        setMessage('This account is already connected!');
      } else {
        setMessage('Account connected successfully!');
      }
      
      // Redirect to accounts page after 2 seconds
      setTimeout(() => {
        router.push('/accounts');
      }, 2000);
    } else if (error) {
      setMessage(`Error: ${error}`);
      setTimeout(() => {
        router.push('/accounts');
      }, 4000);
    }
  }, [searchParams, router]);
  
  return <div>{message}</div>;
}
```

---

#### Step 6: User Sees Connected Account

**File:** `app/accounts/page.tsx`

```typescript
function AccountsPageContent() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  const fetchAccounts = async () => {
    const data = await emailAccountsClient.getAccounts();
    setAccounts(data.accounts);
  };
  
  return (
    <div>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onDelete={handleAccountDeleted}
          onSync={handleAccountSynced}
        />
      ))}
    </div>
  );
}
```

**Backend Endpoint:** `GET /api/email_accounts/`

```python
@router.get("/", response_model=EmailAccountList)
async def list_email_accounts(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    accounts = service.get_user_email_accounts(db, current_user.get_uuid())
    return EmailAccountList(
        accounts=[EmailAccountResponse.model_validate(acc) for acc in accounts]
    )
```

---

## Frontend Architecture

### Directory Structure

```
webapp/frontend/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx          # Login page
│   │   └── register/page.tsx       # Registration page
│   ├── accounts/
│   │   ├── page.tsx                # Accounts dashboard
│   │   └── oauth-callback/page.tsx # OAuth callback handler
│   ├── emails/page.tsx             # Inbox (protected)
│   ├── profile/page.tsx            # User profile (protected)
│   └── layout.tsx                  # Root layout with AuthProvider
├── components/
│   ├── auth/
│   │   ├── auth-context.tsx        # Global auth state
│   │   ├── protected-route.tsx     # HOC for route protection
│   │   └── user-menu.tsx           # User dropdown menu
│   └── accounts/
│       ├── account-card.tsx        # Display account
│       └── connect-account-button.tsx # OAuth initiator
├── types/
│   ├── auth.ts                     # Auth TypeScript types
│   └── email-account.ts            # Email account types
└── utils/
    ├── api-client.ts               # Generic API client
    ├── auth-client.ts              # Auth-specific API calls
    └── email-accounts-client.ts    # Email accounts API calls
```

### Key Patterns

**1. API Client Pattern:**
```typescript
// utils/api-client.ts - Generic fetch wrapper
export const apiClient = async <T>(
  endpoint: string,
  options: RequestOptions
): Promise<T> => {
  const token = tokenManager.get();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.requiresAuth && token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    tokenManager.remove();
    window.location.href = '/auth/login';
  }
  
  return response.json();
};
```

**2. Context Pattern for Global State:**
```typescript
// components/auth/auth-context.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Usage in components:
const { user, loading, logout } = useAuth();
```

**3. Protected Route HOC:**
```typescript
// Wrap any page that requires authentication
<ProtectedRoute>
  <YourPageContent />
</ProtectedRoute>
```

---

## Backend Architecture

### Directory Structure

```
webapp/backend/
├── auth/
│   ├── router.py        # Auth endpoints (login, register)
│   ├── service.py       # Auth business logic (JWT, password hashing)
│   └── schemas.py       # Pydantic models
├── users/
│   ├── router.py        # User management endpoints
│   ├── service.py       # User CRUD operations
│   └── schemas.py       # User Pydantic models
├── email_accounts/
│   ├── router.py        # OAuth2 & account management endpoints
│   ├── service.py       # OAuth2 logic, token encryption
│   └── schemas.py       # Email account Pydantic models
├── emails/
│   ├── router.py        # Email endpoints (list, classify, sync)
│   └── service.py       # Email business logic
├── entities/
│   ├── users.py         # User SQLAlchemy model
│   ├── email_account.py # EmailAccount SQLAlchemy model
│   ├── email.py         # Email SQLAlchemy model
│   └── delta_token.py   # DeltaToken SQLAlchemy model
├── core/
│   ├── config.py        # Settings (OAuth2, JWT, DB)
│   └── outlook.py       # OutlookClient (MSAL, Graph API)
├── db/
│   └── database.py      # Database connection
└── main.py              # FastAPI app entry point
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    hashed_password VARCHAR NOT NULL,
    created_at TIMESTAMP
);

-- Email accounts table
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR NOT NULL,  -- 'outlook', 'google', 'imap'
    email_address VARCHAR NOT NULL,
    ms_refresh_token_encrypted VARCHAR,     -- Encrypted Outlook token
    google_refresh_token_encrypted VARCHAR, -- Encrypted Gmail token
    access_token_expires_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Emails table
CREATE TABLE emails (
    id UUID PRIMARY KEY,
    email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    message_id VARCHAR UNIQUE,
    author VARCHAR,
    to_recipients VARCHAR,
    subject VARCHAR,
    email_thread_text TEXT,
    email_thread_html TEXT,
    created_at TIMESTAMP
);

-- Delta tokens table (for incremental sync)
CREATE TABLE delta_tokens (
    id INTEGER PRIMARY KEY,
    email_account_id UUID REFERENCES email_accounts(id) NOT NULL,
    folder VARCHAR,  -- 'inbox', 'sent', etc.
    delta_token VARCHAR
);
```

---

## Rewriting sync_outlook Endpoint

### Current Problem

The old `sync_outlook` endpoint:
1. Uses hardcoded credentials from `.env`
2. Creates `DeltaToken` without `email_account_id` (causes integrity error)
3. Doesn't support multiple accounts
4. Doesn't use the new OAuth2 system

### New Design

The new endpoint should:
1. Accept `email_account_id` as parameter
2. Use the stored encrypted refresh token
3. Create proper `DeltaToken` with `email_account_id`
4. Link synced emails to the specific account

### Implementation Guide

#### Step 1: Update the Endpoint Signature

**Old:**
```python
@router.post("/sync_outlook")
async def sync_outlook(db: Session = Depends(get_db)):
    # No account specified!
```

**New:**
```python
@router.post("/sync_outlook/{account_id}")
async def sync_outlook(
    account_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Sync specific account
```

#### Step 2: Get the Email Account

```python
# Verify account exists and belongs to current user
from email_accounts.service import get_email_account

account = get_email_account(db, account_id, current_user.get_uuid())
if not account:
    raise HTTPException(status_code=404, detail="Email account not found")

if account.provider != ProviderEnum.outlook:
    raise HTTPException(status_code=400, detail="Only Outlook accounts supported")
```

#### Step 3: Get Decrypted Refresh Token

```python
from email_accounts.service import get_decrypted_refresh_token

refresh_token = get_decrypted_refresh_token(account)
if not refresh_token:
    raise HTTPException(status_code=400, detail="No refresh token found")
```

#### Step 4: Create OutlookClient with Refresh Token

**Old way (from .env):**
```python
APPLICATION_ID = os.getenv("APPLICATION_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

client = OutlookClient(
    client_id=APPLICATION_ID,
    client_secret=CLIENT_SECRET,
    scopes=SCOPES,
    redirect_uri=REDIRECT_URI,
    tenant_id=TENANT_ID,
)
```

**New way (from database):**
```python
from core.config import settings

# OutlookClient needs to be modified to accept refresh_token directly
# OR you need to create a new method that uses the refresh token

# Option 1: Modify OutlookClient to accept refresh_token
client = OutlookClient(
    client_id=settings.MICROSOFT_CLIENT_ID,
    client_secret=settings.MICROSOFT_CLIENT_SECRET,
    scopes=settings.MICROSOFT_SCOPES,
    redirect_uri=settings.MICROSOFT_REDIRECT_URI,
    tenant_id=settings.MICROSOFT_TENANT_ID,
    refresh_token=refresh_token  # ← Pass the decrypted token
)

# Option 2: Use email_accounts.service.refresh_access_token
from email_accounts.service import refresh_access_token

access_token, new_refresh_token, expires_at = refresh_access_token(
    account.ms_refresh_token_encrypted
)

# Then use access_token directly with Graph API
```

#### Step 5: Load/Create Delta Token with email_account_id

**Old (broken):**
```python
token_row = db.query(DeltaToken).filter(DeltaToken.folder == "inbox").first()
if token_row is None:
    token_row = DeltaToken(folder="inbox", delta_token=None)  # ❌ Missing email_account_id
    db.add(token_row)
    db.commit()
```

**New (fixed):**
```python
from entities.delta_token import DeltaToken

token_row = db.query(DeltaToken).filter(
    DeltaToken.email_account_id == account_id,
    DeltaToken.folder == "inbox"
).first()

if token_row is None:
    token_row = DeltaToken(
        email_account_id=account_id,  # ✅ Include account_id
        folder="inbox",
        delta_token=None
    )
    db.add(token_row)
    db.commit()
    db.refresh(token_row)
```

#### Step 6: Run Delta Sync

```python
def run_delta():
    return client.delta_messages(folder="Inbox", delta_token=token_row.delta_token)

try:
    changes, new_delta = await run_in_threadpool(run_delta)
except Exception as e:
    raise HTTPException(500, f"Delta sync failed: {e}")
```

#### Step 7: Link Emails to Account

**Old:**
```python
# Emails were created without email_account_id
new_email = Email(
    message_id=record["message_id"],
    author=record["from_address"],
    # ... other fields
)
```

**New:**
```python
# Link email to the account
new_email = Email(
    email_account_id=account_id,  # ✅ Link to account
    message_id=record["message_id"],
    author=record["from_address"],
    # ... other fields
)
```

#### Step 8: Update Access Token if Needed

```python
# If access token is expired, refresh it
if account.access_token_expires_at and account.access_token_expires_at < datetime.now(timezone.utc):
    from email_accounts.service import refresh_access_token
    
    access_token, new_refresh_token, new_expires_at = refresh_access_token(
        account.ms_refresh_token_encrypted
    )
    
    # Update account with new expiration
    account.access_token_expires_at = new_expires_at
    
    # If Microsoft returned a new refresh token, update it
    if new_refresh_token:
        from email_accounts.service import encrypt_token
        account.ms_refresh_token_encrypted = encrypt_token(new_refresh_token)
    
    db.commit()
```

### Complete New Endpoint Structure

```python
@router.post("/sync_outlook/{account_id}")
async def sync_outlook(
    account_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Sync emails from a specific Outlook account using delta sync.
    
    Args:
        account_id: UUID of the email account to sync
        current_user: Authenticated user (from JWT)
        db: Database session
    
    Returns:
        Sync statistics (inserted, updated, deleted counts)
    """
    
    # 1. Get and verify email account
    account = get_email_account(db, account_id, current_user.get_uuid())
    if not account:
        raise HTTPException(404, "Email account not found")
    if account.provider != ProviderEnum.outlook:
        raise HTTPException(400, "Only Outlook accounts supported")
    
    # 2. Get decrypted refresh token
    refresh_token = get_decrypted_refresh_token(account)
    if not refresh_token:
        raise HTTPException(400, "No refresh token found")
    
    # 3. Check if access token needs refresh
    if account.access_token_expires_at and account.access_token_expires_at < datetime.now(timezone.utc):
        access_token, new_refresh_token, new_expires_at = refresh_access_token(
            account.ms_refresh_token_encrypted
        )
        account.access_token_expires_at = new_expires_at
        if new_refresh_token:
            account.ms_refresh_token_encrypted = encrypt_token(new_refresh_token)
        db.commit()
    
    # 4. Create OutlookClient with refresh token
    client = OutlookClient(
        client_id=settings.MICROSOFT_CLIENT_ID,
        client_secret=settings.MICROSOFT_CLIENT_SECRET,
        scopes=settings.MICROSOFT_SCOPES,
        redirect_uri=settings.MICROSOFT_REDIRECT_URI,
        tenant_id=settings.MICROSOFT_TENANT_ID,
        refresh_token=refresh_token
    )
    
    # 5. Load or create delta token
    token_row = db.query(DeltaToken).filter(
        DeltaToken.email_account_id == account_id,
        DeltaToken.folder == "inbox"
    ).first()
    
    if token_row is None:
        token_row = DeltaToken(
            email_account_id=account_id,
            folder="inbox",
            delta_token=None
        )
        db.add(token_row)
        db.commit()
        db.refresh(token_row)
    
    # 6. Run delta sync
    def run_delta():
        return client.delta_messages(folder="Inbox", delta_token=token_row.delta_token)
    
    try:
        changes, new_delta = await run_in_threadpool(run_delta)
    except Exception as e:
        raise HTTPException(500, f"Delta sync failed: {e}")
    
    # 7. Process changes
    inserted = 0
    updated = 0
    deleted_ids = []
    
    for item in changes:
        if "@removed" in item:
            deleted_ids.append(item["id"])
            continue
        
        received_str = item.get("receivedDateTime")
        received_dt = parser.isoparse(received_str) if received_str else None
        item["received_at"] = received_dt
        
        # Check if email exists
        existing = db.query(Email).filter(Email.message_id == item["id"]).first()
        if existing:
            updated += 1
        else:
            inserted += 1
        
        # Upsert with email_account_id
        upsert_email(db, item, email_account_id=account_id)  # ← Pass account_id
    
    # 8. Delete removed emails
    deleted = bulk_delete_by_ids(db, deleted_ids) if deleted_ids else 0
    
    # 9. Update delta token
    if new_delta:
        token_row.delta_token = new_delta
    
    # 10. Commit all changes
    db.commit()
    
    return {
        "status": "ok",
        "account_id": str(account_id),
        "email_address": account.email_address,
        "inserted": inserted,
        "updated": updated,
        "deleted": deleted,
        "new_delta_token_saved": bool(new_delta),
    }
```

### Frontend Integration

Update the sync button to call the new endpoint:

```typescript
// In components/accounts/account-card.tsx
const handleSync = async () => {
  setIsSyncing(true);
  try {
    await emailAccountsClient.syncAccount(account.id);
    onSync();
  } catch (error: any) {
    alert(error.message || 'Failed to sync account');
  } finally {
    setIsSyncing(false);
  }
};
```

The `syncAccount` method already exists in `email-accounts-client.ts`:
```typescript
syncAccount: async (accountId: string): Promise<{ message: string }> => {
  return apiClient<{ message: string }>(`/api/email_accounts/${accountId}/sync`, {
    method: 'POST',
    requiresAuth: true,
  });
}
```

But you need to update the backend router to use the new sync logic!

---

## Summary

### Authentication Flow
1. User registers/logs in → JWT token stored in localStorage
2. Protected routes check for token → redirect to login if missing
3. API calls include token in Authorization header
4. Backend verifies token on each request

### OAuth2 Flow
1. User clicks "Connect Account" → redirects to backend with JWT
2. Backend creates auth URL with state → redirects to Microsoft
3. User authorizes → Microsoft redirects to callback with code
4. Backend exchanges code for tokens → encrypts refresh token → stores in DB
5. Frontend shows success → displays connected account

### Sync Flow (New)
1. User clicks "Sync" on account card
2. Frontend calls `POST /api/email_accounts/{account_id}/sync`
3. Backend gets account, decrypts refresh token
4. Creates OutlookClient, runs delta sync
5. Links emails to account, updates delta token
6. Returns sync statistics

### Key Takeaways
- **JWT tokens** for authentication (stored in localStorage)
- **OAuth2** for email account authorization (no passwords stored)
- **Fernet encryption** for refresh tokens (secure storage)
- **Delta sync** for efficient email syncing (only changes)
- **Account-based architecture** (multiple accounts per user)
