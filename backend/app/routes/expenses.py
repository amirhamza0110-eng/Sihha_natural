from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import db

router = APIRouter()


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    date: datetime


@router.post("/")
def create_expense(expense: ExpenseCreate):
    expense_data = expense.dict()
    inserted = db.expenses.insert_one(expense_data)
    return {"message": "Expense saved successfully!", "expense_id": str(inserted.inserted_id)}


@router.get("/")
def get_expenses():
    expenses = []
    for expense in db.expenses.find().sort("date", -1):
        expense["id"] = str(expense.pop("_id"))
        expenses.append(expense)
    return expenses