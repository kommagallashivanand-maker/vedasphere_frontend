from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.document import DocumentResponse
from app.utils.auth import get_current_user, get_admin_user
from app.services.document_service import (
    save_upload_file,
    process_and_index_document,
    get_project_documents,
)

router = APIRouter(tags=["Documents"])


async def verify_project_exists(project_id: int, db: AsyncSession) -> Project:
    """Verify a project exists (no ownership check — used for read access)."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def verify_project_owned_by_admin(project_id: int, admin: User, db: AsyncSession) -> Project:
    """Verify project exists and is owned by the given admin."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.created_by == admin.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ── Admin-only: upload documents ──────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owned_by_admin(project_id, current_user, db)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filepath, file_size = await save_upload_file(file, project_id)

    try:
        doc = await process_and_index_document(
            filepath=filepath,
            project_id=project_id,
            db=db,
            filename=file.filename,
            file_size=file_size,
        )
    except Exception as e:
        import os
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    return doc


# ── All authenticated users: list documents ───────────────────────────────────

@router.get("/projects/{project_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_exists(project_id, db)
    docs = await get_project_documents(project_id, db)
    return docs
