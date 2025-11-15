"""
webapp/backend/core/outlook.py

Outlook / Microsoft Graph simple MVP client v0 (solo developer positioning).

Features:
- generate_initial_refresh_token()  -> manual one-time flow to get and store refresh token
- _acquire_token()                  -> uses stored refresh token to get an access token
- fetch_messages(...)               -> fetches messages (handles paging via @odata.nextLink)
- reply_to_message(...)             -> helper to create a reply draft and send it

Notes:
- This is intentionally single-user, storing a refresh token in a file.
  For multi-user, you must store tokens per user (secure DB, encrypted).
- generate_initial_refresh_token() will open your browser and prompt for the auth code.
  Run it once locally to populate the refresh token file.
"""

from __future__ import annotations
import os
import json
import logging
import webbrowser
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

import msal
import httpx
from dotenv import load_dotenv
from bs4 import BeautifulSoup


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

## Microsoft Graph - API Base Endpoint
MS_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

# Default token file location (project-root relative). 
DEFAULT_TOKEN_DIR = Path(__file__).resolve().parents[2] / ".tokens"
DEFAULT_TOKEN_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_REFRESH_TOKEN_FILE = DEFAULT_TOKEN_DIR / "ms_refresh_token.txt"


class OutlookClient:
    """
    Minimal Outlook/Microsoft Graph client for a single-user MVP.
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        scopes: List[str],
        redirect_uri: str = "https://localhost:8000",  # used only for initial auth code flow
        tenant_id: Optional[str] = None, ## consumers, common
        refresh_token_file: Path | str = DEFAULT_REFRESH_TOKEN_FILE,
    ):
        """
        Args:
            client_id: Azure App registration (Application (client) ID)
            client_secret: Client secret value (from Certificates & secrets)
            scopes: list of scopes, e.g. ["User.Read", "Mail.ReadWrite", "Mail.Send"]
            redirect_uri: URI set in Azure app registration; used in initial auth code flow
            tenant_id: optional tenant (useful for org accounts). If None uses 'common' authority.
            refresh_token_file: path to store the refresh token (single-user)
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.scopes = scopes
        self.redirect_uri = redirect_uri
        self.tenant_id = tenant_id or "common"
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.refresh_token_file = Path(refresh_token_file)

        ###   Creates an MSAL (Microsoft Authentication Library) client
        # client_id: Your app's ID from Azure Portal
        # client_secret: Secret key from Azure (proves your app is legitimate)
        # authority: Microsoft's login server for personal accounts (Outlook.com, Live.com)
        #     - Use /consumers/ for personal Microsoft accounts
        #     - Use /organizations/ for work/school accounts
        #     - Use /common/ for both

        # MSAL client (confidential client)
        self.app = msal.ConfidentialClientApplication(
            client_id=self.client_id,
            # client_capabilities=client_secret,
            client_credential=self.client_secret,
            authority=self.authority,
        )

    # ---------------------------
    # Token helpers
    # ---------------------------
    def _read_refresh_token(self) -> Optional[str]:
        if self.refresh_token_file.exists():
            token = self.refresh_token_file.read_text().strip()
            if token:
                return token
        return None

    def _write_refresh_token(self, refresh_token: str) -> None:
        # Make sure parent exists
        self.refresh_token_file.parent.mkdir(parents=True, exist_ok=True)
        self.refresh_token_file.write_text(refresh_token)
        logger.info("Wrote refresh token to %s", self.refresh_token_file)

    def generate_initial_refresh_token(self) -> None:
        """
        Manual one-time flow:
        - Builds authorization URL and opens it in your browser
        - You sign in and consent, then you will receive an authorization code
        - Paste the authorization code into the terminal prompt
        - This exchanges the authorization code for tokens and saves the refresh token to disk

        Run this ONCE locally. After this, the client will use the saved refresh token
        to obtain access tokens programmatically.
        """
        auth_url = self.app.get_authorization_request_url(
            scopes=self.scopes, redirect_uri=self.redirect_uri
        )

        logger.info("Opening your browser to visit the Microsoft login page...")
        webbrowser.open(auth_url)
        print("If the browser doesn't open, visit this URL and sign in:\n", auth_url)
        code = input("After signing in and consenting, paste the authorization code here: ").strip()
        if not code:
            raise ValueError("Authorization code is required for initial token exchange.")

        token_response = self.app.acquire_token_by_authorization_code(
            code=code,
            scopes=self.scopes,
            redirect_uri=self.redirect_uri,
        )
        if "access_token" in token_response:
            refresh_token = token_response.get("refresh_token")
            if refresh_token:
                self._write_refresh_token(refresh_token)
                logger.info("Initial refresh token stored. You can now use the client without interactive login.")
            else:
                logger.warning("No refresh token was returned in the response; interactive flow may be required later.")
        else:
            raise RuntimeError(f"Failed to get tokens: {token_response}")

    def _acquire_token(self) -> str:
        """
        Acquire an access token using the stored refresh token.

        Returns:
            access_token (str)

        Raises:
            RuntimeError if token acquisition failed (no token saved or refresh failed).
        """
        refresh_token = self._read_refresh_token()
        if not refresh_token:
            raise RuntimeError(
                "No refresh token found. Run generate_initial_refresh_token() once to produce one."
            )

        # Attempt to acquire token using refresh token
        result = self.app.acquire_token_by_refresh_token(refresh_token, scopes=self.scopes)
        if "access_token" in result:
            # save any new refresh_token MS may have returned
            if "refresh_token" in result:
                try:
                    self._write_refresh_token(result["refresh_token"])
                except Exception:
                    logger.exception("Failed to persist refreshed refresh_token")
            return result["access_token"]

        # If acquire_token_by_refresh_token failed, provide debug info
        logger.error("Token acquisition failed: %s", result)
        raise RuntimeError("Failed to acquire access token using refresh token. " f"Details: {result}")

    # ---------------------------
    # Graph API helpers
    # ---------------------------
    def _default_headers(self) -> Dict[str, str]:
        token = self._acquire_token()
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    def fetch_messages(
        self,
        top: int = 25,
        select: Optional[List[str]] = None,
        filter_q: Optional[str] = None,
        folder: str = "Inbox",
        orderby: str = "receivedDateTime desc",
        max_pages: int = 10,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Fetch messages from the user's mailbox with paging.

        Yields individual message dicts as returned by Graph.

        Args:
            top: number of items per page
            select: list of fields to select (e.g. ["subject","from","isRead"])
            filter_q: OData filter string
            folder: mailbox folder (Inbox, SentItems, etc). Uses /me/mailFolders/{folder}/messages
            orderby: OData orderby
            max_pages: safety cap on pages to fetch

        Usage:
            client = OutlookClient(...)
            for msg in client.fetch_messages(top=50, select=["subject","from"]):
                ...
        """
        headers = self._default_headers()
        select_clause = ",".join(select) if select else None

        # Use the mailFolder-specific endpoint to be explicit
        endpoint = f"{MS_GRAPH_BASE_URL}/me/mailFolders/{folder}/messages"
        params: Dict[str, Any] = {"$top": top, "$orderby": orderby}
        if select_clause:
            params["$select"] = select_clause
        if filter_q:
            params["$filter"] = filter_q

        client = httpx.Client(timeout=30.0)

        next_url: Optional[str] = None
        page_count = 0

        try:
            while True:
                if next_url:
                    resp = client.get(next_url, headers=headers)
                else:
                    resp = client.get(endpoint, headers=headers, params=params)

                if resp.status_code != 200:
                    raise httpx.HTTPStatusError(f"Graph API error: {resp.text}", request=resp.request, response=resp)

                body = resp.json()
                for msg in body.get("value", []):
                    yield msg

                next_url = body.get("@odata.nextLink")
                page_count += 1
                if not next_url or page_count >= max_pages:
                    break
        finally:
            client.close()

    def reply_to_message(self, message_id: str, body_text: str, to_recipients: Optional[List[Dict[str, str]]] = None) -> None:
        """
        Create a reply draft to 'message_id', set the message body, then send it.

        Args:
            message_id: original message id
            body_text: plain-text or HTML body. If HTML, wrap accordingly in contentType
            to_recipients: optional explicit recipients (list of {'emailAddress': {'address': '...'}})
        """
        headers = self._default_headers()
        client = httpx.Client(timeout=30.0)

        # Step 1: createReply => returns a message (draft) object
        create_reply_url = f"{MS_GRAPH_BASE_URL}/me/messages/{message_id}/createReply"
        resp = client.post(create_reply_url, headers=headers)
        if resp.status_code not in (200, 201):
            client.close()
            raise httpx.HTTPStatusError(f"Failed to create reply: {resp.text}", request=resp.request, response=resp)

        draft = resp.json()
        draft_id = draft.get("id")
        if not draft_id:
            client.close()
            raise RuntimeError("createReply did not return a draft id")

        # Step 2: update the draft body (and optionally recipients)
        update_url = f"{MS_GRAPH_BASE_URL}/me/messages/{draft_id}"
        body_payload = {
            "body": {"contentType": "Text", "content": body_text}
        }
        if to_recipients:
            body_payload["toRecipients"] = to_recipients

        resp = client.patch(update_url, headers={**headers, "Content-Type": "application/json"}, json=body_payload)
        if resp.status_code not in (200, 204):
            client.close()
            raise httpx.HTTPStatusError(f"Failed to update draft: {resp.text}", request=resp.request, response=resp)

        # Step 3: send the draft
        send_url = f"{MS_GRAPH_BASE_URL}/me/messages/{draft_id}/send"
        resp = client.post(send_url, headers=headers)
        client.close()
        if resp.status_code not in (200, 202):
            raise httpx.HTTPStatusError(f"Failed to send reply: {resp.text}", request=resp.request, response=resp)

        logger.info("Reply sent successfully for message_id=%s", message_id)


# ---------------------------
# Convenience function to build Email-like record
# ---------------------------


# def transform_graph_message_to_email_record(msg: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Convert a Graph message payload into a simpler dict consistent with your Email DB model.
#     Modify this mapping to match your SQLAlchemy Email model fields.
#     """
#     sender = msg.get("from", {}).get("emailAddress", {})
#     to_recipients = [r.get("emailAddress", {}) for r in msg.get("toRecipients", [])]

#     return {
#         "message_id": msg.get("id"),
#         "subject": msg.get("subject"),
#         "body_preview": msg.get("bodyPreview"),
#         "body_content_type": msg.get("body", {}).get("contentType"),
#         "body_content": msg.get("body", {}).get("content"),
#         "from_name": sender.get("name"),
#         "from_address": sender.get("address"),
#         "to_recipients": json.dumps(to_recipients),
#         "is_read": msg.get("isRead", False),
#         "is_draft": msg.get("isDraft", False),
#         "received_datetime": msg.get("receivedDateTime"),
#         "sent_datetime": msg.get("sentDateTime"),
#         # add more mappings as needed
#     }

## Helper
def html_to_text(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator="\n").strip()


def transform_graph_message_to_email_record(msg: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a Microsoft Graph email payload into a normalized structure
    matching the SQLAlchemy Email model fields.
    """

    # Extract sender & recipients
    sender = msg.get("from", {}).get("emailAddress", {})
    to_recipients = [
        r.get("emailAddress", {})
        for r in msg.get("toRecipients", [])
    ]

    # HTML body from Outlook payload
    full_html: str = msg.get("body", {}).get("content") or ""
    clean_text: str = html_to_text(full_html)

    return {
        "message_id": msg.get("id"),
        "subject": msg.get("subject") or "(No subject)",

        # Store both text + HTML versions
        "body_html": full_html, ## Raw HTML for full viewer
        "body_text": clean_text, ## Clean text for LLM + preview

        "body_preview": msg.get("bodyPreview") or "",

        # Sender
        "from_name": sender.get("name"),
        "from_address": sender.get("address"),

        # JSON list of emails [{"name": "...", "address": "..."}]
        "to_recipients": json.dumps(to_recipients),

        # Flags
        "is_read": msg.get("isRead", False),
        "is_draft": msg.get("isDraft", False),

        # Datetimes
        "received_datetime": msg.get("receivedDateTime"),
        "sent_datetime": msg.get("sentDateTime"),
    }


# ---------------------------
# Example / quick test runner (manual usage)
# ---------------------------
if __name__ == "__main__":
    """
    Typical manual flow for a solo dev:
    1) Run this file once to generate initial refresh token:
         python webapp/backend/core/outlook.py
       Follow the prompts, that stores the refresh token in .tokens/ms_refresh_token.txt
    2) From your FastAPI code, create an OutlookClient instance and call fetch_messages()
    """
    load_dotenv()
    APPLICATION_ID = os.getenv("APPLICATION_ID")
    CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    TENANT_ID = os.getenv("TENANT_ID")  # optional
    REDIRECT_URI = os.getenv("REDIRECT_URI") or "https://localhost:8000"
    SCOPES = ["User.Read", "Mail.ReadWrite", "Mail.Send"]

    if not APPLICATION_ID or not CLIENT_SECRET:
        raise SystemExit("Set APPLICATION_ID and CLIENT_SECRET in your environment (.env) before running.")

    client = OutlookClient(
        client_id=APPLICATION_ID,
        client_secret=CLIENT_SECRET,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        tenant_id=TENANT_ID,
    )

    print("Run '1' to generate initial refresh token (one-time).")
    print("Run '2' to fetch the most recent 5 messages.")
    mode = input("Choose (1/2): ").strip()

    if mode == "1":
        client.generate_initial_refresh_token()
    elif mode == "2":
        # Example usage once the refresh token exists
        try:
            i = 0
            for m in client.fetch_messages(top=5, select=["subject", "from", "isRead", "receivedDateTime"]):
                i += 1
                print(f"{i}) {m.get('subject')} - from: {m.get('from')}")
                if i >= 5:
                    break
        except Exception as exc:
            logger.exception("Failed to fetch messages: %s", exc)
    else:
        print("No action taken.")