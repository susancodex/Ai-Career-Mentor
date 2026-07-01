import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Resume(models.Model):
    class Status(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        PARSING = "parsing", "Parsing"
        PARSED = "parsed", "Parsed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="resumes")
    cloudinary_url = models.URLField(max_length=1000)
    cloudinary_public_id = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPLOADED)
    raw_text = models.TextField(blank=True)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resume({self.user.email}, {self.original_filename})"


class ResumeAnalysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.OneToOneField(Resume, on_delete=models.CASCADE, related_name="analysis")
    extracted_skills = models.JSONField(default=list)
    years_of_experience = models.IntegerField(default=0)
    work_history = models.JSONField(default=list)
    strengths = models.JSONField(default=list)
    gaps = models.JSONField(default=list)
    ats_issues = models.JSONField(default=list)
    overall_score = models.IntegerField(default=0)
    raw_extracted_text = models.TextField(blank=True)
    # embedding stored as JSON list of 768 floats; pgvector handled by AI service directly
    embedding = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ResumeAnalysis({self.resume_id})"
