from fastapi import APIRouter, Depends

from app.admin_auth import verify_admin_token
from app.database import db

router = APIRouter(dependencies=[Depends(verify_admin_token)])


@router.get("/")
def get_admin_products():
    products = []
    for product in db.products.find().sort("name", 1):
        products.append(
            {
                "id": str(product["_id"]),
                "name": product.get("name", ""),
                "category": product.get("category", ""),
                "description": product.get("description", ""),
                "price": product.get("price", 0),
                "cost_price": product.get("cost_price", 0),
                "weight": product.get("weight"),
                "stock": product.get("stock", 0),
                "image_url": product.get("image_url", ""),
                "is_active": product.get("is_active", True),
            }
        )
    return products