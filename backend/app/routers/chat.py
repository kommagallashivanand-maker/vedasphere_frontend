from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.chat import Chat
from app.schemas.chat import ChatRequest, ChatResponse
from app.utils.auth import get_current_user
from app.rag.rag_pipeline import run_rag_query

router = APIRouter(tags=["Chat"])


async def verify_project_access(project_id: int, current_user: User, db: AsyncSession) -> Project:
    """
    Admins can only access their own projects.
    Regular users can access any project (they chat but don't own).
    """
    if current_user.role == "admin":
        condition = (Project.id == project_id) & (Project.created_by == current_user.id)
    else:
        condition = Project.id == project_id

    result = await db.execute(select(Project).where(condition))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/chat/{project_id}", response_model=ChatResponse)
async def chat(
    project_id: int,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_access(project_id, current_user, db)

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Run RAG pipeline - ONLY accesses project's isolated collection
    result = await run_rag_query(project_id=project_id, question=request.question)

    # Save to PostgreSQL
    chat_record = Chat(
        project_id=project_id,
        user_id=current_user.id,
        question=request.question,
        answer=result["answer"],
        sources=result["sources"],
    )
    db.add(chat_record)
    await db.commit()
    await db.refresh(chat_record)

    return chat_record


@router.get("/chat/history/{project_id}", response_model=List[ChatResponse])
async def get_chat_history(
    project_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Chat)
        .where(Chat.project_id == project_id, Chat.user_id == current_user.id)
        .order_by(Chat.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()
