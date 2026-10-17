"""Seed the database with sample challenges, platform configuration, and announcements for development/demo.

Run:
    python manage.py seed_demo
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from challenges.models import Challenge, Category, Difficulty, CompetitionConfig, Announcement


SAMPLE_CHALLENGES = [
    {
        "name": "Hidden Evidence",
        "category": Category.FORENSICS,
        "difficulty": Difficulty.EASY,
        "points": 100,
        "description": (
            "Analyze the provided evidence and find the hidden information.\n\n"
            "Forensic analysts often inspect exif metadata and file chunks."
        ),
        "hints": "Look closely at the metadata of the file (exiftool / strings).",
        "flag": "solaris{hidden_in_plain_sight}",
    },
    {
        "name": "Simple Login",
        "category": Category.WEB,
        "difficulty": Difficulty.MEDIUM,
        "points": 150,
        "description": (
            "A small web app is running on the local network. Bypass the login page\n"
            "without knowing the password and capture the flag displayed after a\n"
            "successful authentication."
        ),
        "hints": "The developer left a debug backdoor or SQL injection vulnerability in place.",
        "flag": "solaris{always_check_the_backdoor}",
    },
    {
        "name": "Caesar's Message",
        "category": Category.CRYPTOGRAPHY,
        "difficulty": Difficulty.EASY,
        "points": 75,
        "description": (
            "An ancient message was intercepted. Decrypt the ciphertext to find the flag.\n\n"
            "Ciphertext: \"frobly{ebgfg_pelcgb_vf_abg_pelcgb}\""
        ),
        "hints": "Caesar liked to shift his letters by 13 (ROT13).",
        "flag": "solaris{rotten_caesar_is_not_caesar}",
    },
    {
        "name": "Lost File",
        "category": Category.MISC,
        "difficulty": Difficulty.EASY,
        "points": 50,
        "description": (
            "A small file has gone missing from the workstation. Recover it and\n"
            "submit the flag contained inside."
        ),
        "hints": "Check base64 encoding or recycle bin remnants.",
        "flag": "solaris{lost_and_found}",
    },
    {
        "name": "Silent Image",
        "category": Category.STEGANOGRAPHY,
        "difficulty": Difficulty.HARD,
        "points": 200,
        "description": (
            "The image looks silent — but it isn't. Extract the hidden flag from\n"
            "the provided PNG using any technique you like."
        ),
        "hints": "Least Significant Bit (LSB) embedding or zsteg can uncover hidden payload bits.",
        "flag": "solaris{lsb_can_carry_a_secret}",
    },
]

SAMPLE_ANNOUNCEMENTS = [
    {
        "title": "Welcome to SolarisFortress CTF!",
        "content": "The competition is officially live. Explore the challenges catalog, submit flags in the format solaris{...}, and check your standing on the live leaderboard. Good luck!",
        "is_pinned": True,
    },
    {
        "title": "Platform Rules & Flag Format Reminder",
        "content": "All flags follow the strict format: solaris{...}. Submissions are case-sensitive. Please do not share flags or solutions with other participants.",
        "is_pinned": False,
    },
]


class Command(BaseCommand):
    help = "Insert sample CTF challenges, competition config, and announcements for demo."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Reset demo challenges before inserting.",
        )

    def handle(self, *args, **options):
        # 1. Ensure Competition Config
        config = CompetitionConfig.get_solo()
        config.title = "SolarisFortress CTF 2026"
        config.description = "The premier fortress cybersecurity competition. Test your skills across Web, Forensics, Crypto, Stego, and Reverse Engineering."
        config.is_active = True
        config.scoreboard_frozen = False
        config.registration_open = True
        config.save()
        self.stdout.write(self.style.SUCCESS("Initialized competition platform configuration."))

        # 2. Seed Challenges
        created = 0
        for data in SAMPLE_CHALLENGES:
            obj, was_created = Challenge.objects.get_or_create(
                name=data["name"],
                defaults={
                    "category": data["category"],
                    "difficulty": data["difficulty"],
                    "points": data["points"],
                    "description": data["description"],
                    "hints": data["hints"],
                    "flag": data["flag"],
                    "published": True,
                    "is_archived": False,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created challenge: {obj.name} ({obj.difficulty})"))
            else:
                # Update difficulty/hints if previously missing
                obj.difficulty = data["difficulty"]
                obj.hints = data["hints"]
                obj.save()

        # 3. Seed Announcements
        for ann in SAMPLE_ANNOUNCEMENTS:
            Announcement.objects.get_or_create(
                title=ann["title"],
                defaults={
                    "content": ann["content"],
                    "is_pinned": ann["is_pinned"],
                },
            )

        self.stdout.write(self.style.SUCCESS(f"\nDone. {created} challenge(s) created or verified."))