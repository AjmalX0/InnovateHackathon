import json
import logging
import os
from pathlib import Path
from uuid import uuid4

from .vectorstore import VectorStore

logger = logging.getLogger(__name__)

SYLLABUS_DATA_PATH = os.getenv("SYLLABUS_DATA_PATH", "./data/syllabus")


class SyllabusIngestor:
    """
    Reads Kerala SCERT syllabus JSON files → chunks content →
    batch-upserts into ChromaDB.

    Each topic becomes TWO chunks (English + Malayalam) so
    students can query in either language and get a hit.

    Chunk schema
    ─────────────
    Grade: 7 | Subject: Science
    Chapter: Heat
    Topic: Conduction of Heat

    Heat is transferred through a substance from a region of
    higher temperature to a lower temperature region...

    Keywords: heat, conduction, temperature, transfer
    """

    def __init__(self, vectorstore: VectorStore):
        self.vs        = vectorstore
        self.data_path = Path(SYLLABUS_DATA_PATH)

    # ── Public ──────────────────────────────────────────────────

    def ingest_all(self) -> tuple[int, int]:
        """
        Ingest every *.json file in the syllabus directory.
        Returns (total_chunks, files_processed).
        """
        files = sorted(self.data_path.glob("*.json"))

        if not files:
            logger.warning(f"No syllabus JSON files in {self.data_path}")
            return 0, 0

        total_chunks  = 0
        files_ok      = 0

        for f in files:
            try:
                n = self.ingest_file(f)
                total_chunks += n
                files_ok     += 1
                logger.info(f"  ✓ {f.name} → {n} chunks")
            except Exception as exc:
                logger.error(f"  ✗ {f.name}: {exc}")

        logger.info(f"Ingestion complete — {total_chunks} chunks from {files_ok} files")
        return total_chunks, files_ok

    def ingest_file(self, file_path: Path) -> int:
        with open(file_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)

        grade   = int(data["grade"])
        subject = str(data["subject"])
        docs: list[dict] = []

        for chapter in data.get("chapters", []):
            chapter_no = chapter.get("chapter_no", 0)
            title_en   = chapter.get("title_en", "")
            title_ml   = chapter.get("title_ml", title_en)

            for topic in chapter.get("topics", []):
                base_meta = {
                    "grade":         grade,
                    "subject":       subject,
                    "chapter_no":    chapter_no,
                    "chapter_title": title_en,
                    "difficulty":    topic.get("difficulty", "medium"),
                    "keywords":      ", ".join(topic.get("keywords", [])),
                }

                # ── English chunk ──────────────────────────────
                en_content = topic.get("content_en", "").strip()
                if en_content:
                    docs.append({
                        "id":   str(uuid4()),
                        "text": self._fmt_en(grade, subject, title_en, topic),
                        "metadata": {
                            **base_meta,
                            "topic":    topic.get("title_en", ""),
                            "language": "en",
                        },
                    })

                # ── Malayalam chunk ────────────────────────────
                ml_content = topic.get("content_ml", "").strip()
                if ml_content:
                    docs.append({
                        "id":   str(uuid4()),
                        "text": self._fmt_ml(grade, subject, title_ml, topic),
                        "metadata": {
                            **base_meta,
                            "topic":    topic.get("title_ml", topic.get("title_en", "")),
                            "language": "ml",
                        },
                    })

        return self.vs.add_documents(docs) if docs else 0

    # ── Chunk formatters ────────────────────────────────────────

    @staticmethod
    def _fmt_en(grade: int, subject: str, chapter: str, topic: dict) -> str:
        lines = [
            f"Grade: {grade} | Subject: {subject}",
            f"Chapter: {chapter}",
            f"Topic: {topic.get('title_en', '')}",
            "",
            topic.get("content_en", "").strip(),
        ]
        kw = topic.get("keywords", [])
        if kw:
            lines += ["", f"Keywords: {', '.join(kw)}"]
        return "\n".join(lines)

    @staticmethod
    def _fmt_ml(grade: int, subject: str, chapter: str, topic: dict) -> str:
        lines = [
            f"ക്ലാസ്: {grade} | വിഷയം: {subject}",
            f"അധ്യായം: {chapter}",
            f"വിഷയം: {topic.get('title_ml', '')}",
            "",
            topic.get("content_ml", "").strip(),
        ]
        kw = topic.get("keywords", [])
        if kw:
            lines += ["", f"കീവേഡുകൾ: {', '.join(kw)}"]
        return "\n".join(lines)
