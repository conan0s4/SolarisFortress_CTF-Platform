from django.db.models import Sum, Max
from .models import Solve, ScoreAdjustment, AuditLog, CompetitionConfig


def get_client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit(request, action, target_type, target_id="", target_repr="", details=None):
    """Safely records an administrative or security audit log."""
    try:
        actor = getattr(request, "user", None)
        if actor and not actor.is_authenticated:
            actor = None
        ip_address = get_client_ip(request)
        return AuditLog.objects.create(
            actor=actor,
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            target_repr=str(target_repr)[:255],
            details=details or {},
            ip_address=ip_address,
        )
    except Exception as exc:
        # Never let logging failure crash the primary business transaction
        print(f"[AuditLog Error] {exc}")
        return None


def calculate_user_score(user):
    """Authoritatively computes user's total score including solves and net score adjustments."""
    solve_pts = (
        Solve.objects.filter(user=user).aggregate(total=Sum("challenge__points"))["total"]
        or 0
    )
    adj_pts = (
        ScoreAdjustment.objects.filter(user=user, is_reversed=False).aggregate(
            total=Sum("points")
        )["total"]
        or 0
    )
    return {
        "solve_points": solve_pts,
        "adjustment_points": adj_pts,
        "total_score": solve_pts + adj_pts,
    }


def get_scoreboard_rankings(for_admin=False):
    """Computes complete scoreboard with ranks, solve counts, point breakdowns, and tie-breaking.

    Tie-breaker: total score descending, then earliest last activity timestamp, then username.
    """
    from django.contrib.auth.models import User

    config = CompetitionConfig.get_solo()
    is_frozen = config.scoreboard_frozen and not for_admin

    users = User.objects.filter(is_active=True).all()
    rows = []

    for u in users:
        solves_qs = Solve.objects.filter(user=u)
        solve_count = solves_qs.count()
        solve_pts = solves_qs.aggregate(total=Sum("challenge__points"))["total"] or 0
        adj_pts = (
            ScoreAdjustment.objects.filter(user=u, is_reversed=False).aggregate(
                total=Sum("points")
            )["total"]
            or 0
        )
        total_score = solve_pts + adj_pts

        # Only list users who have solved at least one challenge or received an adjustment (or if admin)
        if total_score == 0 and solve_count == 0 and not for_admin:
            continue

        # Last solve timestamp for tie breaking
        last_solve = solves_qs.aggregate(latest=Max("solved_at"))["latest"]
        last_adj = (
            ScoreAdjustment.objects.filter(user=u, is_reversed=False).aggregate(
                latest=Max("created_at")
            )["latest"]
        )
        last_activity = max(
            [d for d in [last_solve, last_adj] if d is not None],
            default=None,
        )

        rows.append({
            "user_id": u.id,
            "username": u.username,
            "solve_count": solve_count,
            "solve_points": solve_pts,
            "adjustment_points": adj_pts,
            "score": total_score,
            "last_activity": last_activity,
        })

    # Sort: score descending, then last_activity ascending (earlier is better tie-breaker), then username
    # For null last_activity, put far in future
    from datetime import datetime, timezone
    far_future = datetime(2099, 1, 1, tzinfo=timezone.utc)
    rows.sort(key=lambda r: (-r["score"], r["last_activity"] or far_future, r["username"].lower()))

    # Assign ranks with equal scores handling
    current_rank = 1
    ranked = []
    for idx, item in enumerate(rows):
        if idx > 0 and item["score"] == rows[idx - 1]["score"]:
            item["rank"] = ranked[idx - 1]["rank"]
        else:
            item["rank"] = idx + 1
        ranked.append(item)

    return ranked, is_frozen
