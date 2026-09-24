from django.conf import settings
from django.db import models


class LogicQuestion(models.Model):
    QUESTION_TYPES = [
        ("number", "数字推理"),
        ("figure", "图形推理"),
        ("logic", "逻辑判断"),
        ("analogy", "类比推理"),
        ("deduction", "演绎推理"),
    ]

    title = models.CharField(max_length=120)
    question_type = models.CharField(max_length=32, choices=QUESTION_TYPES)
    difficulty = models.CharField(max_length=16)
    stem = models.TextField()
    answer = models.CharField(max_length=32)
    explanation = models.TextField()
    knowledge = models.CharField(max_length=120)
    image = models.ImageField(upload_to="questions/", blank=True)

    def __str__(self) -> str:
        return self.title


class WrongBookEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question = models.ForeignKey(LogicQuestion, on_delete=models.CASCADE)
    mistakes = models.PositiveIntegerField(default=1)
    favorited = models.BooleanField(default=False)
    last_practiced_at = models.DateField(auto_now=True)

    class Meta:
        unique_together = ("user", "question")


class ExamDraft(models.Model):
    """一份进行中的试卷草稿：题目快照 + 已选答案 + 不确定标记 + 未完成位置。"""

    STATUS_ACTIVE = "active"
    STATUS_SUBMITTED = "submitted"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "进行中"),
        (STATUS_SUBMITTED, "已交卷"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exam_drafts")
    paper_id = models.UUIDField(unique=True)
    difficulty = models.CharField(max_length=16)
    amount = models.PositiveIntegerField()
    questions = models.JSONField(default=list)
    answers = models.JSONField(default=dict)
    unsure = models.JSONField(default=list)
    current_index = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.paper_id}"


class ExamSubmission(models.Model):
    """交卷结果。paper_id 唯一，保证重复提交返回同一份报告。"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exam_submissions")
    paper_id = models.UUIDField(unique=True)
    answers = models.JSONField(default=dict)
    unsure = models.JSONField(default=list)
    score = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    correct = models.PositiveIntegerField()
    report = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"submission:{self.paper_id}"
