from fastapi import APIRouter

router = APIRouter(prefix="/analytics")


@router.get("")
def analytics():
    return {"message":"Coming Soon"}