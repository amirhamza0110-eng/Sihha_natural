from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.cloudinary_utils import delete_bill_image, upload_bill_image
from app.database import db

router = APIRouter()


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    date: datetime
    shop_name: Optional[str] = None


def _serialize_expense(expense):
    expense["id"] = str(expense.pop("_id"))
    expense.pop("bill_image_public_id", None)
    return expense


async def _upload_bill(file: Optional[UploadFile]):
    if file is None or not file.filename:
        return None
    file_bytes = await file.read()
    if not file_bytes:
        return None
    try:
        return upload_bill_image(file_bytes, "expenses")
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Bill image upload failed") from exc


def _delete_bill(public_id: Optional[str]):
    if not public_id:
        return
    try:
        delete_bill_image(public_id)
    except Exception:
        pass


def _get_expense(expense_id: str):
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")
    expense = db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/")
async def create_expense(
    title: str = Form(...),
    amount: float = Form(..., ge=0),
    category: str = Form(...),
    date: datetime = Form(...),
    shop_name: Optional[str] = Form(None),
    bill_image: Optional[UploadFile] = File(None),
):
    expense = ExpenseCreate(
        title=title,
        amount=amount,
        category=category,
        date=date,
        shop_name=shop_name or None,
    )
    expense_data = expense.dict()
    bill = await _upload_bill(bill_image)
    if bill:
        expense_data["bill_image_url"] = bill["url"]
        expense_data["bill_image_public_id"] = bill["public_id"]

    inserted = db.expenses.insert_one(expense_data)
    return {"message": "Expense saved successfully!", "expense_id": str(inserted.inserted_id)}


@router.get("/")
def get_expenses():
    return [
        _serialize_expense(expense)
        for expense in db.expenses.find().sort("date", -1)
    ]


@router.get("/{expense_id}")
def get_expense(expense_id: str):
    return _serialize_expense(_get_expense(expense_id))


@router.put("/{expense_id}")
async def update_expense(
    expense_id: str,
    title: Optional[str] = Form(None),
    amount: Optional[float] = Form(None, ge=0),
    category: Optional[str] = Form(None),
    date: Optional[datetime] = Form(None),
    shop_name: Optional[str] = Form(None),
    bill_image: Optional[UploadFile] = File(None),
):
    existing = _get_expense(expense_id)
    updates = {}
    for field, value in {
        "title": title,
        "amount": amount,
        "category": category,
        "date": date,
        "shop_name": shop_name,
    }.items():
        if value is not None:
            updates[field] = (value or None) if field == "shop_name" else value

    bill = await _upload_bill(bill_image)
    if bill:
        updates["bill_image_url"] = bill["url"]
        updates["bill_image_public_id"] = bill["public_id"]

    if updates:
        db.expenses.update_one({"_id": existing["_id"]}, {"$set": updates})
    if bill:
        _delete_bill(existing.get("bill_image_public_id"))
    updated = db.expenses.find_one({"_id": existing["_id"]})
    return _serialize_expense(updated)


@router.delete("/{expense_id}")
def delete_expense(expense_id: str):
    existing = _get_expense(expense_id)
    db.expenses.delete_one({"_id": existing["_id"]})
    _delete_bill(existing.get("bill_image_public_id"))
    return {"message": "Expense deleted successfully"}