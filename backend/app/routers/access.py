from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.project_access import ProjectAccess
from app.models.group import Group, GroupMember
from app.schemas.access import (
    AccessGrantRequest, AccessGroupGrantRequest,
    AccessUserResponse, UserListResponse,
)
from app.utils.auth import get_admin_user

# Separate prefixes to avoid clashing with /projects/{project_id}
users_router = APIRouter(prefix="/users", tags=["Access Management"])
access_router = APIRouter(prefix="/access", tags=["Access Management"])


async def get_owned_project(project_id: int, admin: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.created_by == admin.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ── GET /users — list all regular users (for the grant dropdown) ──────────────

@users_router.get("", response_model=List[UserListResponse])
async def list_users(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all regular users so admin can pick who to grant access to."""
    result = await db.execute(
        select(User).where(User.role == UserRole.user).order_by(User.name)
    )
    return result.scalars().all()


# ── GET /access/{project_id} — list users who have access ────────────────────

@access_router.get("/{project_id}", response_model=List[AccessUserResponse])
async def list_project_access(
    project_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_project(project_id, current_user, db)

    result = await db.execute(
        select(ProjectAccess, User)
        .join(User, ProjectAccess.user_id == User.id)
        .where(ProjectAccess.project_id == project_id)
        .order_by(User.name)
    )
    rows = result.all()
    return [
        AccessUserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            granted_at=access.granted_at,
        )
        for access, user in rows
    ]


# ── POST /access/{project_id} — grant access ─────────────────────────────────

@access_router.post("/{project_id}", status_code=status.HTTP_201_CREATED)
async def grant_access(
    project_id: int,
    body: AccessGrantRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_project(project_id, current_user, db)

    result = await db.execute(select(User).where(User.id == body.user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role != UserRole.user:
        raise HTTPException(status_code=400, detail="Can only grant access to regular users")

    existing = await db.execute(
        select(ProjectAccess).where(
            ProjectAccess.project_id == project_id,
            ProjectAccess.user_id == body.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already has access")

    grant = ProjectAccess(project_id=project_id, user_id=body.user_id)
    db.add(grant)
    await db.commit()
    return {"detail": f"Access granted to {target.name}"}


# ── DELETE /access/{project_id}/{user_id} — revoke access ────────────────────

@access_router.delete("/{project_id}/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_access(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_project(project_id, current_user, db)

    result = await db.execute(
        select(ProjectAccess).where(
            ProjectAccess.project_id == project_id,
            ProjectAccess.user_id == user_id,
        )
    )
    grant = result.scalar_one_or_none()
    if not grant:
        raise HTTPException(status_code=404, detail="Access record not found")

    await db.delete(grant)
    await db.commit()


# ── POST /access/{project_id}/group — grant entire group access ───────────────

@access_router.post("/{project_id}/group", status_code=status.HTTP_201_CREATED)
async def grant_group_access(
    project_id: int,
    body: AccessGroupGrantRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_project(project_id, current_user, db)

    # Verify group exists and belongs to this admin
    result = await db.execute(
        select(Group).where(Group.id == body.group_id, Group.created_by == current_user.id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get all members of the group
    result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == body.group_id)
    )
    members = result.scalars().all()

    if not members:
        raise HTTPException(status_code=400, detail="Group has no members")

    granted = 0
    skipped = 0
    for member in members:
        existing = await db.execute(
            select(ProjectAccess).where(
                ProjectAccess.project_id == project_id,
                ProjectAccess.user_id == member.user_id,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue
        db.add(ProjectAccess(project_id=project_id, user_id=member.user_id))
        granted += 1

    await db.commit()
    return {
        "detail": f"Access granted to {granted} member(s) from '{group.name}'. {skipped} already had access."
    }
