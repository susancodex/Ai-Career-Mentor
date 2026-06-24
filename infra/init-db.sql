-- Enable pgvector extension (must run before Django migrations create the embedding columns)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create langfuse database if it doesn't exist (Langfuse needs its own DB)
SELECT 'CREATE DATABASE langfuse'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'langfuse')\gexec

-- job_listings table for vector similarity search (AI service manages this directly)
CREATE TABLE IF NOT EXISTS job_listings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    company     TEXT NOT NULL,
    location    TEXT DEFAULT '',
    description TEXT DEFAULT '',
    external_url TEXT DEFAULT '',
    embedding   vector(768),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for cosine similarity — build after seeding enough rows (100+)
-- CREATE INDEX ON job_listings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Uncomment the line above once you have ≥100 job listings seeded.
