"""
Seed job_listings table with realistic job data and Gemini embeddings.
Run from project root: python scripts/seed_jobs.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai_service'))

# Realistic job listings across common career paths the app serves
JOB_LISTINGS = [
    {
        "title": "Senior Software Engineer",
        "company": "Stripe",
        "location": "San Francisco, CA (Hybrid)",
        "external_url": "https://stripe.com/jobs",
        "description": (
            "Build and scale payment infrastructure used by millions of businesses worldwide. "
            "You'll work on distributed systems, APIs, and developer tooling. "
            "Requirements: 5+ years experience, Python or Go, distributed systems, REST APIs, "
            "PostgreSQL, Redis, strong system design skills, experience with high-availability services."
        ),
    },
    {
        "title": "Staff Software Engineer",
        "company": "Airbnb",
        "location": "Remote (US)",
        "external_url": "https://careers.airbnb.com",
        "description": (
            "Lead technical direction for Airbnb's core booking and payments platform. "
            "Drive architecture decisions, mentor engineers, and ship impactful features at scale. "
            "Requirements: 8+ years software engineering, Java or Kotlin, microservices, Kubernetes, "
            "Kafka, SQL and NoSQL databases, cross-team leadership experience."
        ),
    },
    {
        "title": "Machine Learning Engineer",
        "company": "Google DeepMind",
        "location": "London, UK (Hybrid)",
        "external_url": "https://deepmind.google/careers",
        "description": (
            "Develop and deploy large-scale machine learning models for real-world applications. "
            "Work on model training pipelines, evaluation frameworks, and production ML systems. "
            "Requirements: PhD or 4+ years ML engineering, Python, PyTorch or JAX, "
            "distributed training, MLOps, transformer architectures, strong math background."
        ),
    },
    {
        "title": "Senior Data Scientist",
        "company": "Netflix",
        "location": "Los Gatos, CA",
        "external_url": "https://jobs.netflix.com",
        "description": (
            "Drive personalisation and recommendation strategy for Netflix's 250M+ subscribers. "
            "Apply statistical modelling, A/B testing, and causal inference to product decisions. "
            "Requirements: MS or PhD in Statistics/CS, Python, R, SQL, experimentation design, "
            "machine learning, Spark, strong communication with non-technical stakeholders."
        ),
    },
    {
        "title": "Frontend Engineer",
        "company": "Figma",
        "location": "New York, NY (Hybrid)",
        "external_url": "https://www.figma.com/careers",
        "description": (
            "Build Figma's collaborative design editor used by 4M+ designers daily. "
            "Work on performance-critical rendering, real-time collaboration features, and developer APIs. "
            "Requirements: 3+ years frontend, TypeScript, React, WebGL or Canvas API, "
            "performance optimisation, WebSockets, strong design sensibility."
        ),
    },
    {
        "title": "Product Manager",
        "company": "Notion",
        "location": "San Francisco, CA",
        "external_url": "https://www.notion.so/careers",
        "description": (
            "Own the roadmap for Notion's core workspace product. Define strategy, work closely "
            "with engineering and design, and drive features from concept to launch. "
            "Requirements: 4+ years PM experience at a B2B SaaS company, data-driven decision making, "
            "user research, SQL proficiency, experience with productivity or collaboration tools."
        ),
    },
    {
        "title": "DevOps Engineer",
        "company": "Cloudflare",
        "location": "Austin, TX (Hybrid)",
        "external_url": "https://www.cloudflare.com/careers",
        "description": (
            "Manage and improve Cloudflare's global infrastructure spanning 200+ cities. "
            "Build CI/CD pipelines, automate deployments, and ensure reliability at internet scale. "
            "Requirements: 3+ years DevOps/SRE, Kubernetes, Terraform, AWS or GCP, "
            "Linux, Prometheus/Grafana, incident response, Python or Go scripting."
        ),
    },
    {
        "title": "Backend Engineer – Python",
        "company": "OpenAI",
        "location": "San Francisco, CA",
        "external_url": "https://openai.com/careers",
        "description": (
            "Build the infrastructure and APIs powering OpenAI's products used by millions. "
            "Design scalable services, improve reliability, and collaborate with research teams. "
            "Requirements: 3+ years backend engineering, Python (FastAPI or Django), PostgreSQL, "
            "Redis, Docker, Kubernetes, REST and gRPC APIs, cloud platforms (AWS/GCP)."
        ),
    },
    {
        "title": "Data Engineer",
        "company": "Databricks",
        "location": "Remote (US)",
        "external_url": "https://www.databricks.com/company/careers",
        "description": (
            "Design and maintain data pipelines that move and transform petabytes of data. "
            "Build reliable ETL workflows, data lakes, and analytics infrastructure. "
            "Requirements: 3+ years data engineering, Apache Spark, Python or Scala, SQL, "
            "dbt, Airflow, Delta Lake, cloud data warehouses (Snowflake, BigQuery, or Redshift)."
        ),
    },
    {
        "title": "iOS Engineer",
        "company": "Duolingo",
        "location": "Pittsburgh, PA (Hybrid)",
        "external_url": "https://careers.duolingo.com",
        "description": (
            "Build delightful iOS experiences for Duolingo's 500M+ learners worldwide. "
            "Ship new learning features, improve app performance, and collaborate with product design. "
            "Requirements: 3+ years iOS development, Swift, UIKit and SwiftUI, "
            "Combine or async/await, Core Data, A/B testing experience, strong product instincts."
        ),
    },
    {
        "title": "Security Engineer",
        "company": "GitHub",
        "location": "Remote (US/Canada)",
        "external_url": "https://github.com/about/careers",
        "description": (
            "Protect GitHub's platform used by 100M+ developers. Lead security reviews, "
            "vulnerability research, and incident response for critical infrastructure. "
            "Requirements: 4+ years application or infrastructure security, threat modelling, "
            "SAST/DAST tooling, penetration testing, Python or Ruby, cloud security (AWS/Azure)."
        ),
    },
    {
        "title": "Full Stack Engineer",
        "company": "Linear",
        "location": "Remote (Global)",
        "external_url": "https://linear.app/careers",
        "description": (
            "Help build the issue tracker loved by modern software teams. Work on both frontend "
            "and backend of a fast, keyboard-first product with extremely high quality bar. "
            "Requirements: 3+ years full stack, TypeScript, React, Node.js, PostgreSQL, "
            "GraphQL, attention to detail, care for product quality and UX."
        ),
    },
    {
        "title": "Engineering Manager",
        "company": "Shopify",
        "location": "Remote (Canada/US)",
        "external_url": "https://www.shopify.com/careers",
        "description": (
            "Lead a team of 6-8 engineers building Shopify's merchant-facing storefront tools. "
            "Drive technical strategy, hire and grow engineers, and deliver impactful products. "
            "Requirements: 2+ years engineering management, prior hands-on software engineering, "
            "experience with agile processes, strong communication and cross-functional collaboration."
        ),
    },
    {
        "title": "UX Designer",
        "company": "Spotify",
        "location": "New York, NY",
        "external_url": "https://www.lifeatspotify.com/jobs",
        "description": (
            "Design intuitive, inclusive experiences for Spotify's 600M+ users. "
            "Own design from research through delivery, collaborating with product and engineering. "
            "Requirements: 4+ years UX/product design, Figma proficiency, user research skills, "
            "experience with mobile and web, data-informed design decisions, strong portfolio."
        ),
    },
    {
        "title": "Site Reliability Engineer",
        "company": "Datadog",
        "location": "New York, NY (Hybrid)",
        "external_url": "https://www.datadoghq.com/careers",
        "description": (
            "Ensure reliability of Datadog's observability platform processing trillions of events. "
            "Own on-call rotations, drive post-mortems, and build automation to eliminate toil. "
            "Requirements: 3+ years SRE or infrastructure engineering, Kubernetes, Go or Python, "
            "cloud platforms, distributed systems, SLOs/SLIs, strong incident management skills."
        ),
    },
]


def embed_text_rest(text: str, api_key: str) -> list:
    """Embed text using google-genai REST client (avoids gRPC timeout issues)."""
    import google.genai as genai
    from google.genai import types as genai_types

    client = genai.Client(api_key=api_key)
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=genai_types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        ),
    )
    return result.embeddings[0].values


async def seed():
    import asyncpg

    database_url = os.environ.get("DATABASE_URL", "")
    google_api_key = os.environ.get("GOOGLE_API_KEY", "").strip()

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    if not google_api_key:
        print("ERROR: GOOGLE_API_KEY not set")
        sys.exit(1)

    pg_url = database_url.replace("postgres://", "postgresql://")
    conn = await asyncpg.connect(pg_url)
    try:
        existing = await conn.fetchval("SELECT COUNT(*) FROM job_listings")
        print(f"Existing job listings: {existing}")

        inserted = 0
        skipped = 0
        for job in JOB_LISTINGS:
            exists = await conn.fetchval(
                "SELECT 1 FROM job_listings WHERE title = $1 AND company = $2",
                job["title"], job["company"]
            )
            if exists:
                skipped += 1
                continue

            print(f"Embedding: {job['title']} @ {job['company']} ...", end=" ", flush=True)
            embed_input = f"{job['title']}\n{job['company']}\n{job['location']}\n{job['description']}"
            vector = embed_text_rest(embed_input, google_api_key)
            vector_str = "[" + ",".join(str(x) for x in vector) + "]"

            await conn.execute(
                """
                INSERT INTO job_listings (id, title, company, location, description, external_url, embedding)
                VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
                """,
                str(uuid.uuid4()), job["title"], job["company"],
                job["location"], job["description"], job["external_url"], vector_str,
            )
            inserted += 1
            print("done")

        total = await conn.fetchval("SELECT COUNT(*) FROM job_listings")
        print(f"\nSeeding complete. Inserted: {inserted}, Skipped (already exist): {skipped}, Total: {total}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
