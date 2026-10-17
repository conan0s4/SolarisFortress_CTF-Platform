"""Django storage backend backed by Vercel Blob.

Challenge attachments are stored in a Vercel Blob store so they survive
serverless redeployments (the function filesystem is ephemeral and read-only).

The ``FileField`` keeps the blob *pathname* (e.g. ``challenge_files/7/flag.zip``).
Because Vercel Blob delivery URLs are deterministic
(``https://<store-id>.<access>.blob.vercel-storage.com/<pathname>``) the public
URL is derived from the pathname without an extra API round-trip.

Credentials are resolved by the SDK from the ``BLOB_READ_WRITE_TOKEN`` or an
OIDC token paired with ``BLOB_STORE_ID`` that Vercel injects once a Blob store is
connected to the project.
"""
from __future__ import annotations

import os
from urllib.parse import quote

from django.core.files.base import ContentFile
from django.core.files.storage import Storage

_BLOB_HOST_SUFFIX = ".blob.vercel-storage.com"
_RW_TOKEN_PREFIX = "vercel_blob_rw_"


def blob_enabled() -> bool:
    """Whether a Vercel Blob store has been configured for this environment."""
    return bool(
        os.environ.get("BLOB_READ_WRITE_TOKEN") or os.environ.get("BLOB_STORE_ID")
    )


def _resolve_store_id() -> str | None:
    """Return the Blob store id (without the ``store_`` prefix), if discoverable."""
    store_id = os.environ.get("BLOB_STORE_ID")
    if store_id:
        return store_id.removeprefix("store_")

    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "")
    if token.startswith(_RW_TOKEN_PREFIX):
        remainder = token[len(_RW_TOKEN_PREFIX):]
        store_id = remainder.split("_", 1)[0]
        if store_id:
            return store_id
    return None


class VercelBlobStorage(Storage):
    """Store ``FileField`` contents in Vercel Blob (public access by default)."""

    def __init__(self, access: str = "public"):
        access = os.environ.get("BLOB_ACCESS", access)
        if access not in ("public", "private"):
            raise ValueError("Blob access must be 'public' or 'private'")
        self.access = access

    # -- helpers -----------------------------------------------------------
    def _blob(self):
        from vercel.blob import sync as blob

        return blob

    @property
    def store_id(self) -> str:
        store_id = _resolve_store_id()
        if not store_id:
            raise RuntimeError(
                "Vercel Blob is not configured: set BLOB_READ_WRITE_TOKEN or "
                "BLOB_STORE_ID."
            )
        return store_id

    # -- Django Storage API ------------------------------------------------
    def _save(self, name, content):
        blob = self._blob()
        content_type = getattr(content, "content_type", None) or None
        size = getattr(content, "size", None)

        if size is not None:
            result = blob.put_blob(
                name,
                content,
                access=self.access,
                content_length=size,
                content_type=content_type,
                add_random_suffix=True,
            )
        else:
            result = blob.put_blob(
                name,
                content.read(),
                access=self.access,
                content_type=content_type,
                add_random_suffix=True,
            )
        return result.pathname

    def _open(self, name, mode="rb"):
        result = self._blob().get_blob(name, access=self.access)
        return ContentFile(result.body, name=name)

    def delete(self, name):
        if not name:
            return
        self._blob().delete_blob(name)

    def exists(self, name):
        blob = self._blob()
        try:
            blob.head_blob(name)
        except blob.BlobNotFoundError:
            return False
        return True

    def size(self, name):
        return self._blob().head_blob(name).size

    def url(self, name):
        if not name:
            return ""
        if name.startswith(("http://", "https://")):
            return name
        path = quote(name.lstrip("/"), safe="/")
        return f"https://{self.store_id.lower()}.{self.access}{_BLOB_HOST_SUFFIX}/{path}"

    def get_available_name(self, name, max_length=None):
        # Uploads always receive a random suffix, so name clashes cannot occur.
        return name
