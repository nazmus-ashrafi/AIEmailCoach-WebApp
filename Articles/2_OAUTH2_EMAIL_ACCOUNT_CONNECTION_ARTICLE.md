# OAuth2 Email Account Connection: Securely Integrating Microsoft Outlook

> **A technical deep dive into implementing secure OAuth2 authentication with encrypted token storage**

---

## Introduction

Connecting users' email accounts is the core feature of the AI Email Coach. This article details the implementation of the **OAuth2 Authorization Code Flow** to securely connect Microsoft Outlook accounts. We'll explore how we handle the complex dance between our frontend, backend, and Microsoft's identity servers, while ensuring sensitive tokens are never exposed or stored in plaintext.

We'll cover:
- **The OAuth2 Handshake**: From "Connect" button to success callback
- **Security First**: CSRF protection with `state` and Fernet token encryption
- **Backend Architecture**: Handling callbacks and token exchange
- **Frontend Experience**: Seamless redirection and error handling

---

## System Overview

The connection flow involves three parties:
1. **User's Browser** (Frontend)
2. **Our API Server** (Backend)
3. **Microsoft Identity Platform** (External Provider)

### High-Level Sequence

<p align="center">
  <img src="../Articles/images/2-Outlook-Email-Connection/2-outlookConnection-highLevelSquence-img0.png" alt="Alt text" width="600">
</p>

*Figure 1: High-level sequence diagram of the Email Account Connection Process*

---

## Part 1: Initiating the Flow

### The Frontend Trigger

<p align="center">
  <img src="../Articles/images/2-Outlook-Email-Connection/2-outlookConnection-frontend-img1.png" alt="Alt text" width="1200">
</p>

*Figure 2: Frontend architecture showing the flow from UI component - how the backend route is hit and the token is passed from local storage to the backend*

---

The process begins in `ConnectAccountButton.tsx`. Unlike typical API calls, this triggers a **browser redirection**.

```typescript
// webapp/frontend/components/accounts/connect-account-button.tsx
export function ConnectAccountButton() {
    const handleConnectOutlook = () => {
        const token = tokenManager.get();
        if (!token) return;

        // Redirect to backend to start the dance
        // We pass the JWT token so the backend knows WHO is connecting
        const oauthUrl = `${emailAccountsClient.getOAuthUrl()}?token=${encodeURIComponent(token)}`;
        // Triggers the Backend Route `/api/email_accounts/oauth/authorize`
        window.location.href = oauthUrl;
    };
    // ... Button UI
}
```
### Why Is <span style="color: lightgreen;">encodeURIComponent</span> Used?

`encodeURIComponent` makes the token **URL-safe** before adding it to a query string.

Tokens may contain special characters (`/`, `=`, `&`, `?`, `+`) that can break a URL or be misinterpreted as new parameters. Encoding converts these characters into a safe format so the token is transmitted exactly as intended.

**Example**

Raw token:  
`abc123/=/xyz&role=admin`

Encoded:  
`abc123%2F%3D%2Fxyz%26role%3Dadmin`

**In short:**  
Encoding protects the token and ensures the OAuth server receives the correct value.

---

<p align="center">
  <img src="../Articles/images/2-Outlook-Email-Connection/2-outlookConnection-backendp1-img2.png" alt="Alt text" width="1200">
</p>

*Figure 3: Backend architecture showing Part 1: Building the Authorization URL*

## Backend Part 1: Building the Authorization URL

The backend endpoint `/api/email_accounts/oauth/authorize` does the heavy lifting of preparing the request to Microsoft.

**Key Security Feature: The `state` Parameter**
We don't just send the user to Microsoft; we pack a secure "state" token to prevent Cross-Site Request Forgery (CSRF).

