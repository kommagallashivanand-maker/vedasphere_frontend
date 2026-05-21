import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.database import init_db, AsyncSessionLocal
from app.config import settings
from app.routers import auth, projects, documents, chat


async def seed_admin():
    """Create or sync the admin account from env vars."""
    from app.models.user import User, UserRole
    from app.utils.auth import hash_password

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        existing = result.scalar_one_or_none()
        if existing is None:
            admin = User(
                name=settings.ADMIN_NAME,
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
            )
            db.add(admin)
            await db.commit()
            print(f"[startup] Admin account created: {settings.ADMIN_EMAIL}")
        else:
            # Always sync password and role from env so the DB stays consistent
            existing.password_hash = hash_password(settings.ADMIN_PASSWORD)
            existing.role = UserRole.admin
            existing.name = settings.ADMIN_NAME
            await db.commit()
            print(f"[startup] Admin account synced: {settings.ADMIN_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    await init_db()
    await seed_admin()
    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="Project-Isolated AI Knowledge Assistant",
    description="Enterprise RAG system with per-project document isolation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Knowledge Assistant"}
