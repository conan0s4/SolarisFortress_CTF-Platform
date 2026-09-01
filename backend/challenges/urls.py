from django.urls import path

from . import views

urlpatterns = [
    # Auth
    path("auth/register/", views.register_view, name="api-register"),
    path("auth/login/", views.login_view, name="api-login"),
    path("auth/logout/", views.logout_view, name="api-logout"),
    path("auth/me/", views.me_view, name="api-me"),

    # Challenges
    path("challenges/", views.ChallengeListView.as_view(), name="api-challenges"),
    path("challenges/<int:pk>/", views.ChallengeDetailView.as_view(), name="api-challenge-detail"),
    path("challenges/<int:pk>/submit/", views.SubmitFlagView.as_view(), name="api-challenge-submit"),
    path("challenges/<int:pk>/files/<int:file_id>/",
         views.challenge_file_download, name="api-challenge-file"),

    # Submissions
    path("submissions/mine/", views.MySubmissionsView.as_view(), name="api-my-submissions"),

    # Leaderboard & progress
    path("leaderboard/", views.LeaderboardView.as_view(), name="api-leaderboard"),
    path("progress/", views.UserProgressView.as_view(), name="api-progress"),
]