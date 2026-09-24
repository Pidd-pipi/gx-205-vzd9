import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LogicQuestion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                (
                    "question_type",
                    models.CharField(
                        choices=[
                            ("number", "数字推理"),
                            ("figure", "图形推理"),
                            ("logic", "逻辑判断"),
                            ("analogy", "类比推理"),
                            ("deduction", "演绎推理"),
                        ],
                        max_length=32,
                    ),
                ),
                ("difficulty", models.CharField(max_length=16)),
                ("stem", models.TextField()),
                ("answer", models.CharField(max_length=32)),
                ("explanation", models.TextField()),
                ("knowledge", models.CharField(max_length=120)),
                ("image", models.ImageField(blank=True, upload_to="questions/")),
            ],
        ),
        migrations.CreateModel(
            name="ExamPaper",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("difficulty", models.CharField(max_length=16)),
                ("amount", models.PositiveIntegerField()),
                ("questions", models.JSONField(default=list)),
                ("answers", models.JSONField(default=dict)),
                ("uncertain", models.JSONField(default=list)),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "作答中"), ("submitted", "已交卷")],
                        default="draft",
                        max_length=16,
                    ),
                ),
                ("report", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="exam_papers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="WrongBookEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("mistakes", models.PositiveIntegerField(default=1)),
                ("favorited", models.BooleanField(default=False)),
                ("last_practiced_at", models.DateField(auto_now=True)),
                (
                    "question",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="bank.logicquestion"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "unique_together": {("user", "question")},
            },
        ),
    ]
