import logging
from .vectorstore import VectorStore

logger = logging.getLogger(__name__)


class RAGRetriever:
    """
    Retrieves Kerala SCERT syllabus context for a student query.

    Retrieval strategy
    ──────────────────
    1. Grade-filtered search   — finds grade-specific chunks
    2. Global fallback         — kicks in when < 3 results from step 1
    3. Deduplication           — removes near-identical chunks
    4. Context formatting      — builds a prompt-ready string for the LLM

    Flow
    ────
    query + grade + language
          │
          ▼
    ChromaDB similarity search (cosine, multilingual embeddings)
          │
          ▼
    top-k chunks  ──────────────────────────────────────────────►
          │                                                        │
          ▼                                                        │
    grade filter result < 3? → global search → merge + dedup      │
          │                                                        │
          ▼                                                        ▼
    formatted context string              source metadata list
          │                                                        │
          └──────────────────────┬─────────────────────────────────┘
                                 ▼
                         RAGQueryResponse
    """

    def __init__(self, vectorstore: VectorStore):
        self.vs = vectorstore

    def retrieve(
        self,
        query:    str,
        grade:    int,
        language: str = "en",
        top_k:    int = 5,
    ) -> dict:
        """
        Main entry point.  Returns:
        {
            context:      str,           # ready to inject into LLM prompt
            sources:      list[dict],    # metadata for each chunk
            scores:       list[float],   # cosine similarity per chunk
            chunks_found: int,
        }
        """
        if self.vs.get_count() == 0:
            return self._empty_result("Vector store is empty. Run /rag/ingest first.")

        # ── 1. Grade-specific search ───────────────────────────
        chunks = self.vs.query(
            query_text=query,
            n_results=top_k,
            where={"grade": grade},
        )

        # ── 2. Global fallback ─────────────────────────────────
        if len(chunks) < 3:
            global_chunks = self.vs.query(query_text=query, n_results=top_k)
            seen_prefixes = {c["text"][:80] for c in chunks}
            for c in global_chunks:
                if c["text"][:80] not in seen_prefixes:
                    chunks.append(c)
                    seen_prefixes.add(c["text"][:80])

        chunks = chunks[:top_k]

        if not chunks:
            return self._empty_result("No relevant syllabus content found for this query.")

        # ── 3. Format context ──────────────────────────────────
        context = self._format_context(chunks)

        return {
            "context":      context,
            "sources":      [c["metadata"] for c in chunks],
            "scores":       [c["score"]    for c in chunks],
            "chunks_found": len(chunks),
        }

    # ── Private helpers ─────────────────────────────────────────

    def _format_context(self, chunks: list[dict]) -> str:
        """
        Produces a numbered, structured context block:

            [1] Science — Class 7, Chapter: Heat | Score: 0.87
            Grade: 7 | Subject: Science
            Chapter: Heat
            Topic: Conduction
            ...

            ---

            [2] ...
        """
        parts = []
        for i, chunk in enumerate(chunks, 1):
            m = chunk["metadata"]
            header = (
                f"[{i}] {m.get('subject', '')} — Class {m.get('grade', '')}, "
                f"Chapter: {m.get('chapter_title', '')} | "
                f"Score: {chunk['score']:.2f}"
            )
            parts.append(f"{header}\n{chunk['text']}")

        return "\n\n---\n\n".join(parts)

    @staticmethod
    def _empty_result(message: str) -> dict:
        return {
            "context":      message,
            "sources":      [],
            "scores":       [],
            "chunks_found": 0,
        }
