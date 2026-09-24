from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from bank.models import ExamPaper
from bank.serializers import GeneratePaperSerializer, SaveDraftSerializer, SubmitExamSerializer


QUESTIONS = [
    {
        "id": 101,
        "type": "数字推理",
        "difficulty": "中级",
        "stem": "2，6，12，20，30，下一项是多少？",
        "options": ["38", "40", "42", "44"],
        "answer": "42",
        "explanation": "相邻差为 4、6、8、10，下一差为 12，因此答案为 42。",
        "knowledge": "二级等差",
    },
    {
        "id": 102,
        "type": "逻辑判断",
        "difficulty": "中级",
        "stem": "所有通过高阶训练的人都完成错题复盘，小林完成高阶训练，可推出什么？",
        "options": ["小林完成错题复盘", "小林没有错题", "小林排名第一", "无法判断"],
        "answer": "小林完成错题复盘",
        "explanation": "这是充分条件推理：完成高阶训练可以推出完成错题复盘。",
        "knowledge": "充分条件",
    },
    {
        "id": 103,
        "type": "类比推理",
        "difficulty": "初级",
        "stem": "医生：诊断，相当于教师：？",
        "options": ["备课", "授课", "批改", "讲解"],
        "answer": "授课",
        "explanation": "职业与核心工作行为对应，医生核心行为是诊断，教师核心行为是授课。",
        "knowledge": "职业关系",
    },
]


def build_questions(amount: int) -> list[dict]:
    """按题量展开题目模板，并为每道题分配卷内唯一 id。

    模板数量少于题量时会循环复用，若沿用模板 id 会产生重复，
    导致作答草稿（按题目 id 记录）互相覆盖，因此按位置重新编号。
    """
    questions = []
    for index in range(amount):
        template = QUESTIONS[index % len(QUESTIONS)]
        questions.append({**template, "id": index + 1, "qid": template["id"]})
    return questions


def paper_payload(paper: ExamPaper) -> dict:
    return {
        "paper_id": paper.id,
        "difficulty": paper.difficulty,
        "amount": paper.amount,
        "paper": paper.questions,
        "answers": paper.answers,
        "uncertain": paper.uncertain,
        "updated_at": paper.updated_at.isoformat(),
    }


def build_dashboard() -> dict:
    return {
        "profile": {
            "nickname": "推理训练示例用户",
            "tier": "铂金",
            "totalAnswered": 1260,
            "correctRate": 86.5,
            "streakDays": 19,
            "practiceMinutes": 2480,
        },
        "categories": [
            {"id": 1, "name": "数字推理", "accuracy": 88, "total": 320},
            {"id": 2, "name": "图形推理", "accuracy": 76, "total": 240},
            {"id": 3, "name": "逻辑判断", "accuracy": 91, "total": 280},
            {"id": 4, "name": "类比推理", "accuracy": 84, "total": 210},
            {"id": 5, "name": "演绎推理", "accuracy": 80, "total": 210},
        ],
        "paper": QUESTIONS,
        "wrongBook": [
            {"id": 1, "title": "集合包含关系反推", "type": "演绎推理", "mistakes": 5, "lastPracticed": "05-28"},
            {"id": 2, "title": "九宫格旋转规律", "type": "图形推理", "mistakes": 4, "lastPracticed": "05-27"},
            {"id": 3, "title": "多条件排序", "type": "逻辑判断", "mistakes": 3, "lastPracticed": "05-26"},
        ],
        "rankings": [
            {"rank": 1, "name": "ReasonMax", "tier": "王者", "score": 9820, "accuracy": 94.2},
            {"rank": 2, "name": "DeducePro", "tier": "钻石", "score": 8760, "accuracy": 91.7},
            {"rank": 3, "name": "推理训练示例用户", "tier": "铂金", "score": 7650, "accuracy": 86.5},
        ],
        "radar": [
            {"axis": "数字", "value": 88},
            {"axis": "图形", "value": 76},
            {"axis": "逻辑", "value": 91},
            {"axis": "类比", "value": 84},
            {"axis": "演绎", "value": 80},
        ],
    }


@api_view(["GET"])
def health(_request):
    return Response({"status": "ok", "service": "gxlogic-bank-backend"})


@api_view(["GET"])
def dashboard(_request):
    return Response(build_dashboard())


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_paper(request):
    serializer = GeneratePaperSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    difficulty = serializer.validated_data["difficulty"]
    amount = int(serializer.validated_data["amount"])
    # 同一用户只保留一份进行中的草稿，新试卷取代旧草稿
    ExamPaper.objects.filter(user=request.user, status=ExamPaper.STATUS_DRAFT).delete()
    paper = ExamPaper.objects.create(
        user=request.user,
        difficulty=difficulty,
        amount=amount,
        questions=build_questions(amount),
    )
    return Response(paper_payload(paper), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_paper(request):
    paper = ExamPaper.objects.filter(user=request.user, status=ExamPaper.STATUS_DRAFT).first()
    if paper is None:
        return Response({"paper": None})
    return Response({"paper": paper_payload(paper)})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def save_draft(request, paper_id: int):
    paper = get_object_or_404(ExamPaper, id=paper_id, user=request.user)
    if paper.status != ExamPaper.STATUS_DRAFT:
        return Response({"detail": "试卷已交卷，草稿不可再修改。"}, status=409)
    serializer = SaveDraftSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if "answers" in serializer.validated_data:
        paper.answers = serializer.validated_data["answers"]
    if "uncertain" in serializer.validated_data:
        paper.uncertain = serializer.validated_data["uncertain"]
    paper.save(update_fields=["answers", "uncertain", "updated_at"])
    return Response({"saved": True, "updated_at": paper.updated_at.isoformat()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_exam(request):
    serializer = SubmitExamSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    paper = get_object_or_404(
        ExamPaper, id=serializer.validated_data["paper_id"], user=request.user
    )
    if paper.status == ExamPaper.STATUS_SUBMITTED:
        # 重复提交：草稿已失效，按原答案返回同一份报告
        return Response(paper.report)

    answers = serializer.validated_data.get("answers") or paper.answers
    total = len(paper.questions)
    correct = sum(1 for question in paper.questions if answers.get(str(question["id"])) == question["answer"])
    score = round(correct / total * 100) if total else 0
    report = {
        "score": score,
        "correct": correct,
        "total": total,
        "rank_hint": "本次表现接近黄金 I，继续强化图形推理可冲击铂金。",
        "analysis": ["数字推理稳定", "图形旋转规律仍需复盘", "演绎推理建议练习充分必要条件"],
    }
    paper.answers = answers
    paper.report = report
    paper.status = ExamPaper.STATUS_SUBMITTED
    paper.submitted_at = timezone.now()
    paper.save(update_fields=["answers", "report", "status", "submitted_at", "updated_at"])
    return Response(report)


@api_view(["POST"])
def demo_login(_request):
    User = get_user_model()
    user, _ = User.objects.get_or_create(username="demo", defaults={"email": "demo@example.com"})
    user.set_password("demo1234")
    user.save(update_fields=["password"])
    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh)})
