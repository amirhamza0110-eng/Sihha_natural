import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # <-- ETA NOTUN ADD KORA HOYECHE
from app.database import db
from app.routes import products, categories, banners, orders, videos, expenses, analytics, inventory_purchases, admin_products, reports
from app.routes import offers  

app = FastAPI(title="Sihha Naturals API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== THE FIX: STATIC FILES MOUNT ==================
# Ei line tar karone 'uploads' folder er chobi gulo browser e load hobe
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# =================================================================

@app.get("/")
def read_root():
    return {"message": "Welcome to Sihha Naturals API!"}

@app.get("/api/health")
def health_check():
    try:
        db.command("ping")
        return {"status": "ok", "database": "Connected to MongoDB"}
    except Exception as e:
        return {"status": "failed", "database": str(e)}

# Routers
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"]) 
app.include_router(banners.router, prefix="/api/banners", tags=["Banners"]) 
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(offers.router, prefix="/api/offers", tags=["Offers"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(inventory_purchases.router, prefix="/api/inventory-purchases", tags=["Inventory Purchases"])
app.include_router(admin_products.router, prefix="/api/admin/products", tags=["Admin Products"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])