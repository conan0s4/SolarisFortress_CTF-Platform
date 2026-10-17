from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Challenge,
    ChallengeFile,
    Submission,
    Solve,
    CompetitionConfig,
    Announcement,
    ScoreAdjustment,
    AuditLog,
)


class ChallengeFileInline(admin.TabularInline):
    model = ChallengeFile
    extra = 0
    fields = ("file", "original_name", "uploaded_at")
    readonly_fields = ("uploaded_at",)


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "difficulty", "points", "published", "is_archived", "updated_at")
    list_filter = ("category", "difficulty", "published", "is_archived", "points")
    search_fields = ("name", "description", "flag")
    list_editable = ("published", "points")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            None,
            {
                "fields": ("name", "category", "difficulty", "points", "published", "is_archived"),
            },
        ),
        (
            "Content",
            {
                "fields": ("description", "hints"),
            },
        ),
        (
            "Flag (server-side only — never sent to participants)",
            {
                "fields": ("flag",),
                "description": "The flag is stored here and only validated on the backend.",
            },
        ),
        (
            "Metadata",
            {
                "fields": ("author", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )
    inlines = [ChallengeFileInline]

    def save_model(self, request, obj, form, change):
        if not change and not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(ChallengeFile)
class ChallengeFileAdmin(admin.ModelAdmin):
    list_display = ("challenge", "original_name", "uploaded_at", "file_link")
    list_filter = ("challenge",)
    search_fields = ("challenge__name", "original_name")

    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">download</a>', obj.file.url)
        return "-"
    file_link.short_description = "File"


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "challenge", "is_correct", "submitted_at")
    list_filter = ("is_correct", "challenge__category")
    search_fields = ("user__username", "challenge__name", "submitted_flag")
    readonly_fields = ("user", "challenge", "submitted_flag", "is_correct", "submitted_at")

    def has_add_permission(self, request):
        return False


@admin.register(Solve)
class SolveAdmin(admin.ModelAdmin):
    list_display = ("user", "challenge", "solved_at")
    list_filter = ("challenge__category",)
    search_fields = ("user__username", "challenge__name")
    readonly_fields = ("user", "challenge", "solved_at")

    def has_add_permission(self, request):
        return False


@admin.register(CompetitionConfig)
class CompetitionConfigAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "scoreboard_frozen", "registration_open", "updated_at")

    def has_add_permission(self, request):
        return not CompetitionConfig.objects.exists()


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "is_pinned", "created_at", "created_by")
    list_filter = ("is_pinned",)
    search_fields = ("title", "content")


@admin.register(ScoreAdjustment)
class ScoreAdjustmentAdmin(admin.ModelAdmin):
    list_display = ("user", "points", "reason", "created_by", "created_at", "is_reversed")
    list_filter = ("is_reversed", "created_at")
    search_fields = ("user__username", "reason", "created_by__username")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "target_type", "target_repr", "ip_address")
    list_filter = ("action", "target_type", "created_at")
    search_fields = ("target_repr", "action", "actor__username")
    readonly_fields = ("created_at", "actor", "action", "target_type", "target_id", "target_repr", "details", "ip_address")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False