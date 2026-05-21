# Project-Isolated VedaSphere

An enterprise-grade RAG (Retrieval-Augmented Generation) system where each project has completely isolated documents, vector embeddings, and chat history.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Login · Register · Dashboard · Project · Chat          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / REST
┌────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend                          │
│  /auth  /projects  /documents  /chat                    │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│    PostgreSQL        │   │  ChromaDB (per-project)      │
│  users, projects,   │   │  collection_project_1        │
│  documents, chats   │   │  collection_project_2  ...   │
└─────────────────────┘   └─────────────────────────────┘
```

## Project Isolation

Each project gets its own ChromaDB collection named `collection_project_<id>`. The RAG pipeline **only** queries the collection for the selected project — cross-project data access is architecturally impossible.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Axios, React Router |
| Backend | FastAPI, LangChain, SQLAlchemy (async) |
| Auth | JWT (python-jose + bcrypt) |
| Vector DB | ChromaDB (persistent) |
| Relational DB | PostgreSQL |
| AI | OpenAI GPT-4o-mini or Google Gemini 1.5 Flash |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

---

## Backend Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL connection
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/knowledge_assistant

# JWT secret (generate a strong random string)
SECRET_KEY=your-super-secret-key-here

# Choose "openai" or "gemini"
AI_PROVIDER=openai

# If using OpenAI
OPENAI_API_KEY=sk-...

# If using Gemini
GOOGLE_API_KEY=AIza...
```

### 4. Create PostgreSQL database

```sql
CREATE DATABASE knowledge_assistant;
```

### 5. Run the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Run the frontend

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Usage

1. **Register** an account at `/register`
2. **Create a project** from the dashboard
3. **Upload documents** (PDF, DOCX, TXT) to the project
4. **Open Chat** and ask questions — the AI answers only from that project's documents
5. **Sources** are shown below each answer with relevance scores

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user info |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List user's projects |
| POST | `/projects` | Create project |
| GET | `/projects/{id}` | Get project details |
| DELETE | `/projects/{id}` | Delete project + all data |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{id}/upload` | Upload & index document |
| GET | `/projects/{id}/documents` | List project documents |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/{project_id}` | Ask a question (RAG) |
| GET | `/chat/history/{project_id}` | Get chat history |

---

## Folder Structure

```
Chat System/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   └── chat.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── documents.py
│   │   │   └── chat.py
│   │   ├── services/            # Business logic
│   │   │   └── document_service.py
│   │   ├── rag/                 # LangChain RAG pipeline
│   │   │   ├── embeddings.py    # OpenAI / Gemini embeddings
│   │   │   ├── document_processor.py  # PDF/DOCX/TXT extraction
│   │   │   ├── vector_store.py  # ChromaDB per-project isolation
│   │   │   └── rag_pipeline.py  # Full RAG query flow
│   │   └── utils/
│   │       └── auth.py          # JWT helpers
│   ├── uploads/                 # Uploaded files (auto-created)
│   ├── chroma_db/               # ChromaDB persistence (auto-created)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProjectPage.jsx
    │   │   └── ChatPage.jsx
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── ProjectCard.jsx
    │   │   ├── CreateProjectModal.jsx
    │   │   ├── DocumentUpload.jsx
    │   │   ├── DocumentList.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   ├── auth.js
    │   │   ├── projects.js
    │   │   ├── documents.js
    │   │   └── chat.js
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Switching AI Providers

In `.env`, set `AI_PROVIDER=gemini` and provide `GOOGLE_API_KEY` to use Gemini instead of OpenAI. No code changes needed.

---

## Production Notes

- Change `SECRET_KEY` to a cryptographically random value
- Set `CORS` origins to your actual domain in `main.py`
- Use a production WSGI server: `uvicorn app.main:app --workers 4`
- Store uploads on S3 or similar for multi-instance deployments
- Use `alembic` for database migrations instead of `create_all`
