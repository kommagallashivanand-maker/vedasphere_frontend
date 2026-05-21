from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AccessGrantRequest(BaseModel):
    user_id: int


class AccessGroupGrantRequest(BaseModel):
    group_id: int


class AccessUserResponse(BaseModel):
    id: int
    name: str
    email: str
    granted_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    id: int
    name: str
    email: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True
