from fastapi import APIRouter

router = APIRouter(prefix="/voice")


@router.post("/inbound")
def inbound():
    return {"message":"Coming Soon"}