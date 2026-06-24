"""
Seed job_listings with sample data for development/testing.

Run with:
    cd ai_service
    python -m scripts.seed_jobs

STUB: Replace this fixture with a real job-board API integration (e.g. Adzuna,
      RemoteOK, or LinkedIn Jobs) when ready. This is an explicit open task.
"""
import asyncio
import uuid

SAMPLE_JOBS = [
    {
        "title": "Senior Python Developer",
        "company": "TechCorp",
        "location": "Remote",
        "description": "Build scalable backend systems using Python, Django, FastAPI. 5+ years Python experience required.",
        "external_url": "https://example.com/jobs/1",
    },
    {
        "title": "Machine Learning Engineer",
        "company": "AI Startup",
        "location": "San Francisco, CA",
        "description": "Develop ML models using PyTorch, TensorFlow. Experience with NLP and computer vision preferred.",
        "external_url": "https://example.com/jobs/2",
    },
    {
        "title": "Full Stack Developer",
        "company": "FinTech Co",
        "location": "New York, NY",
        "description": "React frontend + Node.js/Python backend. Experience with PostgreSQL and cloud platforms (AWS/GCP).",
        "external_url": "https://example.com/jobs/3",
    },
    {
        "title": "DevOps Engineer",
        "company": "CloudOps Ltd",
        "location": "Remote",
        "description": "Kubernetes, Terraform, CI/CD pipelines. Experience with Docker, Helm, and cloud infrastructure.",
        "external_url": "https://example.com/jobs/4",
    },
    {
        "title": "Data Scientist",
        "company": "DataDriven Inc",
        "location": "Austin, TX",
        "description": "Statistical modelling, Python (pandas/numpy/sklearn), SQL, data visualization. PhD preferred.",
        "external_url": "https://example.com/jobs/5",
    },
    {
        "title": "Backend Engineer (Go)",
        "company": "Platform Co",
        "location": "Remote",
        "description": "High-throughput Go services, gRPC, distributed systems, Kafka. 3+ years Go experience.",
        "external_url": "https://example.com/jobs/6",
    },
    {
        "title": "React Frontend Engineer",
        "company": "ProductCo",
        "location": "Chicago, IL",
        "description": "React, TypeScript, GraphQL, design systems. Strong CSS and accessibility skills required.",
        "external_url": "https://example.com/jobs/7",
    },
    {
        "title": "Cloud Architect",
        "company": "Enterprise Corp",
        "location": "Seattle, WA",
        "description": "Design AWS/Azure architecture. Solutions Architect certification preferred. 7+ years cloud experience.",
        "external_url": "https://example.com/jobs/8",
    },
    {
        "title": "Security Engineer",
        "company": "SecureNet",
        "location": "Remote",
        "description": "Application security, penetration testing, threat modelling. CISSP or equivalent preferred.",
        "external_url": "https://example.com/jobs/9",
    },
    {
        "title": "Engineering Manager",
        "company": "GrowthCo",
        "location": "Boston, MA",
        "description": "Lead a team of 6 engineers. Strong technical background + 2+ years management experience.",
        "external_url": "https://example.com/jobs/10",
    },
]


async def seed():
    from app.tools.embeddings import embed_text
    from app.tools.vector_store import upsert_job_listing
    from app.core.config import settings

    print(f"Seeding {len(SAMPLE_JOBS)} jobs into job_listings...")

    for i, job in enumerate(SAMPLE_JOBS):
        job_text = f"{job['title']} at {job['company']}. {job['description']}"
        embedding = await embed_text(job_text, task_type="RETRIEVAL_DOCUMENT")
        job_with_id = {**job, "id": str(uuid.uuid4())}
        await upsert_job_listing(job_with_id, embedding)
        print(f"  [{i + 1}/{len(SAMPLE_JOBS)}] Seeded: {job['title']}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
