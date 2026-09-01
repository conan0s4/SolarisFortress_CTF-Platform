"""Seed the database with sample challenges for development/demo.

Run:
    python manage.py seed_demo
"""
from django.core.management.base import BaseCommand

from challenges.models import Challenge, Category


SAMPLE_CHALLENGES = [
    {
        "name": "Hidden Evidence",
        "category": Category.FORENSICS,
        "points": 100,
        "description": (
            "Analyze the provided evidence and find the hidden information.\n\n"
            "Hint: Look closely at the metadata of the file."
        ),
        "flag": "solaris{hidden_in_plain_sight}",
    },
    {
        "name": "Simple Login",
        "category": Category.WEB,
        "points": 150,
        "description": (
            "A small web app is running on the local network. Bypass the login page\n"
            "without knowing the password and capture the flag displayed after a\n"
            "successful authentication.\n\n"
            "Hint: The developer left a debug backdoor in place."
        ),
        "flag": "solaris{always_check_the_backdoor}",
    },
    {
        "name": "Caesar's Message",
        "category": Category.CRYPTOGRAPHY,
        "points": 75,
        "description": (
            "An ancient message was intercepted. Decrypt the ciphertext to find the flag.\n\n"
            "Ciphertext: \"frobly{ebgfg_pelcgb_vf_abg_pelcgb}\"\n\n"
            "Hint: Caesar liked to shift his letters by 13."
        ),
        "flag": "solaris{rotten_caesar_is_not_caesar}",
    },
    {
        "name": "Lost File",
        "category": Category.MISC,
        "points": 50,
        "description": (
            "A small file has gone missing from the workstation. Recover it and\n"
            "submit the flag contained inside."
        ),
        "flag": "solaris{lost_and_found}",
    },
    {
        "name": "Silent Image",
        "category": Category.STEGANOGRAPHY,
        "points": 200,
        "description": (
            "The image looks silent — but it isn't. Extract the hidden flag from\n"
            "the provided PNG using any technique you like."
        ),
        "flag": "solaris{lsb_can_carry_a_secret}",
    },
]


class Command(BaseCommand):
    help = "Insert sample CTF challenges for development/demo purposes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing sample challenges (flag starting with solaris{hidden_in_plain_sight or sample-flag) before inserting.",
        )

    def handle(self, *args, **options):
        created = 0
        for data in SAMPLE_CHALLENGES:
            obj, was_created = Challenge.objects.get_or_create(
                name=data["name"],
                defaults={
                    "category": data["category"],
                    "points": data["points"],
                    "description": data["description"],
                    "flag": data["flag"],
                    "published": True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created challenge: {obj.name}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone. {created} challenge(s) created."))
        self.stdout.write("Run the Django admin at /admin/ to add files and manage challenges.")