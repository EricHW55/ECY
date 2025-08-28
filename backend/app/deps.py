from typing import Optional
from fastapi import Header, HTTPException, Depends
from .settings import settings
from .database import get_session

def admin_guard(x_admin_code: Optional[str] = Header(default=None)):
    if settings.ADMIN_CODE and x_admin_code != settings.ADMIN_CODE:
        raise HTTPException(401, "관리자 코드가 필요합니다.")
    return True

# 세션 DI 재노출(가독성용)
DbSession = get_session
