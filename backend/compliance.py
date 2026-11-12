"""
AeroLicense — single source of truth for document status.

A document is:
  * "expired"  when its expiry date is in the past (days_left < 0);
  * "expiring" when it expires today or within EXPIRY_WARNING_DAYS (0 <= days_left <= 30);
  * "valid"    otherwise (days_left > 30).

A pilot is compliant when they have at least one document and none is expired.
"""

from collections.abc import Iterable
from datetime import date, datetime
from typing import Literal

EXPIRY_WARNING_DAYS = 30

DocStatus = Literal["expired", "expiring", "valid"]

# Status strings exposed by the API (part of the frontend contract: do not rename).
API_STATUS: dict[str, str] = {"expired": "expired", "expiring": "expiring_soon", "valid": "valid"}


def _as_date(value: date | datetime | str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(value[:10])


def days_left(expires_at: date | datetime | str, today: date | None = None) -> int:
    """Whole days from today until expires_at (negative once expired)."""
    return (_as_date(expires_at) - (today or date.today())).days


def status_from_days(days: int) -> DocStatus:
    if days < 0:
        return "expired"
    if days <= EXPIRY_WARNING_DAYS:
        return "expiring"
    return "valid"


def doc_status(expires_at: date | datetime | str, today: date | None = None) -> DocStatus:
    """Status of a document expiring on expires_at, as seen on `today`."""
    return status_from_days(days_left(expires_at, today))


def api_status(expires_at: date | datetime | str, today: date | None = None) -> str:
    """doc_status mapped to the API's status strings ("expiring" -> "expiring_soon")."""
    return API_STATUS[doc_status(expires_at, today)]


def pilot_compliant(expiry_dates: Iterable[date | datetime | str], today: date | None = None) -> bool:
    """True when the pilot has at least one document and none is expired."""
    dates = list(expiry_dates)
    return bool(dates) and all(doc_status(e, today) != "expired" for e in dates)
