# VidyaBot Backend: Comprehensive Technical Guide

This document outlines the architecture, core decisions, technical hurdles, and implementation strategies behind the VidyaBot backend. VidyaBot is an AI-powered tutor designed for Kerala syllabus students, featuring native Malayalam support, voice interactions, adaptive capability tracing, and Retrieval-Augmented Generation (RAG) to eliminate AI hallucinations.

---

## 1. System Architecture & Tech Stack

- **Framework:** NestJS (Node.js) - Chosen for its highly modular, scalable, and TypeScript-first approach.
- **Database:** PostgreSQL via Supabase - Provides a powerful, reliable SQL database with built-in connection pooling and vector extensions.
- **Database Driver:** `pg` (Raw SQL Connection Pool) - Replaced TypeORM to fix critical connection string parsing issues with special characters resulting from Supabase passwords.
- **AI/LLM Engine:** Google Generative AI (Gemini 1.5 Flash & text-embedding-004) - Used for both fast AI lesson generation and embedding syllabus textbooks.
- **Real-Time Communication:** Socket.io (WebSockets) - Used to provide instant, bi-directional communication with the Flutter frontend without HTTP polling delays.
- **Vector Database/RAG:** `pgvector` inside PostgreSQL.
- **Audio Processing:** `whisper.cpp` (local CLI) wrapped in a custom Node.js `SpeechService`.

---

## 2. Core Modules & Implementation Strategies

### 2.1 The "RAG" Syllabus Engine (`SyllabusModule`)
**The Goal:** The AI model (Gemini) does not inherently know the Kerala SCERT syllabus. Left alone, it would hallucinate generic science facts that don't match the student's textbook.
**The Solution:** Retrieval-Augmented Generation (RAG).
1. **Ingestion (`POST /syllabus/upload-textbook`):** We built an endpoint accepting multipart/form-data PDFs. The `pdf-parse` library extracts the textual data in Node.js.
2. **Chunking & Embedding:** The raw text is sliced into chunks of roughly 1,000 characters. Each chunk is sent to Gemini's `text-embedding-004` to receive a 768-dimensional float array.
3. **Storage (`pgvector`):** The chunks and embeddings are stored inside the `syllabus_chunks` table utilizing Postgres's `vector` extension.
4. **Retrieval (Cosine Similarity):** When a student asks a doubt, we generate an embedding of their question. We run a Cosine Similarity SQL query (`embedding <=> $1::vector`) directly inside our Postgres Pool to fetch the 3 most semantically relevant textbook paragraphs in milliseconds. This context is injected forcefully into the Gemini prompt.

### 2.2 Adaptive Teaching & Capability Clustering (`CapabilityModule`)
**The Goal:** A 10th grader struggling with basic science (`LOW` capability) needs a completely different explanation than a 10th grader who perfectly understands the concepts (`HIGH` capability).
**The Solution:** Dynamic prompts based on continuous assessment.
- Students carry a `capability_score` (0-100) inside `StudentProfile`.
- The `CapabilityService` maps scores to clusters (`LOW < 40`, `MEDIUM 40-75`, `HIGH > 75`).
- **Prompt Injection:** Depending on the cluster, the AI is structured to reply differently. `LOW` invokes storytelling and simple real-world household analogies without jargon. `HIGH` forces deep-dive conceptual reasoning and technical vocabulary.

### 2.3 Real-Time WebSocket Gateway (`ChatModule` & `gateway`)
**The Goal:** Waiting for traditional HTTP POST responses for AI generation (often taking a few seconds) feels clunky on mobile.
**The Solution:** A persistent Socket.io connection (`VidyabotGateway`).
- The frontend emits events like `start_learning` or `ask_doubt`.
- The backend validates payloads instantly using DTOs (`class-validator`), runs the heavy AI computations asynchronously, and fires back named events like `lesson_started` or `doubt_answered` when ready.

### 2.4 Multilingual & Voice Support (`SpeechModule`)
**The Goal:** Kerala students often prefer asking doubts verbally in Malayalam rather than typing.
**The Solution:**
- WebSockets accept `audioBase64` payloads.
- The `SpeechService` decodes the Base64 audio into physical `.wav` files temporarily on the local disk.
- It triggers a `child_process.exec()` call to the local `whisper-cli.exe` engine to transcribe the Malayalam audio locally, avoiding expensive cloud transcription fees.
- The prompt sent to Gemini forcefully demands: *"Respond ENTIRELY in Malayalam (മലയാളം) script. Do not use English except for technical terms."*

---

## 3. Major Technical Hurdles & How We Solved Them

### Hurdle 1: TypeORM vs. Supabase Password Parsing
**The Catch:** Our Supabase Database password contained multiple special `@` symbols (e.g., `Innovate@1234@Hackathon`). When passing the `DATABASE_URL` to TypeORM, the internal URL parser fundamentally broke, attempting to resolve the domain at the first `@` sign rather than the last one, leading to constant `ENOTFOUND` crashes.
**The Fix:** We completely ripped TypeORM out of the NestJS ecosystem.
- Uninstalled `@nestjs/typeorm`.
- Created a custom `DatabaseModule`.
- Initialized a raw `pg` Pool using a hardcoded configuration object, explicitly defining `host`, `port`, `user`, and `password` properties. This bypassed string interpolation entirely. We subsequently refactored all entities and database operations into raw parameterised SQL queries (`SELECT * FROM ...`).

### Hurdle 2: RAG Vector Limitations in Standard TypeORM
**The Catch:** TypeORM's support for Postgres's `pgvector` operators (like `<=>` for cosine distance) is notoriously painful, requiring massive custom QueryBuilders and raw strings that compromise type safety.
**The Fix:** Having already switched to raw `pg` queries natively allowed us to implement the distance operators trivially:
```sql
SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity 
FROM syllabus_chunks 
ORDER BY embedding <=> $1::vector LIMIT 3;
```
It scaled beautifully and eliminated ORM overhead during the search.

### Hurdle 3: AI Latency and Cost Constraints
**The Catch:** Every time a user asks a doubt, calling Gemini API takes ~2-4 seconds and costs credits. In a classroom, 30 students might literally ask the exact same question during a chapter.
**The Fix:** A highly aggressive "Capability-Aware Hashing Cache".
- When a question arrives, we normalise the text (removing whitespace, lowercasing) and generate an MD5 hash.
- We check the `capability_responses` table for an exact match of: `(chapter + capability_cluster + question_hash)`.
- **Why Capability Cluster?** The answer for a `LOW` student must be different than the answer for a `HIGH` student, even if the question is identical.
- If a match is found, the backend bypasses Gemini entirely and responds via WebSocket in `~50ms`. We increment a `usage_count` field internally to track which doubts are the most common!

### Hurdle 4: RAG Failure Resilience
**The Catch:** If the remote Supabase database drops the `vector` extension or PDF ingestion fails, the RAG query would completely crash the teaching session for the student.
**The Fix:** Silent Fallbacks.
We wrapped the `searchRelevantChunks` RAG querying within a `try-catch` block that returns an empty array on SQL failure. The `TeachingService` checks if `syllabusChunks.length === 0`. If true, it falls back to grabbing non-vector sequentially ordered string chunks from the DB, ensuring the application remains alive gracefully during edge cases.

---

## 4. Conclusion
VidyaBot demonstrates a rigorous backend design aimed at bypassing typical LLM wrappers. The combination of local caching, raw SQL connection pooling over abstract ORMs, Vector embeddings mapped to direct SCERT textbook ingestion, and natively tracking user-learning capabilities yields a heavily optimized, offline-resilient (cost-wise), and deeply contextual AI tutor.
