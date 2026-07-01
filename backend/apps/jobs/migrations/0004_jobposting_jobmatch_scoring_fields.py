import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0003_asyncjob_error_message"),
    ]

    operations = [
        # New table for cached real job listings
        migrations.CreateModel(
            name="JobPosting",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("external_id", models.CharField(max_length=255, unique=True)),
                ("source", models.CharField(default="remotive", max_length=50)),
                ("title", models.CharField(max_length=255)),
                ("company", models.CharField(max_length=255)),
                ("location", models.CharField(blank=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("apply_url", models.URLField()),
                ("salary_range", models.CharField(blank=True, max_length=255)),
                ("required_skills", models.JSONField(default=list)),
                ("min_years", models.IntegerField(default=0)),
                ("max_years", models.IntegerField(default=99)),
                ("fetched_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddIndex(
            model_name="jobposting",
            index=models.Index(fields=["source", "external_id"], name="jobs_jobpos_source_idx"),
        ),
        # Add FK from JobMatch → JobPosting
        migrations.AddField(
            model_name="jobmatch",
            name="posting",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="jobs.jobposting",
            ),
        ),
        # Deterministic scoring fields
        migrations.AddField(
            model_name="jobmatch",
            name="overall_score",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="jobmatch",
            name="matched_skills",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="jobmatch",
            name="missing_skills",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="jobmatch",
            name="experience_fit_pct",
            field=models.IntegerField(default=0),
        ),
    ]
