"""Pydantic request/response models."""
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from utils import gen_id


class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("item"))
    name: str
    description: str = ""
    price: float
    category: str = "Mains"
    image_url: str = ""
    is_veg: bool = True
    rating: float = 4.5
    allergens: List[str] = []
    prep_minutes: int = 15
    available: bool = True
    spice_level: int = 1
    tags: List[str] = []


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_veg: Optional[bool] = None
    rating: Optional[float] = None
    allergens: Optional[List[str]] = None
    prep_minutes: Optional[int] = None
    available: Optional[bool] = None
    spice_level: Optional[int] = None
    tags: Optional[List[str]] = None


class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    notes: str = ""


class OrderCreate(BaseModel):
    items: List[OrderItem]
    table_number: Optional[int] = None
    reservation_id: Optional[str] = None
    notes: str = ""


class ReservationBody(BaseModel):
    name: str
    phone: str
    party_size: int
    date: str
    time: str


class QueueJoinBody(BaseModel):
    name: str
    phone: str
    party_size: int


class TableUpdate(BaseModel):
    status: Optional[str] = None
    current_order_id: Optional[str] = None
    seats: Optional[int] = None


class InventoryBody(BaseModel):
    name: str
    unit: str = "kg"
    stock: float
    threshold: float = 5.0


class InventoryRestock(BaseModel):
    delta: float


class StaffCreateBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
