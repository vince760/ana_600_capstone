"""Authentication helpers for backend API requests."""

from __future__ import annotations

from dataclasses import dataclass
import os

import httpx


class AuthenticationError(ValueError):
    """Raised when a request cannot be authenticated."""


@dataclass(frozen=True)
class RequestActor:
    user_id: str | None
    auth_mode: str


class SupabaseTokenVerifier:
    """Resolves a Supabase user id from a bearer access token."""

    def __init__(
        self,
        *,
        supabase_url: str,
        api_key: str,
        timeout_seconds: float = 10.0,
    ) -> None:
        self._user_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def verify(self, access_token: str) -> str:
        try:
            response = httpx.get(
                self._user_url,
                headers={
                    "apikey": self._api_key,
                    "Authorization": f"Bearer {access_token}",
                },
                timeout=self._timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AuthenticationError(
                f"Supabase authentication failed with status {exc.response.status_code}."
            ) from exc
        except httpx.HTTPError as exc:
            raise AuthenticationError(f"Supabase authentication request failed: {exc}") from exc

        payload = response.json()
        user_id = payload.get("id")
        if not user_id:
            raise AuthenticationError("Supabase user payload did not include an id.")
        return str(user_id)


class RequestActorResolver:
    """Builds request actor information from Authorization headers."""

    def __init__(
        self,
        *,
        auth_mode: str,
        verifier: SupabaseTokenVerifier | None = None,
    ) -> None:
        self.auth_mode = auth_mode
        self._verifier = verifier

    @classmethod
    def from_env(cls) -> "RequestActorResolver":
        auth_mode = os.getenv("FINSIGHT_AUTH_MODE", "disabled").strip().lower()
        if auth_mode == "disabled":
            return cls(auth_mode=auth_mode)

        if auth_mode != "supabase":
            raise ValueError(
                "FINSIGHT_AUTH_MODE must be either 'disabled' or 'supabase'."
            )

        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        api_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        if not supabase_url or not api_key:
            raise ValueError(
                "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY "
                "(or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set when FINSIGHT_AUTH_MODE=supabase."
            )

        timeout_seconds = float(os.getenv("SUPABASE_HTTP_TIMEOUT_SECONDS", "10"))
        verifier = SupabaseTokenVerifier(
            supabase_url=supabase_url,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )
        return cls(auth_mode=auth_mode, verifier=verifier)

    def resolve(self, authorization: str | None) -> RequestActor:
        if self.auth_mode == "disabled":
            return RequestActor(user_id=None, auth_mode=self.auth_mode)

        if not authorization:
            raise AuthenticationError("Authorization header is required.")

        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise AuthenticationError("Authorization header must use Bearer token format.")

        if self._verifier is None:
            raise AuthenticationError("No token verifier is configured.")

        user_id = self._verifier.verify(token)
        return RequestActor(user_id=user_id, auth_mode=self.auth_mode)
