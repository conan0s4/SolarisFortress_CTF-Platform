from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Challenge,
    ChallengeFile,
    Submission,
    Solve,
    CompetitionConfig,
    Announcement,
    ScoreAdjustment,
    AuditLog,
)
from .utils import calculate_user_score


# ---------------------------------------------------------------------------
# Public Serializers (Flags strictly excluded)
# ---------------------------------------------------------------------------

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
    solve_count = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            "id",
            "name",
            "category",
            "difficulty",
            "points",
            "published",
            "created_at",
            "solved",
            "solve_count",
        )

    def get_solved(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return Solve.objects.filter(user=request.user, challenge=obj).exists()

    def get_solve_count(self, obj):
        return obj.solves.count()


class ChallengeDetailSerializer(serializers.ModelSerializer):
    files = ChallengeFileSerializer(many=True, read_only=True)
    solved = serializers.SerializerMethodField()
    solve_count = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            "id",
            "name",
            "category",
            "difficulty",
            "description",
            "hints",
            "points",
            "published",
            "created_at",
            "updated_at",
            "files",
            "solved",
            "solve_count",
        )

    def get_solved(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return Solve.objects.filter(user=request.user, challenge=obj).exists()

    def get_solve_count(self, obj):
        return obj.solves.count()


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ("id", "challenge", "submitted_flag", "is_correct", "submitted_at")
        read_only_fields = ("is_correct", "submitted_at")


class SubmitFlagSerializer(serializers.Serializer):
    flag = serializers.CharField(
        max_length=255, required=True, allow_blank=False, trim_whitespace=False
    )


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    score = serializers.IntegerField()
    solves = serializers.IntegerField(source="solve_count")
    solve_points = serializers.IntegerField()
    adjustment_points = serializers.IntegerField()


class UserProgressSerializer(serializers.Serializer):
    solved_challenge_ids = serializers.ListField(child=serializers.IntegerField())
    score = serializers.IntegerField()
    solve_points = serializers.IntegerField()
    adjustment_points = serializers.IntegerField()


class CompetitionConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionConfig
        fields = (
            "title",
            "description",
            "rules",
            "start_time",
            "end_time",
            "is_active",
            "scoreboard_frozen",
            "registration_open",
            "updated_at",
        )


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.username", read_only=True, default="Organizer"
    )

    class Meta:
        model = Announcement
        fields = ("id", "title", "content", "is_pinned", "created_at", "created_by_name")


# ---------------------------------------------------------------------------
# Admin Serializers (Strictly for staff/superusers)
# ---------------------------------------------------------------------------

class AdminChallengeSerializer(serializers.ModelSerializer):
    files = ChallengeFileSerializer(many=True, read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    solve_count = serializers.IntegerField(source="solves.count", read_only=True)

    class Meta:
        model = Challenge
        fields = (
            "id",
            "name",
            "category",
            "difficulty",
            "description",
            "hints",
            "points",
            "flag",
            "published",
            "is_archived",
            "created_at",
            "updated_at",
            "author",
            "author_username",
            "solve_count",
            "files",
        )


class AdminPlayerSerializer(serializers.ModelSerializer):
    score = serializers.SerializerMethodField()
    solve_count = serializers.SerializerMethodField()
    solves = serializers.SerializerMethodField()
    adjustments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "score",
            "solve_count",
            "solves",
            "adjustments",
        )
        read_only_fields = ("date_joined", "last_login", "score", "solve_count", "solves", "adjustments")

    def get_score(self, obj):
        return calculate_user_score(obj)

    def get_solve_count(self, obj):
        return obj.solves.count()

    def get_solves(self, obj):
        return [
            {
                "id": s.id,
                "challenge_id": s.challenge_id,
                "challenge_name": s.challenge.name,
                "points": s.challenge.points,
                "solved_at": s.solved_at,
            }
            for s in obj.solves.select_related("challenge")
        ]

    def get_adjustments(self, obj):
        return [
            {
                "id": a.id,
                "points": a.points,
                "reason": a.reason,
                "created_by": a.created_by.username if a.created_by else "System",
                "created_at": a.created_at,
                "is_reversed": a.is_reversed,
            }
            for a in obj.score_adjustments.all()
        ]


class AdminSubmissionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    challenge_name = serializers.CharField(source="challenge.name", read_only=True)
    challenge_points = serializers.IntegerField(source="challenge.points", read_only=True)

    class Meta:
        model = Submission
        fields = (
            "id",
            "user",
            "username",
            "challenge",
            "challenge_name",
            "challenge_points",
            "submitted_flag",
            "is_correct",
            "submitted_at",
        )


class AdminScoreAdjustmentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    reversed_by_name = serializers.CharField(source="reversed_by.username", read_only=True)

    class Meta:
        model = ScoreAdjustment
        fields = (
            "id",
            "user",
            "username",
            "points",
            "reason",
            "created_by",
            "created_by_name",
            "created_at",
            "is_reversed",
            "reversed_by",
            "reversed_by_name",
            "reversed_at",
            "reversal_reason",
        )
        read_only_fields = (
            "created_by",
            "created_by_name",
            "created_at",
            "is_reversed",
            "reversed_by",
            "reversed_by_name",
            "reversed_at",
            "reversal_reason",
        )


class AdminAuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default="System")

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_username",
            "action",
            "target_type",
            "target_id",
            "target_repr",
            "details",
            "ip_address",
            "created_at",
        )


class AdminAnnouncementSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default="System")

    class Meta:
        model = Announcement
        fields = ("id", "title", "content", "is_pinned", "created_at", "created_by", "created_by_username")
        read_only_fields = ("created_by", "created_by_username")