```python
# webapp/backend/email_accounts/service.py
def create_oauth_state(user_id: UUID) -> str:
    """
    Create a secure state parameter.
    Encodes user_id and timestamp for CSRF protection.
    """
    state_data = {
        "user_id": str(user_id),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "nonce": secrets.token_urlsafe(32)
    }
    return json.dumps(state_data)
```

The router then constructs the Microsoft URL and redirects the user:

```python
# webapp/backend/email_accounts/router.py
@router.get("/oauth/authorize")
async def oauth_authorize(token: str, db: Session):
    # 1. Verify the user's JWT
    token_data = verify_token(token)
    user_id = token_data.get_uuid()
    
    # 2. Generate secure state
    state = service.create_oauth_state(user_id)
    
    # 3. Build Microsoft URL
    # https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?...
    auth_url = app.get_authorization_request_url(
        scopes=["User.Read", "Mail.ReadWrite", "Mail.Send"],
        state=state,
        redirect_uri=settings.MICROSOFT_REDIRECT_URI
    )
    
    # 4. Redirect user
    return RedirectResponse(url=auth_url)
```

---

## Backend Part 2: Handling the Callback

<p align="center">
  <img src="../Articles/images/2-Outlook-Email-Connection/2-outlookConnection-backendp2-img3.png" alt="Alt text" width="1800">
</p>    

*Figure 4: Backend architecture showing Part 2: Handling the Callback*

After the user logs in at Microsoft, they are redirected back to our application. This is where the critical exchange happens.

### The Callback Endpoint

The endpoint `/api/email_accounts/oauth/callback` receives the `code` (authorization code) and `state` from Microsoft.

**Step 1: Verify State** \
First, we ensure this is a legitimate response to a request we initiated.

```python
# webapp/backend/email_accounts/service.py
def verify_oauth_state(state: str, max_age_minutes: int = 10) -> Optional[UUID]:
    data = json.loads(state)
    
    # Check expiration
    timestamp = datetime.fromisoformat(data["timestamp"])
    if age > timedelta(minutes=max_age_minutes):
        return None
        
    return UUID(data["user_id"])
```

**Step 2: Exchange Code for Tokens** \
We trade the temporary `code` for long-lived tokens.

```python
# webapp/backend/email_accounts/service.py
def exchange_code_for_tokens(code: str) -> dict:
    app = get_msal_app()
    result = app.acquire_token_by_authorization_code(
        code=code,
        scopes=settings.MICROSOFT_SCOPES,
        redirect_uri=settings.MICROSOFT_REDIRECT_URI
    )
    return result
    # Returns: { "access_token": "...", "refresh_token": "...", ... }
```

**Step 3: Identify the Account** \
We use the new access token to fetch the user's profile from Microsoft Graph (`/me`) to get their email address. This ensures we link the correct email account.

---

## Part 3: Secure Storage (Encryption)

We **never** store tokens in plaintext. If our database were compromised, attackers could access users' emails. Instead, we use **Fernet symmetric encryption**.

### Encryption Service

```python
# webapp/backend/email_accounts/service.py
from cryptography.fernet import Fernet

def encrypt_token(token: str) -> str:
    cipher = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    cipher = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())
    return cipher.decrypt(encrypted_token.encode()).decode()
```

### Database Entity

The `EmailAccount` entity stores the encrypted blob.

```python
# webapp/backend/entities/email_account.py
class EmailAccount(Base):
    # ...
    provider = Column(Enum(ProviderEnum), nullable=False)
    email_address = Column(String, nullable=False)
    
    # 🔒 Encrypted storage
    ms_refresh_token_encrypted = Column(String, nullable=True)
    
    # We don't store access tokens permanently as they expire quickly
    access_token_expires_at = Column(DateTime(timezone=True))
```

---

## Part 4: Frontend Feedback Loop

The backend redirects the browser to the frontend's callback page with a status parameter:
`http://localhost:3000/accounts/oauth-callback?success=true`

The `OAuthCallbackPage` component handles the final UX:

