from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.group import Group, GroupMember
from app.schemas.group import (
    GroupCreate, GroupResponse, GroupDetailResponse,
    GroupMemberResponse, AddMemberRequest,
)
from app.utils.auth import get_admin_user

router = APIRouter(prefix="/groups", tags=["Groups"])


async def get_owned_group(group_id: int, admin: User, db: AsyncSession) -> Group:
    result = await db.execute(
        select(Group).where(Group.id == group_id, Group.created_by == admin.id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


# ── List all groups (admin sees all their groups) ─────────────────────────────

@router.get("", response_model=List[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Group).where(Group.created_by == current_user.id).order_by(Group.created_at.desc())
    )
    groups = result.scalars().all()

    response = []
    for group in groups:
        count = await db.scalar(
            select(func.count(GroupMember.id)).where(GroupMember.group_id == group.id)
        )
        response.append(GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_by=group.created_by,
            created_at=group.created_at,
            member_count=count or 0,
        ))
    return response


# ── Get group detail with members ─────────────────────────────────────────────

@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    group = await get_owned_group(group_id, current_user, db)

    result = await db.execute(
        select(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group_id)
        .order_by(User.name)
    )
    members = result.scalars().all()

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        created_at=group.created_at,
        members=[
            GroupMemberResponse(
                id=m.id, name=m.name, email=m.email,
                job_title=m.job_title, department=m.department,
            )
            for m in members
        ],
    )


# ── Create group ──────────────────────────────────────────────────────────────

@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    group = Group(name=data.name, description=data.description, created_by=current_user.id)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return GroupResponse(
        id=group.id, name=group.name, description=group.description,
        created_by=group.created_by, created_at=group.created_at, member_count=0,
    )


# ── Delete group ──────────────────────────────────────────────────────────────

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    group = await get_owned_group(group_id, current_user, db)
    await db.delete(group)
    await db.commit()


# ── Add member to group ───────────────────────────────────────────────────────

@router.post("/{group_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member(
    group_id: int,
    body: AddMemberRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_group(group_id, current_user, db)

    result = await db.execute(select(User).where(User.id == body.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.user:
        raise HTTPException(status_code=400, detail="Can only add regular users to groups")

    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == body.user_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already in this group")

    db.add(GroupMember(group_id=group_id, user_id=body.user_id))
    await db.commit()
    return {"detail": f"{user.name} added to group"}


# ── Remove member from group ──────────────────────────────────────────────────

@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_group(group_id, current_user, db)

    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == user_id
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in group")

    await db.delete(member)
    await db.commit()
