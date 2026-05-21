from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.document import Document
from app.models.chat import Chat
from app.schemas.project import ProjectCreate, ProjectResponse
from app.utils.auth import get_current_user, get_admin_user
from app.rag.vector_store import delete_project_collection

router = APIRouter(prefix="/projects", tags=["Projects"])


async def _build_project_response(project: Project, db: AsyncSession) -> ProjectResponse:
    doc_count = await db.scalar(
        select(func.count(Document.id)).where(Document.project_id == project.id)
    )
    chat_count = await db.scalar(
        select(func.count(Chat.id)).where(Chat.project_id == project.id)
    )
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_by=project.created_by,
        created_at=project.created_at,
        document_count=doc_count or 0,
        chat_count=chat_count or 0,
    )


# ── All authenticated users can list & view projects ──────────────────────────

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admins see only their own projects.
    Regular users see all projects (so they can access the chat).
    """
    if current_user.role == "admin":
        query = select(Project).where(Project.created_by == current_user.id)
    else:
        query = select(Project)

    result = await db.execute(query.order_by(Project.created_at.desc()))
    projects = result.scalars().all()

    return [await _build_project_response(p, db) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admins can only fetch their own projects.
    Regular users can fetch any project (needed to open chat).
    """
    if current_user.role == "admin":
        condition = (Project.id == project_id) & (Project.created_by == current_user.id)
    else:
        condition = Project.id == project_id

    result = await db.execute(select(Project).where(condition))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return await _build_project_response(project, db)


# ── Admin-only: create / delete ───────────────────────────────────────────────

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        name=project_data.name,
        description=project_data.description,
        created_by=current_user.id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_by=project.created_by,
        created_at=project.created_at,
        document_count=0,
        chat_count=0,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.created_by == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    delete_project_collection(project_id)
    await db.delete(project)
    await db.commit()
