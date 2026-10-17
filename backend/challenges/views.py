import csv
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Sum, Count, Q
from django.http import FileResponse, Http404, HttpResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET

from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

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
from .serializers import (
    ChallengeListSerializer,
    ChallengeDetailSerializer,
    SubmitFlagSerializer,
    LeaderboardEntrySerializer,
    UserProgressSerializer,
    CompetitionConfigSerializer,
    AnnouncementSerializer,
    AdminChallengeSerializer,
    AdminPlayerSerializer,
    AdminSubmissionSerializer,
    AdminScoreAdjustmentSerializer,
    AdminAuditLogSerializer,
    AdminAnnouncementSerializer,
)
from .utils import record_audit, calculate_user_score, get_scoreboard_rankings


# ---------------------------------------------------------------------------
# Public Authentication & User Management
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request):
    config = CompetitionConfig.get_solo()
    if not config.registration_open:
        return Response(
            {"detail": "Registration is currently closed by the organizers."},
            status=status.HTTP_403_FORBIDDEN,
        )

    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    password_confirm = request.data.get("password_confirm") or ""

    if not username or not password:
        return Response(
            {"detail": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(password) < 6:
        return Response(
            {"detail": "Password must be at least 6 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if password != password_confirm:
        return Response(
            {"detail": "Passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(username) > 150:
        return Response(
            {"detail": "Username is too long."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
    except IntegrityError:
        return Response(
            {"detail": "Username already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token, _ = Token.objects.get_or_create(user=user)
    login(request, user)
    record_audit(request, "USER_REGISTER", "User", user.id, user.username)

    score_info = calculate_user_score(user)
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "token": token.key,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "score": score_info["total_score"],
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response(
            {"detail": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user.is_active:
        return Response(
            {"detail": "This account has been disabled by an administrator."},
            status=status.HTTP_403_FORBIDDEN,
        )

    login(request, user)
    token, _ = Token.objects.get_or_create(user=user)
    score_info = calculate_user_score(user)

    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "token": token.key,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "score": score_info["total_score"],
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"detail": "Logged out."})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    user = request.user
    score_info = calculate_user_score(user)
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "score": score_info["total_score"],
            "solve_points": score_info["solve_points"],
            "adjustment_points": score_info["adjustment_points"],
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """Allows authenticated players to securely change their password."""
    user = request.user
    current_password = request.data.get("current_password") or ""
    new_password = request.data.get("new_password") or ""
    password_confirm = request.data.get("password_confirm") or ""

    if not current_password or not new_password or not password_confirm:
        return Response(
            {"detail": "Please fill in all password fields."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        return Response(
            {"detail": "Current password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if new_password != password_confirm:
        return Response(
            {"detail": "New passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 8:
        return Response(
            {"detail": "New password must be at least 8 characters long."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()
    login(request, user)  # Keep session active
    record_audit(request, "PASSWORD_CHANGE", "User", user.id, user.username)

    return Response({"detail": "Password changed successfully."})


# ---------------------------------------------------------------------------
# Public Competition & Announcements
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def competition_info_view(request):
    config = CompetitionConfig.get_solo()
    return Response(CompetitionConfigSerializer(config).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def announcements_view(request):
    announcements = Announcement.objects.all()[:20]
    return Response(AnnouncementSerializer(announcements, many=True).data)


# ---------------------------------------------------------------------------
# Public Challenges
# ---------------------------------------------------------------------------

class ChallengeListView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = Challenge.objects.filter(published=True, is_archived=False)
        data = ChallengeListSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class ChallengeDetailView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk, published=True, is_archived=False)
        data = ChallengeDetailSerializer(challenge, context={"request": request}).data
        return Response(data)


@require_GET
def challenge_file_download(request, pk, file_id):
    """Serve a challenge file securely."""
    if not request.user.is_authenticated:
        return HttpResponseForbidden("Authentication required.")

    file_obj = get_object_or_404(
        ChallengeFile.objects.select_related("challenge"),
        pk=file_id,
        challenge_id=pk,
        challenge__published=True,
        challenge__is_archived=False,
    )

    if not file_obj.file:
        raise Http404("File missing.")

    download_name = file_obj.original_name or file_obj.file.name.split("/")[-1]
    return FileResponse(file_obj.file.open("rb"), as_attachment=True, filename=download_name)


class SubmitFlagView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        config = CompetitionConfig.get_solo()
        now = timezone.now()

        if not config.is_active:
            return Response(
                {"detail": "Competition is currently paused."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if config.start_time and now < config.start_time:
            return Response(
                {"detail": "Competition has not started yet."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if config.end_time and now > config.end_time:
            return Response(
                {"detail": "Competition has ended. Submissions are closed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        challenge = get_object_or_404(Challenge, pk=pk, published=True, is_archived=False)

        serializer = SubmitFlagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = serializer.validated_data["flag"].strip()

        # Compare strictly case-sensitive with the stored flag
        is_correct = submitted == challenge.flag.strip()

        with transaction.atomic():
            submission = Submission.objects.create(
                user=request.user,
                challenge=challenge,
                submitted_flag=submitted,
                is_correct=is_correct,
            )

            already_solved = Solve.objects.filter(
                user=request.user, challenge=challenge
            ).exists()

            awarded_points = 0
            if is_correct and not already_solved:
                try:
                    Solve.objects.create(user=request.user, challenge=challenge)
                    awarded_points = challenge.points
                except IntegrityError:
                    already_solved = True

        score_info = calculate_user_score(request.user)

        return Response(
            {
                "submission_id": submission.id,
                "is_correct": is_correct,
                "already_solved": already_solved,
                "awarded_points": awarded_points,
                "total_score": score_info["total_score"],
                "solve_points": score_info["solve_points"],
                "adjustment_points": score_info["adjustment_points"],
                "challenge_id": challenge.id,
                "solved": is_correct or already_solved,
            },
            status=status.HTTP_200_OK,
        )


class MySubmissionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Submission.objects.filter(user=request.user).select_related("challenge")[:100]
        data = [
            {
                "id": s.id,
                "challenge_id": s.challenge_id,
                "challenge_name": s.challenge.name,
                "challenge_points": s.challenge.points,
                "is_correct": s.is_correct,
                "submitted_at": s.submitted_at,
            }
            for s in qs
        ]
        return Response(data)


# ---------------------------------------------------------------------------
# Public Leaderboard & User Progress
# ---------------------------------------------------------------------------

class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        rankings, is_frozen = get_scoreboard_rankings(for_admin=False)
        data = LeaderboardEntrySerializer(rankings, many=True).data
        return Response({
            "is_frozen": is_frozen,
            "entries": data,
        })


class UserProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        solves = Solve.objects.filter(user=request.user).select_related("challenge")
        solved_ids = [s.challenge_id for s in solves]
        score_info = calculate_user_score(request.user)
        return Response(
            UserProgressSerializer(
                {
                    "solved_challenge_ids": solved_ids,
                    "score": score_info["total_score"],
                    "solve_points": score_info["solve_points"],
                    "adjustment_points": score_info["adjustment_points"],
                }
            ).data
        )


# ===========================================================================
# ADMIN REST APIS (Enforced: permissions.IsAdminUser)
# ===========================================================================

class AdminOverviewView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_players = User.objects.filter(is_staff=False).count()
        total_staff = User.objects.filter(is_staff=True).count()
        total_challenges = Challenge.objects.count()
        published_challenges = Challenge.objects.filter(published=True, is_archived=False).count()
        archived_challenges = Challenge.objects.filter(is_archived=True).count()

        total_submissions = Submission.objects.count()
        correct_solves = Solve.objects.count()

        recent_submissions = Submission.objects.select_related("user", "challenge").order_by("-submitted_at")[:10]
        recent_logs = AuditLog.objects.select_related("actor").order_by("-created_at")[:8]

        config = CompetitionConfig.get_solo()

        # Category breakdown
        category_stats = (
            Challenge.objects.values("category")
            .annotate(count=Count("id"), total_points=Sum("points"))
            .order_by("category")
        )

        return Response({
            "metrics": {
                "total_players": total_players,
                "total_staff": total_staff,
                "total_challenges": total_challenges,
                "published_challenges": published_challenges,
                "archived_challenges": archived_challenges,
                "total_submissions": total_submissions,
                "correct_solves": correct_solves,
            },
            "competition": CompetitionConfigSerializer(config).data,
            "category_stats": list(category_stats),
            "recent_submissions": [
                {
                    "id": s.id,
                    "username": s.user.username,
                    "challenge_name": s.challenge.name,
                    "is_correct": s.is_correct,
                    "submitted_at": s.submitted_at,
                }
                for s in recent_submissions
            ],
            "recent_audit_logs": AdminAuditLogSerializer(recent_logs, many=True).data,
        })


class AdminCompetitionConfigView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        config = CompetitionConfig.get_solo()
        return Response(CompetitionConfigSerializer(config).data)

    def put(self, request):
        config = CompetitionConfig.get_solo()
        serializer = CompetitionConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        record_audit(
            request,
            "COMPETITION_CONFIG_UPDATE",
            "CompetitionConfig",
            config.id,
            config.title,
            details=request.data,
        )
        return Response(serializer.data)


class AdminChallengeListCreateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = Challenge.objects.all().prefetch_related("files", "solves").select_related("author")
        category = request.query_params.get("category")
        status_filter = request.query_params.get("status")
        search = request.query_params.get("search")

        if category and category != "All":
            qs = qs.filter(category=category)
        if status_filter == "published":
            qs = qs.filter(published=True, is_archived=False)
        elif status_filter == "draft":
            qs = qs.filter(published=False, is_archived=False)
        elif status_filter == "archived":
            qs = qs.filter(is_archived=True)

        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(flag__icontains=search))

        data = AdminChallengeSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

    def post(self, request):
        serializer = AdminChallengeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        challenge = serializer.save(author=request.user)

        record_audit(
            request,
            "CHALLENGE_CREATE",
            "Challenge",
            challenge.id,
            challenge.name,
            details={"points": challenge.points, "category": challenge.category},
        )
        return Response(AdminChallengeSerializer(challenge, context={"request": request}).data, status=status.HTTP_201_CREATED)


class AdminChallengeDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        return Response(AdminChallengeSerializer(challenge, context={"request": request}).data)

    def put(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        serializer = AdminChallengeSerializer(challenge, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        record_audit(
            request,
            "CHALLENGE_UPDATE",
            "Challenge",
            updated.id,
            updated.name,
            details=request.data,
        )
        return Response(serializer.data)

    def delete(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        name = challenge.name
        challenge.delete()

        record_audit(request, "CHALLENGE_DELETE", "Challenge", pk, name)
        return Response({"detail": f"Challenge '{name}' deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class AdminChallengeTogglePublishView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        challenge.published = not challenge.published
        challenge.save()

        action = "CHALLENGE_PUBLISH" if challenge.published else "CHALLENGE_UNPUBLISH"
        record_audit(request, action, "Challenge", challenge.id, challenge.name)

        return Response({
            "id": challenge.id,
            "published": challenge.published,
            "detail": f"Challenge is now {'published' if challenge.published else 'draft'}.",
        })


class AdminChallengeToggleArchiveView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        challenge.is_archived = not challenge.is_archived
        challenge.save()

        action = "CHALLENGE_ARCHIVE" if challenge.is_archived else "CHALLENGE_UNARCHIVE"
        record_audit(request, action, "Challenge", challenge.id, challenge.name)

        return Response({
            "id": challenge.id,
            "is_archived": challenge.is_archived,
            "detail": f"Challenge is now {'archived' if challenge.is_archived else 'active'}.",
        })


class AdminChallengeFileUploadView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk)
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        original_name = uploaded_file.name
        file_obj = ChallengeFile.objects.create(
            challenge=challenge,
            file=uploaded_file,
            original_name=original_name,
        )

        record_audit(
            request,
            "CHALLENGE_FILE_UPLOAD",
            "ChallengeFile",
            file_obj.id,
            f"{challenge.name} - {original_name}",
        )

        return Response({
            "id": file_obj.id,
            "original_name": file_obj.original_name,
            "download_url": request.build_absolute_uri(file_obj.file.url),
            "uploaded_at": file_obj.uploaded_at,
        }, status=status.HTTP_201_CREATED)


class AdminChallengeFileDeleteView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk, file_id):
        file_obj = get_object_or_404(ChallengeFile, pk=file_id, challenge_id=pk)
        name = file_obj.original_name
        file_obj.delete()

        record_audit(request, "CHALLENGE_FILE_DELETE", "ChallengeFile", file_id, name)
        return Response({"detail": "File deleted."}, status=status.HTTP_204_NO_CONTENT)


class AdminPlayerListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = User.objects.all().order_by("-date_joined")
        search = request.query_params.get("search")
        role = request.query_params.get("role")

        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
        if role == "staff":
            qs = qs.filter(is_staff=True)
        elif role == "player":
            qs = qs.filter(is_staff=False)

        data = AdminPlayerSerializer(qs, many=True).data
        return Response(data)


class AdminPlayerDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(AdminPlayerSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        current_actor = request.user

        # Prevent non-superusers from modifying superuser status or self-locking
        if "is_staff" in request.data:
            if user == current_actor and not request.data["is_staff"]:
                return Response(
                    {"detail": "You cannot remove your own administrative staff role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.is_staff = bool(request.data["is_staff"])

        if "is_active" in request.data:
            if user == current_actor and not request.data["is_active"]:
                return Response(
                    {"detail": "You cannot disable your own account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.is_active = bool(request.data["is_active"])

        user.save()
        record_audit(
            request,
            "PLAYER_STATUS_UPDATE",
            "User",
            user.id,
            user.username,
            details={"is_active": user.is_active, "is_staff": user.is_staff},
        )
        return Response(AdminPlayerSerializer(user).data)


class AdminSubmissionsListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = Submission.objects.select_related("user", "challenge").order_by("-submitted_at")
        user_id = request.query_params.get("user")
        challenge_id = request.query_params.get("challenge")
        is_correct = request.query_params.get("is_correct")
        search = request.query_params.get("search")

        if user_id:
            qs = qs.filter(user_id=user_id)
        if challenge_id:
            qs = qs.filter(challenge_id=challenge_id)
        if is_correct is not None and is_correct != "":
            qs = qs.filter(is_correct=(is_correct.lower() in ("1", "true", "yes")))
        if search:
            qs = qs.filter(
                Q(user__username__icontains=search)
                | Q(challenge__name__icontains=search)
                | Q(submitted_flag__icontains=search)
            )

        # Pagination limit
        limit = min(int(request.query_params.get("limit", 100)), 500)
        data = AdminSubmissionSerializer(qs[:limit], many=True).data
        return Response(data)


class AdminScoreAdjustmentListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = ScoreAdjustment.objects.select_related("user", "created_by", "reversed_by").order_by("-created_at")
        user_id = request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return Response(AdminScoreAdjustmentSerializer(qs, many=True).data)

    def post(self, request):
        user_id = request.data.get("user_id")
        points = request.data.get("points")
        reason = (request.data.get("reason") or "").strip()

        if not user_id:
            return Response({"detail": "Target user is required."}, status=status.HTTP_400_BAD_REQUEST)
        if points is None:
            return Response({"detail": "Point adjustment value is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            points = int(points)
        except (ValueError, TypeError):
            return Response({"detail": "Point adjustment must be a valid integer."}, status=status.HTTP_400_BAD_REQUEST)

        if not reason:
            return Response({"detail": "A mandatory reason must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, pk=user_id)

        with transaction.atomic():
            adjustment = ScoreAdjustment.objects.create(
                user=target_user,
                points=points,
                reason=reason,
                created_by=request.user,
            )
            record_audit(
                request,
                "SCORE_ADJUSTMENT",
                "ScoreAdjustment",
                adjustment.id,
                f"{target_user.username} ({points:+d} pts)",
                details={"target_user": target_user.username, "points": points, "reason": reason},
            )

        return Response(AdminScoreAdjustmentSerializer(adjustment).data, status=status.HTTP_201_CREATED)


class AdminScoreAdjustmentReverseView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        adjustment = get_object_or_404(ScoreAdjustment, pk=pk)
        if adjustment.is_reversed:
            return Response({"detail": "This adjustment is already reversed."}, status=status.HTTP_400_BAD_REQUEST)

        reversal_reason = (request.data.get("reversal_reason") or "Administrative reversal").strip()

        with transaction.atomic():
            adjustment.is_reversed = True
            adjustment.reversed_by = request.user
            adjustment.reversed_at = timezone.now()
            adjustment.reversal_reason = reversal_reason
            adjustment.save()

            record_audit(
                request,
                "SCORE_REVERSAL",
                "ScoreAdjustment",
                adjustment.id,
                f"Reversed adjustment of {adjustment.points:+d} pts for {adjustment.user.username}",
                details={"reason": reversal_reason},
            )

        return Response(AdminScoreAdjustmentSerializer(adjustment).data)


class AdminAuditLogListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = AuditLog.objects.select_related("actor").order_by("-created_at")
        action = request.query_params.get("action")
        target_type = request.query_params.get("target_type")
        search = request.query_params.get("search")

        if action:
            qs = qs.filter(action=action)
        if target_type:
            qs = qs.filter(target_type=target_type)
        if search:
            qs = qs.filter(
                Q(target_repr__icontains=search)
                | Q(action__icontains=search)
                | Q(actor__username__icontains=search)
            )

        limit = min(int(request.query_params.get("limit", 150)), 500)
        return Response(AdminAuditLogSerializer(qs[:limit], many=True).data)


class AdminAnnouncementListCreateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        announcements = Announcement.objects.all().select_related("created_by")
        return Response(AdminAnnouncementSerializer(announcements, many=True).data)

    def post(self, request):
        serializer = AdminAnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(created_by=request.user)

        record_audit(
            request,
            "ANNOUNCEMENT_CREATE",
            "Announcement",
            announcement.id,
            announcement.title,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminAnnouncementDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def put(self, request, pk):
        announcement = get_object_or_404(Announcement, pk=pk)
        serializer = AdminAnnouncementSerializer(announcement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        record_audit(
            request,
            "ANNOUNCEMENT_UPDATE",
            "Announcement",
            updated.id,
            updated.title,
        )
        return Response(serializer.data)

    def delete(self, request, pk):
        announcement = get_object_or_404(Announcement, pk=pk)
        title = announcement.title
        announcement.delete()

        record_audit(request, "ANNOUNCEMENT_DELETE", "Announcement", pk, title)
        return Response({"detail": f"Announcement '{title}' deleted."}, status=status.HTTP_204_NO_CONTENT)


class AdminExportScoresCSV(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        rankings, _ = get_scoreboard_rankings(for_admin=True)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="solarisfortress_scores.csv"'

        writer = csv.writer(response)
        writer.writerow(["Rank", "User ID", "Username", "Total Score", "Solves Count", "Solve Points", "Adjustment Points", "Last Activity"])

        for row in rankings:
            writer.writerow([
                row.get("rank"),
                row.get("user_id"),
                row.get("username"),
                row.get("score"),
                row.get("solve_count"),
                row.get("solve_points"),
                row.get("adjustment_points"),
                row.get("last_activity") or "",
            ])

        record_audit(request, "EXPORT_SCORES_CSV", "Export", "", "Scoreboard CSV exported")
        return response


class AdminExportSubmissionsCSV(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        submissions = Submission.objects.select_related("user", "challenge").order_by("-submitted_at")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="solarisfortress_submissions.csv"'

        writer = csv.writer(response)
        writer.writerow(["Submission ID", "User ID", "Username", "Challenge ID", "Challenge Name", "Submitted Flag", "Is Correct", "Submitted At"])

        for s in submissions:
            writer.writerow([
                s.id,
                s.user_id,
                s.user.username,
                s.challenge_id,
                s.challenge.name,
                s.submitted_flag,
                "YES" if s.is_correct else "NO",
                s.submitted_at.isoformat(),
            ])

        record_audit(request, "EXPORT_SUBMISSIONS_CSV", "Export", "", "Submissions CSV exported")
        return response