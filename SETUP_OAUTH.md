# IMPORTANT: Add Encryption Key to .env

Please add the following line to your `.env` file:

```bash
# Token Encryption Key (for encrypting refresh tokens in database)
TOKEN_ENCRYPTION_KEY=Z-4qwj4Fi6iI2PDkCit3NF-fUk5ztW8V9useqr8rLbE=
```

This key was generated using:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Location**: `/Users/nazmus/Documents/code/ai_email_coach/.env`

**Why needed**: This key is used to encrypt Microsoft refresh tokens before storing them in the database for security.

---

## Testing the OAuth2 Flow

Once you've added the key, you can test the complete flow:

1. **Start backend** (if not running):
   ```bash
   cd webapp/backend
   uv run main.py
   ```

2. **Frontend is already running** at `http://localhost:3000`

3. **Test flow**:
   - Login to the app
   - You'll be redirected to `/accounts` (new default landing page)
   - Click "Connect Outlook Account"
   - You'll be redirected to Microsoft login
   - After authorizing, you'll be redirected back with the account connected

4. **Verify in database**:
   - Check `email_accounts` table
   - `ms_refresh_token_encrypted` should contain encrypted token
   - `email_address` should show your Microsoft email

---

## Azure Redirect URI Update

**IMPORTANT**: You need to update your Azure app registration redirect URI:

Current: `https://localhost:8000`
New: `http://localhost:8000/api/email_accounts/oauth/callback`

Steps:
1. Go to Azure Portal → App Registrations
2. Select your app
3. Go to "Authentication"
4. Under "Redirect URIs", add: `http://localhost:8000/api/email_accounts/oauth/callback`
5. Save

Note: You can keep the old redirect URI for backward compatibility with the manual token generation flow.
