import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

# Cloudinary কনফিগারেশন
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_product_image(file_bytes, filename: str):
    """সরাসরি Cloudinary-তে ছবি আপলোড করার ফাংশন"""
    response = cloudinary.uploader.upload(
        file_bytes,
        folder="sihha_naturals/products",
        public_id=filename.split(".")[0],
        overwrite=True,
        transformation=[
            {"width": 800, "height": 800, "crop": "limit"},
            {"quality": "auto"},
            {"fetch_format": "auto"}
        ]
    )
    return {
        "url": response.get("secure_url"),
        "public_id": response.get("public_id")
    }

def delete_product_image(public_id: str):
    """প্রোডাক্ট ডিলিট করলে Cloudinary থেকেও ছবি মুছে ফেলার ফাংশন"""
    return cloudinary.uploader.destroy(public_id)