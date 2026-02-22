import os
import logging
from fastapi import APIRouter, Request, HTTPException

from models.schemas import (
    RAGQueryRequest,
    RAGQueryResponse,
    IngestResponse,
    StatusResponse,
)
from rag.ingest import SyllabusIngestor

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /rag/query ────────────────────────────────────────────
@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(req: RAGQueryRequest, request: Request):
    """
    Retrieve relevant Kerala SCERT syllabus context for a student query.

    - Filters by grade first, then falls back globally.
    - Works with Malayalam, English, and Manglish queries.
    - Returns formatted context string ready for LLM injection (Step 3).
    """
    retriever = request.app.state.retriever

    result = retriever.retrieve(
        query    = req.query,
        grade    = req.grade,
        language = req.language,
        top_k    = req.top_k,
    )

    return RAGQueryResponse(
        context      = result["context"],
        sources      = result["sources"],
        scores       = result["scores"],
        chunks_found = result["chunks_found"],
        query        = req.query,
        grade        = req.grade,
    )


# ── POST /rag/ingest ───────────────────────────────────────────
@router.post("/ingest", response_model=IngestResponse)
async def ingest_syllabus(request: Request):
    """
    Clear ChromaDB and re-ingest all Kerala SCERT syllabus JSON files.
    Use this after updating syllabus data files.
    """
    vs = request.app.state.vectorstore
    vs.clear()

    ingestor = SyllabusIngestor(vs)
    total_chunks, files_processed = ingestor.ingest_all()

    return IngestResponse(
        chunks_ingested  = total_chunks,
        files_processed  = files_processed,
        message          = (
            f"Successfully ingested {total_chunks} bilingual chunks "
            f"from {files_processed} Kerala SCERT syllabus files."
        ),
    )


# ── GET /rag/status ────────────────────────────────────────────
@router.get("/status", response_model=StatusResponse)
async def get_status(request: Request):
    """Check ChromaDB vector store status."""
    vs    = request.app.state.vectorstore
    count = vs.get_count()

    return StatusResponse(
        total_chunks    = count,
        status          = "ready" if count > 0 else "empty",
        embedding_model = os.getenv(
            "EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
        ),
        collection_name = os.getenv("COLLECTION_NAME", "kerala_syllabus"),
        chroma_path     = os.getenv("CHROMA_PATH", "./chroma_db"),
    )


# ── DELETE /rag/clear ──────────────────────────────────────────
@router.delete("/clear")
async def clear_vectorstore(request: Request):
    """Wipe all data from the vector store."""
    vs = request.app.state.vectorstore
    vs.clear()
    logger.warning("Vector store cleared by API call")
    return {"message": "Vector store cleared", "chunks": 0}
