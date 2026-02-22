from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Language(str, Enum):
    MALAYALAM = "ml"
    ENGLISH   = "en"
    MANGLISH  = "mng"
    AUTO      = "auto"


# ── RAG ────────────────────────────────────────────────────────

class RAGQueryRequest(BaseModel):
    query:      str      = Field(..., min_length=1, max_length=2000,
                                 description="Student question (any language)")
    grade:      int      = Field(..., ge=1, le=12,
                                 description="Student's class (1–12)")
    language:   Language = Field(Language.AUTO,
                                 description="Preferred response language")
    top_k:      int      = Field(5, ge=1, le=10,
                                 description="Number of syllabus chunks to retrieve")
    student_id: Optional[str] = None
    session_id: Optional[str] = None


class RAGSource(BaseModel):
    grade:         int
    subject:       str
    chapter_title: str
    topic:         str
    language:      str
    difficulty:    str
    keywords:      Optional[str] = None


class RAGQueryResponse(BaseModel):
    context:      str
    sources:      list[dict]
    scores:       list[float]
    chunks_found: int
    query:        str
    grade:        int


# ── Ingest ─────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    chunks_ingested: int
    files_processed: int
    message:         str


# ── Status ─────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    total_chunks:    int
    status:          str          # "ready" | "empty"
    embedding_model: str
    collection_name: str
    chroma_path:     str
