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


class ExamPaper(models.Model):
    """一份生成的练习卷及其作答草稿。

    草稿状态下 answers/uncertain 随时自动保存，跨设备登录可恢复；
    交卷后状态变为 submitted，report 固化，草稿随之失效。
    """

    STATUS_DRAFT = "draft"
    STATUS_SUBMITTED = "submitted"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "作答中"),
        (STATUS_SUBMITTED, "已交卷"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exam_papers")
    difficulty = models.CharField(max_length=16)
    amount = models.PositiveIntegerField()
    questions = models.JSONField(default=list)
    answers = models.JSONField(default=dict)
    uncertain = models.JSONField(default=list)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    report = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.difficulty}:{self.amount}:{self.status}"
