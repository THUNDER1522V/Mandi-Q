from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas import FarmerCreate, FarmerUpdate, FarmerResponse
from app.services import (
    create_farmer,
    get_all_farmers,
    get_farmer_by_id,
    update_farmer,
    delete_farmer,
)

router = APIRouter(prefix="/farmers", tags=["Farmers"])


@router.post(
    "",
    response_model=FarmerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new farmer",
    description="Registers a new farmer. Returns the newly generated farmer record with real UUID."
)
@router.post(
    "/",
    response_model=FarmerResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_farmer_api(
    farmer: FarmerCreate,
    db: Session = Depends(get_db)
):
    return create_farmer(db, farmer)


@router.get(
    "",
    response_model=List[FarmerResponse],
    status_code=status.HTTP_200_OK,
    summary="List all farmers",
    description="Retrieve a paginated list of all registered farmers from PostgreSQL."
)
@router.get(
    "/",
    response_model=List[FarmerResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def get_farmers_api(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db)
):
    return get_all_farmers(db, skip=skip, limit=limit)


@router.get(
    "/{farmer_id}",
    response_model=FarmerResponse,
    status_code=status.HTTP_200_OK,
    summary="Get farmer by ID",
    description="Retrieve details of a farmer by UUID. Paste the real UUID returned by POST /api/v1/farmers (do not use Swagger's default 3fa85f64-... placeholder)."
)
@router.get(
    "/{farmer_id}/",
    response_model=FarmerResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def get_farmer_api(
    farmer_id: UUID = Path(
        ...,
        description="Real UUID of the farmer (returned from POST /api/v1/farmers)",
        examples=["40892906-d5da-47a8-aa53-f4d2b77275b5"]
    ),
    db: Session = Depends(get_db)
):
    farmer = get_farmer_by_id(db, farmer_id)
    if farmer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found"
        )
    return farmer


@router.put(
    "/{farmer_id}",
    response_model=FarmerResponse,
    status_code=status.HTTP_200_OK,
    summary="Update farmer",
    description="Update an existing farmer's details by UUID. Paste the real UUID returned by POST."
)
@router.put(
    "/{farmer_id}/",
    response_model=FarmerResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def update_farmer_api(
    farmer_id: UUID = Path(
        ...,
        description="Real UUID of the farmer to update",
        examples=["40892906-d5da-47a8-aa53-f4d2b77275b5"]
    ),
    farmer: FarmerUpdate = ...,
    db: Session = Depends(get_db)
):
    updated = update_farmer(db, farmer_id, farmer)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found"
        )
    return updated


@router.delete(
    "/{farmer_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete farmer",
    description="Delete a farmer record by UUID. Paste the real UUID returned by POST."
)
@router.delete(
    "/{farmer_id}/",
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def delete_farmer_api(
    farmer_id: UUID = Path(
        ...,
        description="Real UUID of the farmer to delete",
        examples=["40892906-d5da-47a8-aa53-f4d2b77275b5"]
    ),
    db: Session = Depends(get_db)
):
    deleted = delete_farmer(db, farmer_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found"
        )
    return {
        "message": "Farmer deleted successfully"
    }
