import os
import logging
import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger(__name__)

CHROMA_PATH      = os.getenv("CHROMA_PATH", "./chroma_db")
COLLECTION_NAME  = os.getenv("COLLECTION_NAME", "kerala_syllabus")
EMBEDDING_MODEL  = os.getenv(
    "EMBEDDING_MODEL",
    "paraphrase-multilingual-MiniLM-L12-v2",  # supports Malayalam + English
)

_BATCH_SIZE = 100  # ChromaDB recommended batch size


class VectorStore:
    """
    Persistent ChromaDB vector store for Kerala SCERT syllabus.

    Uses `paraphrase-multilingual-MiniLM-L12-v2` by default — a
    50-language sentence-transformer that handles Malayalam, English,
    and Manglish queries in a single embedding space.
    """

    def __init__(self):
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )

        self._client = chromadb.PersistentClient(path=CHROMA_PATH)

        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )

        logger.info(
            f"ChromaDB ready — collection: '{COLLECTION_NAME}' | "
            f"path: {CHROMA_PATH} | chunks: {self.get_count()}"
        )

    # ── Write ───────────────────────────────────────────────────

    def add_documents(self, documents: list[dict]) -> int:
        """
        Batch-upsert documents.
        Each dict: { id: str, text: str, metadata: dict }
        """
        if not documents:
            return 0

        added = 0
        for i in range(0, len(documents), _BATCH_SIZE):
            batch = documents[i : i + _BATCH_SIZE]
            self._collection.upsert(
                documents=[d["text"]     for d in batch],
                ids=      [d["id"]       for d in batch],
                metadatas=[d["metadata"] for d in batch],
            )
            added += len(batch)

        return added

    # ── Read ────────────────────────────────────────────────────

    def query(
        self,
        query_text: str,
        n_results:  int  = 5,
        where:      dict = None,
    ) -> list[dict]:
        """
        Semantic similarity search.
        Returns list of { text, metadata, score } dicts.
        score = cosine similarity (0–1, higher = more relevant).
        """
        count = self.get_count()
        if count == 0:
            return []

        safe_n = min(n_results, count)

        kwargs: dict = {
            "query_texts": [query_text],
            "n_results":   safe_n,
            "include":     ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        results = self._collection.query(**kwargs)

        chunks = []
        ids    = results.get("ids", [[]])[0]
        for i in range(len(ids)):
            distance = results["distances"][0][i]
            chunks.append({
                "text":     results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "score":    round(1.0 - distance, 4),  # cosine similarity
            })

        return chunks

    # ── Utils ───────────────────────────────────────────────────

    def get_count(self) -> int:
        return self._collection.count()

    def clear(self):
        """Delete and recreate the collection (wipes all data)."""
        self._client.delete_collection(COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("Vector store cleared and recreated")
