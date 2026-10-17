from django.conf import settings
from django.db import models


class Category(models.TextChoices):
    WEB = "Web", "Web"
    FORENSICS = "Forensics", "Forensics"
    CRYPTOGRAPHY = "Cryptography", "Cryptography"
    REVERSE = "Reverse Engineering", "Reverse Engineering"
    OSINT = "OSINT", "OSINT"
    MISC = "Miscellaneous", "Miscellaneous"
    STEGANOGRAPHY = "Steganography", "Steganography"


class Difficulty(models.TextChoices):
    EASY = "Easy", "Easy"
    MEDIUM = "Medium", "Medium"
    HARD = "Hard", "Hard"
    INSANE = "Insane", "Insane"


class Challenge(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        default=Category.MISC,
    )
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
    )
    description = models.TextField()
    hints = models.TextField(
        blank=True,
        default="",
        help_text="Optional hints provided to participants.",
    )
    points = models.PositiveIntegerField(default=100)
    flag = models.CharField(
        max_length=255,
        help_text="The exact flag (e.g. solaris{hidden_in_plain_sight}). Never exposed via participant API.",
    )
    published = models.BooleanField(
        default=False,
        help_text="Only published challenges are visible to participants.",
    )
    is_archived = models.BooleanField(
        default=False,
        help_text="Archived challenges are hidden from normal competition listings.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_challenges",
    )

    class Meta:
        ordering = ["category", "points", "name"]

    def __str__(self) -> str:
        return f"[{self.category} - {self.difficulty}] {self.name} ({self.points} pts)"


def challenge_file_path(instance, filename):
    return f"challenge_files/{instance.challenge_id}/{filename}"


class ChallengeFile(models.Model):
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="files"
    )
    file = models.FileField(upload_to=challenge_file_path, max_length=500)
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]

    def __str__(self) -> str:
        return f"{self.challenge.name} - {self.original_name or self.file.name}"


class Submission(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="submissions"
    )
    submitted_flag = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self) -> str:
        status = "correct" if self.is_correct else "incorrect"
        return f"{self.user} -> {self.challenge} ({status})"


class Solve(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="solves",
    )
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="solves"
    )
    solved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "challenge")
        ordering = ["-solved_at"]

    def __str__(self) -> str:
        return f"{self.user} solved {self.challenge}"


class CompetitionConfig(models.Model):
    """Platform-wide competition configuration singleton."""
    title = models.CharField(max_length=200, default="SolarisFortress CTF")
    description = models.TextField(
        blank=True,
        default="Welcome to the SolarisFortress CTF Platform. Capture flags, climb the leaderboard, and conquer the fortress.",
    )
    rules = models.TextField(
        blank=True,
        default="1. Do not attack the platform infrastructure or denial-of-service servers.\n2. Do not share flags or solutions with other participants.\n3. Brute forcing flags is prohibited.\n4. Enjoy the challenges and learn responsibly!",
    )
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    scoreboard_frozen = models.BooleanField(default=False)
    registration_open = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Competition Configuration"
        verbose_name_plural = "Competition Configuration"

    def __str__(self) -> str:
        return f"{self.title} (Active: {self.is_active})"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj


class Announcement(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="announcements",
    )

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self) -> str:
        return f"[{'PINNED' if self.is_pinned else 'NEWS'}] {self.title}"


class ScoreAdjustment(models.Model):
    """Persistent ledger model for manual score modifications (bonuses, penalties)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="score_adjustments",
    )
    points = models.IntegerField(
        help_text="Points to add (positive) or deduct (negative)."
    )
    reason = models.TextField(
        help_text="Mandatory explanation for this score adjustment."
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_score_adjustments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    is_reversed = models.BooleanField(default=False)
    reversed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_score_adjustments",
    )
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversal_reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        status = " [REVERSED]" if self.is_reversed else ""
        return f"Adjustment {self.points:+d} pts for {self.user.username}{status}"


class AuditLog(models.Model):
    """Persistent security & admin action audit record."""
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100, blank=True, default="")
    target_repr = models.CharField(max_length=255, blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        actor_name = self.actor.username if self.actor else "System"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {actor_name}: {self.action} on {self.target_type} ({self.target_repr})"