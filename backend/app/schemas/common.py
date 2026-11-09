from pydantic import BaseModel, EmailStr, Field


class MessageResponse(BaseModel):
    message: str


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=180)
    message: str = Field(min_length=10, max_length=4000)
