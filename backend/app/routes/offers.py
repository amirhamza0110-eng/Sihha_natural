from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db
from bson import ObjectId

router = APIRouter()
offer_collection = db["offers"]

# অফারের ডাটা মডেল
class OfferModel(BaseModel):
    title: str
    description: str
    tag: str
    theme: str  # color theme (যেমন: orange, green, blue)
    icon: str   # fontawesome icon (যেমন: fa-truck-fast)

@router.get("/")
def get_offers():
    offers = []
    for off in offer_collection.find():
        offers.append({
            "id": str(off["_id"]),
            "title": off.get("title", ""),
            "description": off.get("description", ""),
            "tag": off.get("tag", "Hot Deal"),
            "theme": off.get("theme", "orange"),
            "icon": off.get("icon", "fa-gift")
        })
    return offers

@router.post("/")
def add_offer(offer: OfferModel):
    new_offer = offer.dict()
    result = offer_collection.insert_one(new_offer)
    return {"id": str(result.inserted_id), "message": "Offer added successfully"}

@router.delete("/{offer_id}")
def delete_offer(offer_id: str):
    try:
        result = offer_collection.delete_one({"_id": ObjectId(offer_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Offer not found")
        return {"message": "Offer deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid Offer ID")