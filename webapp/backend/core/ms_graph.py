"""
Has the function that can:
- generate an access token 
- use access token to connect to MS graph api
"""

import os
import webbrowser
import msal
from dotenv import load_dotenv

## Microsoft Graph API Based Endpoint
MS_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

## Function handles:
# - Authentication Process
# - Returns Access token to connect to MS graph API

def get_access_token(application_id, client_secret, scopes):

###   Creates an MSAL (Microsoft Authentication Library) client
        # client_id: Your app's ID from Azure Portal
        # client_secret: Secret key from Azure (proves your app is legitimate)
        # authority: Microsoft's login server for personal accounts (Outlook.com, Live.com)
        #     - Use /consumers/ for personal Microsoft accounts
        #     - Use /organizations/ for work/school accounts
        #     - Use /common/ for both
    client = msal.ConfidentialClientApplication(
        client_id=application_id,
        # client_capabilities=client_secret,
        client_credential=client_secret, 
        authority='https://login.microsoftonline.com/consumers/'
    )


    ## If we have a saved refresh token, exchange it for a new access token
    # Check if there is a refresh token stored
    refresh_token = None
    if os.path.exists('refresh_token.txt'):
        with open('refresh_token.txt', 'r') as file:
            refresh_token = file.read().strip()

    if refresh_token:
        # Try to acquire a new access token using the refresh token
        token_response = client.acquire_token_by_refresh_token(refresh_token, scopes=scopes)
    else:
        # No refresh token, proceed with the authorization code flow

        # 1. Get authorization URL = Creates a Microsoft login URL with your app's details
        auth_request_url = client.get_authorization_request_url(scopes)
        # 2. Open browser for user to log in = Browser opens → user signs into Microsoft → consents to permissions
        webbrowser.open(auth_request_url)
        # 3. User logs in, consents, gets redirected with a "code"
        authorization_code = input('Enter the authorization code: ')
        
        if not authorization_code:
            raise ValueError("Authorization code is empty")
        
        ## 4. Exchange authorization code for tokens
        # App sends the code to Microsoft and gets back:
        #     - **Access Token** (to call Outlook API)
        #     - **Refresh Token** (to get new access tokens later)
        token_response = client.acquire_token_by_authorization_code(
            code=authorization_code,
            scopes=scopes
        )

    # Checks if Microsoft successfully returned an access token
    if 'access_token' in token_response:
        ## Store the refresh token securely (if present)
        if 'refresh_token' in token_response:
            with open('refresh_token.txt', 'w') as file:
                file.write(token_response['refresh_token'])
        ## Returns access token for immediate use
        return token_response['access_token']
    else:
        ## Something went wrong (e.g., invalid credentials, expired refresh token)
        raise Exception('Failed to acquire token: ' + str(token_response))

def main():
    load_dotenv()
    APPLICATION_ID = os.getenv('APPLICATION_ID')
    CLIENT_SECRET = os.getenv('CLIENT_SECRET')

    # What each scope does:
        # User.Read: Read basic user profile info
        # Mail.ReadWrite: Read and modify emails
        # Mail.Send: Send emails on behalf of the user
    # These are the permissions the user will see when they consent during the OAuth flow.
    SCOPES = ['User.Read', 'Mail.ReadWrite', 'Mail.Send']

    try:
        ## Returns a JWT string access token 
        access_token = get_access_token(application_id=APPLICATION_ID, client_secret=CLIENT_SECRET, scopes=SCOPES)
        ## Creating the HTTP Authorization header needed to authenticate API requests
        header = {
            'Authorization': 'Bearer ' + access_token
        }
        print(header)
    except Exception as e:
        print(f'Error: {e}')

main()