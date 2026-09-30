import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.database import db
from bson import ObjectId
import cloudinary.uploader # Cloudinary ইম্পোর্ট করা হলো

router = APIRouter()
video_collection = db["videos"]

@router.get("/")
def get_videos():
    videos = []
    for vid in video_collection.find():
        videos.append({
            "id": str(vid["_id"]),
            "title": vid.get("title", ""),
            "url": vid.get("url", ""),
            "thumbnail_url": vid.get("thumbnail_url", "")
        })
    return videos

@router.post("/")
async def add_video(title: str = Form(...), url: str = Form(...), thumbnail: UploadFile = File(...)):
    try:
        # ১. Cloudinary-তে ছবি আপলোড
        result = cloudinary.uploader.upload(thumbnail.file, folder="videos")
        thumbnail_url = result.get("secure_url") # Cloudinary থেকে লাইভ লিংক পেয়ে গেলাম
        
        # ২. ডাটাবেসে সেভ
        new_video = {
            "title": title,
            "url": url,
            "thumbnail_url": thumbnail_url
        }
        db_result = video_collection.insert_one(new_video)
        return {"id": str(db_result.inserted_id), "message": "Video and thumbnail added successfully"}
        
    except Exception as e:
        print("Upload Error:", e)
        raise HTTPException(status_code=500, detail="Failed to upload thumbnail")

@router.delete("/{video_id}")
def delete_video(video_id: str):
    try:
        vid = video_collection.find_one({"_id": ObjectId(video_id)})
        if not vid:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # ডাটাবেস থেকে ডিলিট
        video_collection.delete_one({"_id": ObjectId(video_id)})
        return {"message": "Video deleted successfully"}

    except Exception as e:
        print("Delete Error:", e)
        raise HTTPException(status_code=400, detail="Invalid Video ID")