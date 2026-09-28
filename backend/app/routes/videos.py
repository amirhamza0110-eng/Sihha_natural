import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.database import db
from bson import ObjectId

router = APIRouter()
video_collection = db["videos"]

# Thumbnail save korar folder
UPLOAD_DIR = "uploads/videos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    # File save kora
    file_extension = thumbnail.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(thumbnail.file, buffer)
        
    thumbnail_url = f"https://sihha-natural.onrender.com{file_path}"
    
    new_video = {
        "title": title,
        "url": url,
        "thumbnail_url": thumbnail_url
    }
    result = video_collection.insert_one(new_video)
    return {"id": str(result.inserted_id), "message": "Video and thumbnail added successfully"}

@router.delete("/{video_id}")
def delete_video(video_id: str):
    try:
        # ১. ডাটাবেস থেকে ভিডিওটি খোঁজা
        vid = video_collection.find_one({"_id": ObjectId(video_id)})
        if not vid:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # ২. সার্ভার ফোল্ডার থেকে থাম্বনেইল ছবিটা রিমুভ করা
        thumbnail_url = vid.get("thumbnail_url", "")
        if thumbnail_url:
            try:
                # URL থেকে ফাইলের নাম বের করে ডিলিট করা
                file_path = thumbnail_url.split("8000/")[-1]
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print("Image delete error:", e)

        # ৩. ডাটাবেস থেকে ভিডিও ডিলিট করা
        video_collection.delete_one({"_id": ObjectId(video_id)})
        return {"message": "Video and thumbnail deleted successfully"}

    except Exception as e:
        print("Delete Error:", e)
        raise HTTPException(status_code=400, detail="Invalid Video ID")