from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from app.database import db
from app.admin_auth import verify_admin_token
from app.cloudinary_utils import upload_product_image
from app.schemas import ProductResponse
from bson import ObjectId

router = APIRouter()

# ডাটাবেস থেকে পাওয়া ডাটাকে JSON ফরম্যাটে সাজানোর হেল্পার ফাংশন
def product_helper(product) -> dict:
    return {
        "id": str(product["_id"]),
        "name": product["name"],
        "category": product["category"],
        "description": product["description"],
        "price": product["price"],
        "weight": product.get("weight"),
        "stock": product["stock"],
        "image_url": product["image_url"],
        "is_active": product.get("is_active", True)
    }

@router.post("/", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    cost_price: float = Form(0),
    weight: Optional[str] = Form(None),
    stock: int = Form(...),
    image: UploadFile = File(...),
    _admin: None = Depends(verify_admin_token),
):
    try:
        # ১. ছবি রিড করা এবং Cloudinary-তে আপলোড করা
        file_bytes = await image.read()
        upload_result = upload_product_image(file_bytes, image.filename or "product-image")
        
        # ২. ডাটাবেসের জন্য প্রোডাক্টের তথ্য সাজানো
        product_data = {
            "name": name,
            "category": category,
            "description": description,
            "price": price,
            "cost_price": cost_price,
            "weight": weight.strip() if weight and weight.strip() else None,
            "stock": stock,
            "image_url": upload_result["url"],
            "cloudinary_public_id": upload_result["public_id"],
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        # ৩. MongoDB-তে সেভ করা
        new_product = db.products.insert_one(product_data)
        created_product = db.products.find_one({"_id": new_product.inserted_id})
        
        return product_helper(created_product)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def get_products():
    """সবগুলো প্রোডাক্ট দেখার API"""
    products = db.products.find({"is_active": True})
    return [product_helper(p) for p in products]

from bson.errors import InvalidId
from app.cloudinary_utils import delete_product_image # একদম উপরে ইম্পোর্ট সেকশনে এটা অ্যাড করবেন যদি না থাকে

@router.delete("/{product_id}")
def delete_product(product_id: str, _admin: None = Depends(verify_admin_token)):
    """প্রোডাক্ট এবং Cloudinary থেকে ছবি মুছে ফেলার API"""
    try:
        # ১. ডাটাবেস থেকে প্রোডাক্টটি খোঁজা
        product = db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # ২. Cloudinary থেকে ছবি ডিলিট করা (যদি থাকে)
        if "cloudinary_public_id" in product and product["cloudinary_public_id"]:
            delete_product_image(product["cloudinary_public_id"])
            
        # ৩. MongoDB থেকে প্রোডাক্ট ডিলিট করা
        db.products.delete_one({"_id": ObjectId(product_id)})
        return {"message": "Product deleted successfully"}
        
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Product ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}")
def get_product(product_id: str):
    """নির্দিষ্ট একটি প্রোডাক্টের ডিটেইলস দেখার API"""
    try:
        product = db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {
            "id": str(product["_id"]),
            "name": product["name"],
            "category": product["category"],
            "price": product["price"],
            "weight": product.get("weight"),
            "stock": product["stock"],
            "description": product.get("description", "No description available."),
            "image_url": product["image_url"]
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Product ID")


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    weight: Optional[str] = None
    stock: Optional[int] = None
    description: Optional[str] = None

@router.put("/{product_id}")
def update_product(
    product_id: str,
    product: ProductUpdate,
    _admin: None = Depends(verify_admin_token),
):
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid Product ID")

        updates = product.dict(exclude_unset=True)
        if "weight" in updates:
            weight = updates["weight"]
            updates["weight"] = weight.strip() or None if weight else None
        if not updates:
            raise HTTPException(status_code=400, detail="No product fields provided")

        result = db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": updates}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))