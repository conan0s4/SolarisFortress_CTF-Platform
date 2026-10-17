from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    Challenge,
    Solve,
    Submission,
    ScoreAdjustment,
    AuditLog,
    CompetitionConfig,
    Category,
    Difficulty,
)
from .utils import calculate_user_score


class SolarisFortressCTFTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create standard player
        self.player = User.objects.create_user(
            username="player1",
            password="Password123!",
            email="player1@solaris.ctf",
        )

        # Create admin staff user
        self.admin = User.objects.create_superuser(
            username="admin1",
            password="AdminPassword123!",
            email="admin@solaris.ctf",
        )

        # Initialize competition configuration
        self.config = CompetitionConfig.get_solo()
        self.config.is_active = True
        self.config.registration_open = True
        self.config.scoreboard_frozen = False
        self.config.save()

        # Create sample challenge
        self.challenge = Challenge.objects.create(
            name="Test Web Fortress",
            category=Category.WEB,
            difficulty=Difficulty.MEDIUM,
            points=100,
            flag="solaris{test_secret_flag_123}",
            description="Test challenge description",
            hints="Look closely",
            published=True,
            author=self.admin,
        )

    # -----------------------------------------------------------------------
    # Auth & Password Change Tests
    # -----------------------------------------------------------------------

    def test_user_registration_success(self):
        res = self.client.post(
            "/api/auth/register/",
            {
                "username": "new_player",
                "password": "SecretPassword123!",
                "password_confirm": "SecretPassword123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["username"], "new_player")
        self.assertTrue(User.objects.filter(username="new_player").exists())

    def test_registration_blocked_when_closed(self):
        self.config.registration_open = False
        self.config.save()

        res = self.client.post(
            "/api/auth/register/",
            {
                "username": "blocked_player",
                "password": "SecretPassword123!",
                "password_confirm": "SecretPassword123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_password_change_endpoint(self):
        self.client.force_authenticate(user=self.player)

        # 1. Invalid current password should fail
        res = self.client.post(
            "/api/auth/password/",
            {
                "current_password": "WrongPassword!",
                "new_password": "NewSecretPassword123!",
                "password_confirm": "NewSecretPassword123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Correct current password should succeed
        res = self.client.post(
            "/api/auth/password/",
            {
                "current_password": "Password123!",
                "new_password": "NewSecretPassword123!",
                "password_confirm": "NewSecretPassword123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Check new password works
        self.player.refresh_from_db()
        self.assertTrue(self.player.check_password("NewSecretPassword123!"))

    # -----------------------------------------------------------------------
    # Flag Privacy & Security Tests
    # -----------------------------------------------------------------------

    def test_flag_never_leaked_in_public_api(self):
        # Unauthenticated listing
        res = self.client.get("/api/challenges/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for chal in res.data:
            self.assertNotIn("flag", chal)

        # Authenticated participant detail
        self.client.force_authenticate(user=self.player)
        res = self.client.get(f"/api/challenges/{self.challenge.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertNotIn("flag", res.data)

    # -----------------------------------------------------------------------
    # Flag Submission & Scoring Tests
    # -----------------------------------------------------------------------

    def test_flag_submission_correct_and_duplicate(self):
        self.client.force_authenticate(user=self.player)

        # 1. Incorrect flag submission
        res = self.client.post(
            f"/api/challenges/{self.challenge.id}/submit/",
            {"flag": "solaris{wrong_flag}"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["is_correct"])
        self.assertEqual(res.data["awarded_points"], 0)
        self.assertEqual(res.data["total_score"], 0)

        # 2. Correct flag submission
        res = self.client.post(
            f"/api/challenges/{self.challenge.id}/submit/",
            {"flag": "solaris{test_secret_flag_123}"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_correct"])
        self.assertFalse(res.data["already_solved"])
        self.assertEqual(res.data["awarded_points"], 100)
        self.assertEqual(res.data["total_score"], 100)
        self.assertTrue(Solve.objects.filter(user=self.player, challenge=self.challenge).exists())

        # 3. Duplicate flag submission (should not award double points)
        res = self.client.post(
            f"/api/challenges/{self.challenge.id}/submit/",
            {"flag": "solaris{test_secret_flag_123}"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_correct"])
        self.assertTrue(res.data["already_solved"])
        self.assertEqual(res.data["awarded_points"], 0)
        self.assertEqual(res.data["total_score"], 100)

    # -----------------------------------------------------------------------
    # Manual Score Adjustments & Reversals Tests
    # -----------------------------------------------------------------------

    def test_manual_score_adjustments_and_reversals(self):
        self.client.force_authenticate(user=self.admin)

        # Initial score is 0
        self.assertEqual(calculate_user_score(self.player)["total_score"], 0)

        # Admin adds +50 bonus points
        res = self.client.post(
            "/api/admin/score-adjustments/",
            {
                "user_id": self.player.id,
                "points": 50,
                "reason": "First-blood speed bonus",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        adj_id = res.data["id"]

        # Score must be 50
        self.assertEqual(calculate_user_score(self.player)["total_score"], 50)

        # Admin adds -20 penalty
        res = self.client.post(
            "/api/admin/score-adjustments/",
            {
                "user_id": self.player.id,
                "points": -20,
                "reason": "Hint penalty",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Score must be 50 - 20 = 30
        self.assertEqual(calculate_user_score(self.player)["total_score"], 30)

        # Reverse the bonus (+50)
        res = self.client.post(
            f"/api/admin/score-adjustments/{adj_id}/reverse/",
            {"reversal_reason": "Mistaken award"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_reversed"])

        # Score should now be -20 (since +50 is reversed)
        self.assertEqual(calculate_user_score(self.player)["total_score"], -20)

    # -----------------------------------------------------------------------
    # Admin Permission Boundaries
    # -----------------------------------------------------------------------

    def test_regular_player_cannot_access_admin_apis(self):
        self.client.force_authenticate(user=self.player)

        admin_endpoints = [
            ("GET", "/api/admin/overview/"),
            ("GET", "/api/admin/challenges/"),
            ("POST", "/api/admin/challenges/"),
            ("GET", "/api/admin/players/"),
            ("GET", "/api/admin/score-adjustments/"),
            ("GET", "/api/admin/audit-logs/"),
            ("PUT", "/api/admin/competition/"),
        ]

        for method, endpoint in admin_endpoints:
            if method == "GET":
                res = self.client.get(endpoint)
            elif method == "POST":
                res = self.client.post(endpoint, {}, format="json")
            elif method == "PUT":
                res = self.client.put(endpoint, {}, format="json")
            self.assertEqual(
                res.status_code,
                status.HTTP_403_FORBIDDEN,
                f"Player should receive 403 on {endpoint}",
            )

    # -----------------------------------------------------------------------
    # Audit Logging Tests
    # -----------------------------------------------------------------------

    def test_audit_log_created_on_admin_actions(self):
        self.client.force_authenticate(user=self.admin)

        # Create challenge
        res = self.client.post(
            "/api/admin/challenges/",
            {
                "name": "Audit Test Challenge",
                "category": Category.CRYPTOGRAPHY,
                "difficulty": Difficulty.EASY,
                "points": 50,
                "flag": "solaris{audit_flag}",
                "description": "Desc",
                "published": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Check audit log was written
        log_entry = AuditLog.objects.filter(action="CHALLENGE_CREATE").first()
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry.actor, self.admin)
        self.assertEqual(log_entry.target_repr, "Audit Test Challenge")
