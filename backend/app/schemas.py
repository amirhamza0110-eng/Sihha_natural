from pydantic import BaseModel
from typing import Optional

# প্রোডাক্টের ডাটা কেমন হবে তার মডেল
class ProductBase(BaseModel):
    name: str
    category: str
    description: str
    price: float
    cost_price: float = 0
    stock: int

class ProductResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    price: float
    stock: int
    image_url: str
    is_active: bool