```typescript
// webapp/frontend/app/accounts/oauth-callback/page.tsx
export default function OAuthCallbackPage() {
    const searchParams = useSearchParams();
    
    useEffect(() => {
        if (searchParams.get('success')) {
            setMessage('Account connected successfully!');
            // Auto-redirect to dashboard
            setTimeout(() => router.push('/accounts'), 2000);
        } else {
            setMessage('Connection failed.');
        }
    }, [searchParams]);
    
    // Renders a nice success/error UI card
}
```

---

## Security Checklist

✅ **CSRF Protection**: The `state` parameter binds the request to the user session and ensures the callback is for the request we sent. \
✅ **Encryption at Rest**: Refresh tokens are encrypted using Fernet (AES-128-CBC) before hitting the database. \
✅ **Short-lived Access**: We only hold the access token in memory during the request or for short durations. We rely on the refresh token to get new ones. \
✅ **Scope Minimization**: We only request scopes we need (`Mail.ReadWrite`, `Mail.Send`).

## Common Pitfalls & Solutions

1. **"Invalid State" Error**:
   - *Cause*: User took too long (>10 mins) or browser blocked cookies.
   - *Fix*: Retry the flow. The timestamp in the state ensures requests expire.

2. **Token Encryption Errors**:
   - *Cause*: Changing the `TOKEN_ENCRYPTION_KEY` in `.env`.
   - *Fix*: Once keys are rotated, old tokens become unreadable. Key management is critical.

3. **Redirect URI Mismatch**:
   - *Cause*: The URI in the code doesn't match what's registered in Azure Portal.
   - *Fix*: Ensure `MICROSOFT_REDIRECT_URI` matches exactly in both `.env` and Azure.

---

## Design Strengths & Potential Issues

**Strengths:**
1. ✅ State parameter validation (CSRF protection)
- State contains the user_id and is unique per request
- Even if attacker intercepts the callback URL, the state is tied to attacker's session, not victim's
2. ✅ Error handling throughout using RedirectResponse.
- All failure paths redirect gracefully to frontend
3. ✅ HTTPS required (implicit in OAuth 2.0)
- OAuth 2.0 spec requires HTTPS for redirect URIs
- Microsoft won't allow http:// callbacks in production
- Prevents man-in-the-middle attacks intercepting tokens
4. ✅ Duplicate account checking
- Before saving, we check if the email already exists in the database
- Prevents same email being added twice by same user

**Potential Issues:** (To Be Solved Later)
1. ⚠️ **Synchronous HTTP call**: `httpx.get()` is blocking (should use async `httpx.AsyncClient`)
```python
# Current (BLOCKING):
graph_response = httpx.get(
    "https://graph.microsoft.com/v1.0/me",
    headers=headers,
    timeout=10.0
)
```
The problem:

- The function is async def but uses synchronous httpx.get()
- Blocks the entire event loop for up to 10 seconds
- If 100 users OAuth simultaneously, they wait in queue instead of concurrently (CRITICAL)

2. **Access token not stored**: Only refresh token is saved, so immediate API calls need token refresh
- The access token expires quickly (1 hour)
- We need to refresh it every hour
- This adds complexity to the code (not needed)

3. **State token lifetime**: No visible timeout (should expire in 5-10 minutes)

- If user takes 11 minutes to authorize, they get a cryptic error
- User experience issue:
    - User clicks "Connect Outlook" → goes to Microsoft → takes coffee break → returns → "Invalid state" error
    - Should show: "Session expired. Please try connecting again."
4. **No retry logic**: Microsoft Graph call could fail transiently

The problem:

- Network blip or Microsoft temporary outage = entire OAuth fails
- User has to restart the whole flow

## Conclusion

This flow provides a robust, secure foundation for the Email Coach. By handling the complexity of OAuth2 and encryption in the backend, we keep the frontend simple and the user data safe. This connected account is now ready for **Delta Sync**.
