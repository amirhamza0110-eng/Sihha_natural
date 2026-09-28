from fastapi import APIRouter, UploadFile, File, HTTPException
from app.database import db
from app.cloudinary_utils import upload_product_image, delete_product_image
from bson import ObjectId

router = APIRouter()

@router.get("/")
def get_banners():
    banners = db.banners.find()
    return [{"id": str(b["_id"]), "image_url": b["image_url"]} for b in banners]

@router.post("/")
async def upload_banner(image: UploadFile = File(...)):
    try:
        file_bytes = await image.read()
        upload_result = upload_product_image(file_bytes, image.filename) # amra aager image function tai use korlam
        
        new_banner = db.banners.insert_one({
            "image_url": upload_result["url"],
            "public_id": upload_result["public_id"]
        })
        return {"id": str(new_banner.inserted_id), "image_url": upload_result["url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{banner_id}")
def delete_banner(banner_id: str):
    banner = db.banners.find_one({"_id": ObjectId(banner_id)})
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    if "public_id" in banner:
        delete_product_image(banner["public_id"])
        
    db.banners.delete_one({"_id": ObjectId(banner_id)})
    return {"message": "Banner deleted"}