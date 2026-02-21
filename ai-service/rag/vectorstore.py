import chromadb
from sentence_transformers import SentenceTransformer
import os

class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.encoder = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        # This model supports Malayalam + English + 50 other languages
        self.collection = self.client.get_or_create_collection("kerala_syllabus")

    async def search(self, query: str, grade: int, k: int = 3) -> str:
        embedding = self.encoder.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=k,
            where={"grade": {"$lte": grade}}  # only relevant grade content
        )
        if not results["documents"][0]:
            return "No specific curriculum content found."
        return "\n\n".join(results["documents"][0])

    def ingest_content(self, documents: list):
        # Run once to populate the vector store with Kerala syllabus content
        texts      = [d["text"]     for d in documents]
        metadatas  = [d["metadata"] for d in documents]
        embeddings = self.encoder.encode(texts).tolist()
        ids        = [f"doc_{i}"    for i in range(len(documents))]
        self.collection.add(documents=texts, embeddings=embeddings, metadatas=metadatas, ids=ids)
