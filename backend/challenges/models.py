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


class Challenge(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        default=Category.MISC,
    )
    description = models.TextField()
    points = models.PositiveIntegerField(default=100)
    flag = models.CharField(
        max_length=255,
        help_text="The exact flag (e.g. solaris{hidden_in_plain_sight}). Never exposed via API.",
    )
    published = models.BooleanField(
        default=False,
        help_text="Only published challenges are visible to participants.",
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
        return f"[{self.category}] {self.name} ({self.points})"


def challenge_file_path(instance, filename):
    # Store under media/challenge_files/<challenge_id>/<filename>
    return f"challenge_files/{instance.challenge_id}/{filename}"


class ChallengeFile(models.Model):
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="files"
    )
    file = models.FileField(upload_to=challenge_file_path)
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
    """Records the first time a user solved a challenge.

    Used both for scoring and to detect duplicates. A user can only
    have one Solve per challenge.
    """

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