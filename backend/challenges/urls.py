from django.urls import path
from . import views

urlpatterns = [
    # -----------------------------------------------------------------------
    # Public Auth
    # -----------------------------------------------------------------------
    path("auth/register/", views.register_view, name="api-register"),
    path("auth/login/", views.login_view, name="api-login"),
    path("auth/logout/", views.logout_view, name="api-logout"),
    path("auth/me/", views.me_view, name="api-me"),
    path("auth/password/", views.change_password_view, name="api-password-change"),

    # -----------------------------------------------------------------------
    # Public Platform Information
    # -----------------------------------------------------------------------
    path("competition/", views.competition_info_view, name="api-competition-info"),
    path("announcements/", views.announcements_view, name="api-announcements"),

    # -----------------------------------------------------------------------
    # Public Challenges & Submissions
    # -----------------------------------------------------------------------
    path("challenges/", views.ChallengeListView.as_view(), name="api-challenges"),
    path("challenges/<int:pk>/", views.ChallengeDetailView.as_view(), name="api-challenge-detail"),
    path("challenges/<int:pk>/submit/", views.SubmitFlagView.as_view(), name="api-challenge-submit"),
    path("challenges/<int:pk>/files/<int:file_id>/", views.challenge_file_download, name="api-challenge-file"),
    path("submissions/mine/", views.MySubmissionsView.as_view(), name="api-my-submissions"),

    # -----------------------------------------------------------------------
    # Public Leaderboard & Progress
    # -----------------------------------------------------------------------
    path("leaderboard/", views.LeaderboardView.as_view(), name="api-leaderboard"),
    path("progress/", views.UserProgressView.as_view(), name="api-progress"),

    # -----------------------------------------------------------------------
    # Admin REST Management Endpoints
    # -----------------------------------------------------------------------
    path("admin/overview/", views.AdminOverviewView.as_view(), name="api-admin-overview"),
    path("admin/competition/", views.AdminCompetitionConfigView.as_view(), name="api-admin-competition"),

    path("admin/challenges/", views.AdminChallengeListCreateView.as_view(), name="api-admin-challenges"),
    path("admin/challenges/<int:pk>/", views.AdminChallengeDetailView.as_view(), name="api-admin-challenge-detail"),
    path("admin/challenges/<int:pk>/toggle-publish/", views.AdminChallengeTogglePublishView.as_view(), name="api-admin-challenge-toggle-publish"),
    path("admin/challenges/<int:pk>/toggle-archive/", views.AdminChallengeToggleArchiveView.as_view(), name="api-admin-challenge-toggle-archive"),
    path("admin/challenges/<int:pk>/upload-file/", views.AdminChallengeFileUploadView.as_view(), name="api-admin-challenge-upload-file"),
    path("admin/challenges/<int:pk>/files/<int:file_id>/", views.AdminChallengeFileDeleteView.as_view(), name="api-admin-challenge-file-delete"),

    path("admin/players/", views.AdminPlayerListView.as_view(), name="api-admin-players"),
    path("admin/players/<int:pk>/", views.AdminPlayerDetailView.as_view(), name="api-admin-player-detail"),

    path("admin/submissions/", views.AdminSubmissionsListView.as_view(), name="api-admin-submissions"),

    path("admin/score-adjustments/", views.AdminScoreAdjustmentListView.as_view(), name="api-admin-score-adjustments"),
    path("admin/score-adjustments/<int:pk>/reverse/", views.AdminScoreAdjustmentReverseView.as_view(), name="api-admin-score-adjustment-reverse"),

    path("admin/audit-logs/", views.AdminAuditLogListView.as_view(), name="api-admin-audit-logs"),

    path("admin/announcements/", views.AdminAnnouncementListCreateView.as_view(), name="api-admin-announcements"),
    path("admin/announcements/<int:pk>/", views.AdminAnnouncementDetailView.as_view(), name="api-admin-announcement-detail"),

    path("admin/export/scores/", views.AdminExportScoresCSV.as_view(), name="api-admin-export-scores"),
    path("admin/export/submissions/", views.AdminExportSubmissionsCSV.as_view(), name="api-admin-export-submissions"),
]