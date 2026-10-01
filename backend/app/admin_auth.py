import hmac
import os
from typing import Optional

from fastapi import Header, HTTPException


def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    expected_token = os.getenv("ADMIN_API_TOKEN")
    if not expected_token:
        raise HTTPException(status_code=503, detail="Admin API is not configured")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, expected_token):
        raise HTTPException(status_code=401, detail="Invalid admin token")