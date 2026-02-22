import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt = "%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan: startup / shutdown ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 VidyaBot AI Service starting up...")

    from rag.vectorstore import VectorStore
    from rag.ingest      import SyllabusIngestor
    from rag.retriever   import RAGRetriever

    # Init ChromaDB + embedding model
    vs = VectorStore()
    app.state.vectorstore = vs
    app.state.retriever   = RAGRetriever(vs)

    # Auto-ingest if store is empty
    if vs.get_count() == 0:
        logger.info("📚 Vector store empty — auto-ingesting Kerala SCERT syllabus...")
        ingestor = SyllabusIngestor(vs)
        total, files = ingestor.ingest_all()
        logger.info(f"✅ Ingested {total} chunks from {files} syllabus files")
    else:
        logger.info(f"✅ Vector store ready — {vs.get_count()} chunks loaded")

    yield  # ← app is running

    logger.info("👋 VidyaBot AI Service shutting down")


# ── App ────────────────────────────────────────────────────────
app = FastAPI(
    title       = "VidyaBot AI Service",
    description = (
        "RAG pipeline + LangGraph multi-agent system "
        "for Kerala SCERT syllabus (Class 1–12)."
    ),
    version  = "2.0.0",
    lifespan = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)

# ── Routers ────────────────────────────────────────────────────
from routers.rag import router as rag_router

app.include_router(rag_router, prefix="/rag", tags=["RAG Pipeline"])


# ── Health ─────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status":  "ok",
        "service": "VidyaBot AI Service",
        "version": "2.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host    = "0.0.0.0",
        port    = int(os.getenv("PORT", 8000)),
        reload  = os.getenv("ENVIRONMENT", "development") == "development",
        workers = 1,
    )
