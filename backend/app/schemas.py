from pydantic import BaseModel
from typing import Optional

# প্রোডাক্টের ডাটা কেমন হবে তার মডেল
class ProductBase(BaseModel):
    name: str
    category: str
    description: str
    price: float
    stock: int

class ProductResponse(ProductBase):
    id: str
    image_url: str
    is_active: bool