from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError, transaction
from django.db.models import Sum, Count, Q
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET

from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, ChallengeFile, Submission, Solve
from .serializers import (
    ChallengeListSerializer,
    ChallengeDetailSerializer,
    SubmitFlagSerializer,
    LeaderboardEntrySerializer,
    UserProgressSerializer,
)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request):
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

    from django.contrib.auth.models import User

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
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "token": token.key,
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

    login(request, user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "token": token.key,
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
    score = (
        Solve.objects.filter(user=user).aggregate(total=Sum("challenge__points"))[
            "total"
        ]
        or 0
    )
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "score": score,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    )


# ---------------------------------------------------------------------------
# Challenges
# ---------------------------------------------------------------------------

class ChallengeListView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = Challenge.objects.filter(published=True)
        data = ChallengeListSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class ChallengeDetailView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk, published=True)
        data = ChallengeDetailSerializer(challenge, context={"request": request}).data
        return Response(data)


@require_GET
def challenge_file_download(request, file_id):
    """Serve a challenge file.

    Only published challenges may be downloaded, and users must be authenticated.
    The original filename is preserved for the download.
    """
    if not request.user.is_authenticated:
        return HttpResponseForbidden("Authentication required.")

    file_obj = get_object_or_404(
        ChallengeFile.objects.select_related("challenge"),
        pk=file_id,
        challenge__published=True,
    )

    if not file_obj.file:
        raise Http404("File missing.")

    download_name = file_obj.original_name or file_obj.file.name.split("/")[-1]
    response = FileResponse(file_obj.file.open("rb"), as_attachment=True, filename=download_name)
    return response


# ---------------------------------------------------------------------------
# Submissions / scoring
# ---------------------------------------------------------------------------

class SubmitFlagView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        challenge = get_object_or_404(Challenge, pk=pk, published=True)

        serializer = SubmitFlagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = serializer.validated_data["flag"]

        # Compare strictly. Flags are case-sensitive and whitespace-trimmed
        # only on the submitted side; stored flags must match exactly.
        is_correct = submitted == challenge.flag

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
            Solve.objects.create(user=request.user, challenge=challenge)
            awarded_points = challenge.points

        total_score = (
            Solve.objects.filter(user=request.user).aggregate(
                total=Sum("challenge__points")
            )["total"]
            or 0
        )

        return Response(
            {
                "submission_id": submission.id,
                "is_correct": is_correct,
                "already_solved": already_solved,
                "awarded_points": awarded_points,
                "total_score": total_score,
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
                "is_correct": s.is_correct,
                "submitted_at": s.submitted_at,
            }
            for s in qs
        ]
        return Response(data)


# ---------------------------------------------------------------------------
# Leaderboard & progress
# ---------------------------------------------------------------------------

class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.contrib.auth.models import User

        rows = (
            Solve.objects.values("user")
            .annotate(score=Sum("challenge__points"), solves=Count("id"))
            .order_by("-score", "user")
        )

        user_map = {
            u.id: u
            for u in User.objects.filter(id__in=[r["user"] for r in rows])
        }

        entries = []
        for idx, row in enumerate(rows, start=1):
            user = user_map.get(row["user"])
            if not user:
                continue
            entries.append(
                {
                    "rank": idx,
                    "user_id": user.id,
                    "username": user.username,
                    "score": row["score"] or 0,
                    "solves": row["solves"] or 0,
                }
            )

        data = LeaderboardEntrySerializer(entries, many=True).data
        return Response(data)


class UserProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        solves = Solve.objects.filter(user=request.user).select_related("challenge")
        solved_ids = [s.challenge_id for s in solves]
        score = sum(s.challenge.points for s in solves)
        return Response(
            UserProgressSerializer(
                {"solved_challenge_ids": solved_ids, "score": score}
            ).data
        )