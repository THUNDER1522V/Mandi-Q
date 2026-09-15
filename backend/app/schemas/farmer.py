from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FarmerBase(BaseModel):
    farmer_name: str = Field(..., min_length=2, max_length=100, description="Farmer's full name")
    phone_number: str = Field(
        ...,
        pattern=r"^\+?[0-9]{10,15}$",
        description="Farmer's 10-15 digit phone number (e.g., +919876543210 or 9876543210)"
    )
    village: str = Field(..., min_length=1, max_length=100)
    district: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    preferred_language: str = Field(default="Hindi", max_length=30)

    @field_validator("farmer_name", "village", "district", "state", mode="after")
    @classmethod
    def check_not_blank(cls, v: str) -> str:
        if isinstance(v, str) and not v.strip():
            raise ValueError("Field cannot be blank or whitespace only")
        return v.strip()


class FarmerCreate(FarmerBase):
    pass


class FarmerUpdate(BaseModel):
    farmer_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    village: Optional[str] = Field(None, min_length=1, max_length=100)
    district: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=1, max_length=100)
    preferred_language: Optional[str] = Field(None, max_length=30)

    @field_validator("farmer_name", "village", "district", "state", "preferred_language", mode="after")
    @classmethod
    def check_not_blank_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Field cannot be blank or whitespace only")
        return v.strip() if v is not None else None


class FarmerResponse(BaseModel):
    id: UUID
    farmer_name: str
    phone_number: str
    village: str
    district: str
    state: str
    preferred_language: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
