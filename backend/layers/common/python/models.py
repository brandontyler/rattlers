"""Data models for the application."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from uuid import uuid4


class LocationStatus(str, Enum):
    """Location status enum."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    FLAGGED = "flagged"


class FeedbackType(str, Enum):
    """Feedback type enum."""
    LIKE = "like"
    STAR = "star"


class SuggestionStatus(str, Enum):
    """Suggestion status enum."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Location(BaseModel):
    """Location model."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    address: str
    lat: float
    lng: float
    description: str
    photos: List[str] = Field(default_factory=list)
    status: LocationStatus = LocationStatus.ACTIVE
    feedback_count: int = Field(default=0, alias="feedbackCount")
    average_rating: float = Field(default=0.0, alias="averageRating")
    like_count: int = Field(default=0, alias="likeCount")
    report_count: int = Field(default=0, alias="reportCount")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="createdAt")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="updatedAt")
    created_by: Optional[str] = Field(default=None, alias="createdBy")

    class Config:
        populate_by_name = True
        use_enum_values = True

    @field_validator('lat')
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v

    @field_validator('lng')
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v


class Feedback(BaseModel):
    """Feedback model."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    location_id: str = Field(alias="locationId")
    user_id: str = Field(alias="userId")
    type: FeedbackType
    rating: Optional[int] = None
    comment: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="createdAt")

    class Config:
        populate_by_name = True
        use_enum_values = True

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class Suggestion(BaseModel):
    """Suggestion model."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    address: str
    description: str
    photos: List[str] = Field(default_factory=list)
    status: SuggestionStatus = SuggestionStatus.PENDING
    submitted_by: str = Field(alias="submittedBy")
    submitted_by_email: Optional[str] = Field(default=None, alias="submittedByEmail")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="createdAt")
    reviewed_at: Optional[str] = Field(default=None, alias="reviewedAt")
    reviewed_by: Optional[str] = Field(default=None, alias="reviewedBy")

    class Config:
        populate_by_name = True
        use_enum_values = True


class Report(BaseModel):
    """Report model."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    location_id: str = Field(alias="locationId")
    user_id: str = Field(alias="userId")
    reason: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="createdAt")

    class Config:
        populate_by_name = True


class UserProfile(BaseModel):
    """User profile model."""
    id: str
    email: str
    name: Optional[str] = None
    is_admin: bool = Field(default=False, alias="isAdmin")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="createdAt")

    class Config:
        populate_by_name = True
