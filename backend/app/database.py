import os
from pymongo import MongoClient
from dotenv import load_dotenv

# .env ফাইলের সিক্রেটগুলো লোড করা হচ্ছে
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DATABASE_NAME", "sihha_naturals")

# MongoDB ক্লায়েন্ট তৈরি
client = MongoClient(MONGO_URI)
# টার্মিনালে কনফার্মেশন প্রিন্ট করার জন্য
try:
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
db = client[DB_NAME]

def get_db():
    return db