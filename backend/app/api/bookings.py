from fastapi import APIRouter

router = APIRouter(prefix="/bookings")


@router.post("")
def create_booking():
    return {"message":"Coming Soon"}


@router.get("/{booking_id}")
def get_booking(booking_id:int):
    return {"message":"Coming Soon"}