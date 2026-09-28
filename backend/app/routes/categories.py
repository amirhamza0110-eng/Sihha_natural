from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db
from bson import ObjectId

router = APIRouter()

# ক্যাটাগরি রিসিভ করার স্কিমা
class CategoryModel(BaseModel):
    name: str

@router.get("/")
def get_categories():
    """সব ক্যাটাগরি দেখার API"""
    categories = db.categories.find()
    return [{"id": str(c["_id"]), "name": c["name"]} for c in categories]

@router.post("/")
def create_category(category: CategoryModel):
    """নতুন ক্যাটাগরি অ্যাড করার API"""
    # চেক করা যে এই নামে আগে থেকেই ক্যাটাগরি আছে কিনা
    if db.categories.find_one({"name": category.name}):
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_cat = db.categories.insert_one({"name": category.name})
    return {"id": str(new_cat.inserted_id), "name": category.name}

@router.delete("/{cat_id}")
def delete_category(cat_id: str):
    """ক্যাটাগরি ডিলিট করার API"""
    db.categories.delete_one({"_id": ObjectId(cat_id)})
    return {"message": "Category deleted"}

class CategoryUpdate(BaseModel):
    name: str

@router.put("/{category_id}")
def update_category(category_id: str, category: CategoryUpdate):
    try:
        result = db.categories.update_one(
            {"_id": ObjectId(category_id)},
            {"$set": category.dict()}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category updated successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Category ID")