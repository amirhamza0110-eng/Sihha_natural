from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.cloudinary_utils import delete_bill_image, upload_bill_image
from app.database import db

router = APIRouter()


class InventoryPurchaseCreate(BaseModel):
    date: datetime
    item_name: str
    amount: float
    supplier_name: Optional[str] = None


def _serialize_purchase(purchase):
    purchase["id"] = str(purchase.pop("_id"))
    purchase.pop("bill_image_public_id", None)
    return purchase


async def _upload_bill(file: Optional[UploadFile]):
    if file is None or not file.filename:
        return None
    file_bytes = await file.read()
    if not file_bytes:
        return None
    try:
        return upload_bill_image(file_bytes, "inventory_purchases")
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Bill image upload failed") from exc


def _delete_bill(public_id: Optional[str]):
    if not public_id:
        return
    try:
        delete_bill_image(public_id)
    except Exception:
        pass


def _get_purchase(purchase_id: str):
    if not ObjectId.is_valid(purchase_id):
        raise HTTPException(status_code=400, detail="Invalid inventory purchase ID")
    purchase = db.inventory_purchases.find_one({"_id": ObjectId(purchase_id)})
    if not purchase:
        raise HTTPException(status_code=404, detail="Inventory purchase not found")
    return purchase


@router.post("/")
async def create_inventory_purchase(
    date: datetime = Form(...),
    item_name: str = Form(...),
    amount: float = Form(...),
    supplier_name: Optional[str] = Form(None),
    bill_image: Optional[UploadFile] = File(None),
):
    purchase = InventoryPurchaseCreate(
        date=date,
        item_name=item_name,
        amount=amount,
        supplier_name=supplier_name or None,
    )
    purchase_data = purchase.dict()
    bill = await _upload_bill(bill_image)
    if bill:
        purchase_data["bill_image_url"] = bill["url"]
        purchase_data["bill_image_public_id"] = bill["public_id"]

    inserted = db.inventory_purchases.insert_one(purchase_data)
    return {
        "message": "Inventory purchase saved successfully!",
        "purchase_id": str(inserted.inserted_id),
    }


@router.get("/")
def get_inventory_purchases():
    return [
        _serialize_purchase(purchase)
        for purchase in db.inventory_purchases.find().sort("date", -1)
    ]


@router.get("/{purchase_id}")
def get_inventory_purchase(purchase_id: str):
    return _serialize_purchase(_get_purchase(purchase_id))


@router.put("/{purchase_id}")
async def update_inventory_purchase(
    purchase_id: str,
    date: Optional[datetime] = Form(None),
    item_name: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    supplier_name: Optional[str] = Form(None),
    bill_image: Optional[UploadFile] = File(None),
):
    existing = _get_purchase(purchase_id)
    updates = {}
    for field, value in {
        "date": date,
        "item_name": item_name,
        "amount": amount,
        "supplier_name": supplier_name,
    }.items():
        if value is not None:
            updates[field] = (value or None) if field == "supplier_name" else value

    bill = await _upload_bill(bill_image)
    if bill:
        updates["bill_image_url"] = bill["url"]
        updates["bill_image_public_id"] = bill["public_id"]

    if updates:
        db.inventory_purchases.update_one({"_id": existing["_id"]}, {"$set": updates})
    if bill:
        _delete_bill(existing.get("bill_image_public_id"))
    updated = db.inventory_purchases.find_one({"_id": existing["_id"]})
    return _serialize_purchase(updated)


@router.delete("/{purchase_id}")
def delete_inventory_purchase(purchase_id: str):
    existing = _get_purchase(purchase_id)
    db.inventory_purchases.delete_one({"_id": existing["_id"]})
    _delete_bill(existing.get("bill_image_public_id"))
    return {"message": "Inventory purchase deleted successfully"}