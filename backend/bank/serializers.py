from rest_framework import serializers


class GeneratePaperSerializer(serializers.Serializer):
    difficulty = serializers.ChoiceField(choices=["入门", "初级", "中级", "高级", "专家"])
    amount = serializers.ChoiceField(choices=[10, 20, 30, 50])


class SaveDraftSerializer(serializers.Serializer):
    paper_id = serializers.UUIDField()
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
    unsure = serializers.ListField(child=serializers.CharField(), required=False)
    current_index = serializers.IntegerField(min_value=0, required=False)


class SubmitExamSerializer(serializers.Serializer):
    paper_id = serializers.UUIDField()
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
