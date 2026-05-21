from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/knowledge_assistant"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # AI Provider keys — whichever key is set determines the active provider.
    # If both are set, OpenAI takes priority.
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # Admin seed account
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "changeme-admin-password"
    ADMIN_NAME: str = "Admin"

    @property
    def AI_PROVIDER(self) -> str:
        """Auto-detect provider from whichever API key is present. OpenAI takes priority."""
        if self.OPENAI_API_KEY:
            return "openai"
        if self.GOOGLE_API_KEY:
            return "gemini"
        raise ValueError(
            "No AI provider configured. Set OPENAI_API_KEY or GOOGLE_API_KEY in your .env file."
        )

    class Config:
        env_file = ".env"


settings = Settings()
