from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db
from bson import ObjectId
from typing import List, Literal, Optional
from datetime import datetime

router = APIRouter()

# Pydantic Models for Validation
class OrderItem(BaseModel):
    name: str
    price: float
    quantity: int
    product_id: Optional[str] = None

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_area: str
    address: str
    items: List[OrderItem]
    subtotal: float
    delivery_charge: float
    total: float
    order_type: Literal["online", "offline"] = "online"

# ১. নতুন অর্ডার তৈরি করার API
@router.post("/")
def create_order(order: OrderCreate):
    order_dict = order.dict()
    total_profit = 0.0
    for item in order.items:
        if item.product_id and not ObjectId.is_valid(item.product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")

        product_query = (
            {"_id": ObjectId(item.product_id)}
            if item.product_id
            else {"name": item.name}
        )
        product = db.products.find_one(product_query)
        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Product cost could not be found for '{item.name}'",
            )

        total_profit += (item.price - product.get("cost_price", 0)) * item.quantity

    order_dict["total_profit"] = total_profit
    order_dict["status"] = "Pending"  # শুরুতে অর্ডারের স্ট্যাটাস Pending থাকবে
    order_dict["created_at"] = datetime.now()
    
    inserted = db.orders.insert_one(order_dict)
    return {"message": "Order saved successfully!", "order_id": str(inserted.inserted_id)}

# ২. অ্যাডমিন প্যানেলের জন্য সব অর্ডার দেখার API
@router.get("/")
def get_orders():
    orders = []
    # নতুন অর্ডারগুলো আগে দেখানোর জন্য sort("created_at", -1) করা হয়েছে
    for order in db.orders.find().sort("created_at", -1):
        order["id"] = str(order["_id"])
        del order["_id"]
        orders.append(order)
    return orders

# ৩. অর্ডারের স্ট্যাটাস (Pending -> Delivered) আপডেট করার API
@router.put("/{order_id}/status")
def update_order_status(order_id: str, status: str):
    try:
        result = db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found or status already set")
        return {"message": "Status updated successfully!"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Order ID")

from bson import ObjectId
from fastapi import HTTPException

@router.delete("/{order_id}")
def delete_order(order_id: str):
    try:
        # এখানে db["orders"] বা আপনার যেটা নাম দেওয়া আছে সেটা ব্যবহার করবেন
        result = db["orders"].delete_one({"_id": ObjectId(order_id)})
        if result.deleted_count == 1:
            return {"message": "Order deleted successfully"}
        raise HTTPException(status_code=404, detail="Order not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Order ID")   