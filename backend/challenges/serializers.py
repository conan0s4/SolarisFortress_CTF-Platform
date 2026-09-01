from rest_framework import serializers

from .models import Challenge, ChallengeFile, Submission, Solve


class ChallengeFileSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeFile
        fields = ("id", "original_name", "download_url", "uploaded_at")

    def get_download_url(self, obj):
        request = self.context.get("request")
        if obj.file and request is not None:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class ChallengeListSerializer(serializers.ModelSerializer):
    solved = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            "id",
            "name",
            "category",
            "points",
            "published",
            "created_at",
            "solved",
        )

    def get_solved(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return Solve.objects.filter(user=request.user, challenge=obj).exists()


class ChallengeDetailSerializer(serializers.ModelSerializer):
    files = ChallengeFileSerializer(many=True, read_only=True)
    solved = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            "id",
            "name",
            "category",
            "description",
            "points",
            "published",
            "created_at",
            "updated_at",
            "files",
            "solved",
        )
        # NOTE: `flag` is intentionally NOT included.

    def get_solved(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return Solve.objects.filter(user=request.user, challenge=obj).exists()


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ("id", "challenge", "submitted_flag", "is_correct", "submitted_at")
        read_only_fields = ("is_correct", "submitted_at")


class SubmitFlagSerializer(serializers.Serializer):
    flag = serializers.CharField(max_length=255, required=True, allow_blank=False, trim_whitespace=False)


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    score = serializers.IntegerField()
    solves = serializers.IntegerField()


class UserProgressSerializer(serializers.Serializer):
    solved_challenge_ids = serializers.ListField(child=serializers.IntegerField())
    score = serializers.IntegerField()