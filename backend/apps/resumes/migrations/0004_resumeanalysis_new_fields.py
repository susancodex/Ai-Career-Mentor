from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("resumes", "0003_resume_error_message"),
    ]

    operations = [
        # Remove old fields
        migrations.RemoveField(model_name="resumeanalysis", name="skills"),
        migrations.RemoveField(model_name="resumeanalysis", name="experience"),
        migrations.RemoveField(model_name="resumeanalysis", name="education"),
        migrations.RemoveField(model_name="resumeanalysis", name="summary"),
        # Add new fields
        migrations.AddField(
            model_name="resumeanalysis",
            name="extracted_skills",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="years_of_experience",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="work_history",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="strengths",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="gaps",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="ats_issues",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="overall_score",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="resumeanalysis",
            name="raw_extracted_text",
            field=models.TextField(blank=True, default=""),
        ),
    ]
