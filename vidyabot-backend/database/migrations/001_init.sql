-- VidyaBot Database Migration
-- Run this in your Supabase SQL editor

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: student_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
    capability_score FLOAT NOT NULL DEFAULT 50,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: teaching_blocks
-- ============================================
CREATE TYPE capability_cluster_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE IF NOT EXISTS teaching_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade INTEGER NOT NULL,
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(200) NOT NULL,
    capability_cluster capability_cluster_enum NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teaching_blocks_lookup
    ON teaching_blocks (grade, subject, chapter, capability_cluster);

-- ============================================
-- Table: capability_responses
-- ============================================
CREATE TABLE IF NOT EXISTS capability_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade INTEGER NOT NULL,
    chapter VARCHAR(200) NOT NULL,
    capability_cluster capability_cluster_enum NOT NULL,
    question_hash VARCHAR(64) NOT NULL,
    response_text TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_capability_responses_hash
    ON capability_responses (chapter, capability_cluster, question_hash);

-- ============================================
-- Table: messages
-- ============================================
CREATE TYPE message_role_enum AS ENUM ('student', 'tutor');
CREATE TYPE input_type_enum AS ENUM ('voice', 'text');

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    role message_role_enum NOT NULL,
    content TEXT NOT NULL,
    input_type input_type_enum NOT NULL DEFAULT 'text',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_student_id
    ON messages (student_id);

CREATE INDEX IF NOT EXISTS idx_messages_student_created
    ON messages (student_id, created_at DESC);

-- ============================================
-- Table: syllabus_chunks
-- ============================================
CREATE TABLE IF NOT EXISTS syllabus_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade INTEGER NOT NULL,
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    chunk_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_syllabus_chunks_lookup
    ON syllabus_chunks (grade, subject, chapter, chunk_order);

-- ============================================
-- Vector Embeddings for Syllabus Chunks (RAG)
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE syllabus_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create Supabase RPC Stored Procedure for Pure Supabase JS RAG Search
-- ============================================
-- Table: subject_catalog
-- Stores the official list of subjects per grade.
-- These are registered by admins upfront; students browse this list.
-- ============================================
CREATE TABLE IF NOT EXISTS subject_catalog (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade        INTEGER      NOT NULL CHECK (grade >= 1 AND grade <= 12),
    subject      VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (grade, subject)
);

CREATE INDEX IF NOT EXISTS idx_subject_catalog_grade
    ON subject_catalog (grade);

-- ============================================
-- Table: chapter_catalog
-- Stores the ordered list of chapters per grade+subject.
-- Registered by admins; used in the student subject/chapter picker.
-- ============================================
CREATE TABLE IF NOT EXISTS chapter_catalog (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade         INTEGER      NOT NULL CHECK (grade >= 1 AND grade <= 12),
    subject       VARCHAR(100) NOT NULL,
    chapter       VARCHAR(200) NOT NULL,
    display_name  VARCHAR(300) NOT NULL,
    chapter_order INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (grade, subject, chapter)
);

CREATE INDEX IF NOT EXISTS idx_chapter_catalog_lookup
    ON chapter_catalog (grade, subject, chapter_order);

-- ============================================
-- Vector Embeddings for Syllabus Chunks (RAG)
-- ============================================
CREATE OR REPLACE FUNCTION match_syllabus_chunks (
  query_embedding vector(768),
  match_grade int,
  match_subject text,
  match_limit int DEFAULT 3
) RETURNS TABLE (
  id uuid,
  grade int,
  subject varchar,
  chapter varchar,
  content text,
  chunk_order int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.grade,
    sc.subject,
    sc.chapter,
    sc.content,
    sc.chunk_order,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM syllabus_chunks sc
  WHERE sc.grade <= match_grade AND sc.subject = match_subject
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
