from datetime import datetime
from typing import List, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.database import db
from app.date_utils import month_window

router = APIRouter()


class OrderItem(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    quantity: int = Field(gt=0)
    product_id: Optional[str] = None
    cost_price: Optional[float] = Field(default=None, ge=0)
    custom_product_name: Optional[str] = None
    custom_selling_price: Optional[float] = Field(default=None, ge=0)
    custom_cost_price: Optional[float] = Field(default=None, ge=0)


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


def _normalize_order_items(items: List[OrderItem], order_type: str):
    normalized_items = []
    total_profit = 0.0

    for item in items:
        custom_fields_present = any(
            value is not None
            for value in (
                item.custom_product_name,
                item.custom_selling_price,
                item.custom_cost_price,
            )
        )

        if custom_fields_present:
            if order_type != "offline" or item.product_id:
                raise HTTPException(
                    status_code=400,
                    detail="Custom product details are only allowed for offline orders without a product ID",
                )
            item_name = item.custom_product_name or item.name
            item_price = item.custom_selling_price
            item_cost = item.custom_cost_price
            if not item_name or item_price is None or item_cost is None:
                raise HTTPException(
                    status_code=422,
                    detail="Custom offline items require a name, selling price, and cost price",
                )
        else:
            if item.product_id:
                if not ObjectId.is_valid(item.product_id):
                    raise HTTPException(status_code=400, detail="Invalid product ID")
                product = db.products.find_one({"_id": ObjectId(item.product_id)})
            else:
                product = db.products.find_one({"name": item.name}) if item.name else None

            if product:
                item_name = item.name or product["name"]
                item_price = item.price if item.price is not None else product["price"]
                item_cost = product.get("cost_price", 0)
            elif (
                order_type == "offline"
                and item.name
                and item.price is not None
                and item.cost_price is not None
            ):
                item_name = item.name
                item_price = item.price
                item_cost = item.cost_price
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product cost could not be found for '{item.name or 'item'}'",
                )

        normalized_items.append(
            {
                "name": item_name,
                "price": float(item_price),
                "cost_price": float(item_cost),
                "quantity": item.quantity,
                **({"product_id": item.product_id} if item.product_id else {}),
            }
        )
        total_profit += (float(item_price) - float(item_cost)) * item.quantity

    return normalized_items, total_profit


def _get_order(order_id: str):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    order = db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _serialize_order(order):
    order["id"] = str(order.pop("_id"))
    return order


@router.post("/")
def create_order(order: OrderCreate):
    order_dict = order.dict()
    order_items, total_profit = _normalize_order_items(order.items, order.order_type)
    order_dict["items"] = order_items
    order_dict["total_profit"] = total_profit
    order_dict["status"] = "Pending"
    order_dict["created_at"] = datetime.now()

    inserted = db.orders.insert_one(order_dict)
    return {"message": "Order saved successfully!", "order_id": str(inserted.inserted_id)}


@router.get("/")
def get_orders(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
):
    start, end = month_window(month, year)
    return [
        _serialize_order(order)
        for order in db.orders.find(
            {"created_at": {"$gte": start, "$lt": end}}
        ).sort("created_at", -1)
    ]


@router.get("/{order_id}")
def get_order(order_id: str):
    return _serialize_order(_get_order(order_id))


@router.put("/{order_id}")
def update_order(order_id: str, order: OrderCreate):
    existing = _get_order(order_id)
    order_dict = order.dict()
    order_items, total_profit = _normalize_order_items(order.items, order.order_type)
    order_dict["items"] = order_items
    order_dict["total_profit"] = total_profit
    order_dict["updated_at"] = datetime.now()
    order_dict["status"] = existing.get("status", "Pending")
    order_dict["created_at"] = existing.get("created_at", datetime.now())

    db.orders.update_one({"_id": existing["_id"]}, {"$set": order_dict})
    updated = db.orders.find_one({"_id": existing["_id"]})
    return _serialize_order(updated)


@router.put("/{order_id}/status")
def update_order_status(order_id: str, status: str):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    result = db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated successfully!"}


@router.delete("/{order_id}")
def delete_order(order_id: str):
    existing = _get_order(order_id)
    db.orders.delete_one({"_id": existing["_id"]})
    return {"message": "Order deleted successfully"}