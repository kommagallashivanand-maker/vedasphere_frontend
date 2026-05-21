from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupMemberResponse(BaseModel):
    id: int
    name: str
    email: str
    job_title: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    created_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True


class GroupDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    created_at: datetime
    members: List[GroupMemberResponse] = []

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: int
