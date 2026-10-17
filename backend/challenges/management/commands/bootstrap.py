"""Provision the initial administrator account during deployment.

This command is idempotent and safe to run on every Vercel build:

* If ``ADMIN_USERNAME`` and ``ADMIN_PASSWORD`` are provided, it creates the
  superuser (or ensures an existing account has the staff/superuser flags).
  Existing passwords are never overwritten.
* If ``SEED_DEMO`` is truthy, it also loads the demo challenges, config, and
  announcements.
* If no administrator credentials are configured, it exits cleanly so preview
  builds without secrets still succeed.

Environment variables (``DJANGO_SUPERUSER_*`` fallbacks are supported):
    ADMIN_USERNAME / DJANGO_SUPERUSER_USERNAME
    ADMIN_EMAIL    / DJANGO_SUPERUSER_EMAIL
    ADMIN_PASSWORD / DJANGO_SUPERUSER_PASSWORD
    SEED_DEMO

Run locally:
    python manage.py bootstrap
"""
import os

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

TRUTHY = ("1", "true", "yes", "on")


class Command(BaseCommand):
    help = "Create/ensure the admin superuser (and optional demo data) for deployment."

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME") or os.environ.get(
            "DJANGO_SUPERUSER_USERNAME"
        )
        email = os.environ.get("ADMIN_EMAIL") or os.environ.get(
            "DJANGO_SUPERUSER_EMAIL", ""
        )
        password = os.environ.get("ADMIN_PASSWORD") or os.environ.get(
            "DJANGO_SUPERUSER_PASSWORD"
        )

        if not username or not password:
            self.stdout.write(
                "ADMIN_USERNAME/ADMIN_PASSWORD not set; skipping admin provisioning."
            )
        else:
            User = get_user_model()
            user, created = User.objects.get_or_create(
                username=username, defaults={"email": email}
            )
            changed = False

            if created:
                user.set_password(password)
                changed = True

            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
            if email and user.email != email:
                user.email = email
                changed = True

            if changed:
                user.save()

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Created superuser '{username}'.")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Superuser '{username}' already exists; ensured staff/superuser flags."
                    )
                )

        if os.environ.get("SEED_DEMO", "").lower() in TRUTHY:
            call_command("seed_demo")
            self.stdout.write(self.style.SUCCESS("Demo data seeded."))

        self.stdout.write(self.style.SUCCESS("Bootstrap complete."))
