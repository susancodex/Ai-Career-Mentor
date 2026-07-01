from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("careers", "0003_initial"),
    ]

    operations = [
        # Remove old flat fields
        migrations.RemoveField(model_name="careerpath", name="title"),
        migrations.RemoveField(model_name="careerpath", name="description"),
        migrations.RemoveField(model_name="careerpath", name="reasoning"),
        migrations.RemoveField(model_name="careerpath", name="match_score"),
        migrations.RemoveField(model_name="careerpath", name="required_skills"),
        migrations.RemoveField(model_name="careerpath", name="timeline_months"),
        # Add new structured fields
        migrations.AddField(
            model_name="careerpath",
            name="paths_json",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="careerpath",
            name="recommended_path_index",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="careerpath",
            name="summary",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="careerpath",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
