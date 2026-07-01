import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class InterviewSession(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        READY = "ready"
        COMPLETED = "completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="interview_sessions")
    # Optional link to the resume used for question generation.
    # When set, questions are anchored to real resume content; when null the
    # agent falls back to generic role questions.
    resume = models.ForeignKey(
        "resumes.Resume",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interview_sessions",
    )
    target_role = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "resume", "target_role"]),
        ]

    def __str__(self):
        return f"InterviewSession({self.user.email}, {self.target_role})"


class InterviewQuestion(models.Model):
    class Category(models.TextChoices):
        BEHAVIORAL = "behavioral"
        TECHNICAL = "technical"
        SITUATIONAL = "situational"
        RESUME_SPECIFIC = "resume_specific"
        GENERAL = "general"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name="questions")
    question_text = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    # For resume_specific questions: which resume item (project, tech, role) this is anchored to.
    anchored_to = models.CharField(max_length=500, blank=True, default="")
    user_answer = models.TextField(blank=True)
    ai_feedback = models.TextField(blank=True)
    # 0-100 scale (matches the /100 display in the UI)
    score = models.FloatField(null=True, blank=True)
    # Structured feedback arrays from the scorer
    strengths = models.JSONField(default=list, blank=True)
    improvements = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
