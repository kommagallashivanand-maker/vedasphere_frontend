import os
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.document import Document
from app.rag.document_processor import load_document, split_documents, IMAGE_EXTENSIONS
from app.rag.vector_store import add_documents_to_store

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"} | IMAGE_EXTENSIONS

MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


async def save_upload_file(file: UploadFile, project_id: int) -> tuple[str, int]:
    """Save uploaded file to disk and return (filepath, file_size)."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: PDF, DOCX, DOC, TXT, PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP",
        )

    project_dir = Path(settings.UPLOAD_DIR) / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = Path(file.filename).name
    filepath = project_dir / safe_filename

    # Handle duplicate filenames
    counter = 1
    while filepath.exists():
        stem = Path(safe_filename).stem
        filepath = project_dir / f"{stem}_{counter}{ext}"
        counter += 1

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB",
        )

    async with aiofiles.open(str(filepath), "wb") as f:
        await f.write(content)

    return str(filepath), file_size


async def process_and_index_document(
    filepath: str,
    project_id: int,
    db: AsyncSession,
    filename: str,
    file_size: int,
) -> Document:
    """Extract text/description, chunk, embed, and store in ChromaDB. Save metadata to PostgreSQL."""
    ext = Path(filepath).suffix.lower()

    raw_docs = load_document(filepath)
    chunks = split_documents(raw_docs)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract content from document")

    chunk_count = add_documents_to_store(project_id=project_id, documents=chunks)

    doc = Document(
        project_id=project_id,
        filename=filename,
        filepath=filepath,
        file_type=ext.lstrip("."),
        file_size=file_size,
        chunk_count=chunk_count,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def get_project_documents(project_id: int, db: AsyncSession):
    result = await db.execute(
        select(Document).where(Document.project_id == project_id).order_by(Document.uploaded_at.desc())
    )
    return result.scalars().all()
