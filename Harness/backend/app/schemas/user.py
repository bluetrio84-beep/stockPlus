from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Shared properties
class UserBase(BaseModel):
    username: Optional[str] = None
    is_active: Optional[bool] = True
    role: Optional[str] = "USER"

# Properties to receive via API on creation
class UserCreate(UserBase):
    username: str
    password: str

# Properties to return via API
class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Token properties
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
