from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime
from core.security import verify_token
from db.session import get_db
from models import User, UserRole
from schemas import UserCreate, UserResponse, UserUpdate
import bcrypt
from jose import jwt
from core.config import settings

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    hashed = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        email=user_data.email,
        display_name=user_data.display_name,
        role=user_data.role,
        settings={"theme": "dark", "language": "en"}
    )
    # Store password hash - simplified for demo
    user_dict = user.__dict__
    user_dict['password_hash'] = hashed

    db.add(user)
    db.commit()
    db.refresh(user)

    token = jwt.encode({"sub": str(user.id)}, settings.SECRET_KEY, algorithm="HS256")
    return {"user": user, "token": token}


@router.post("/login")
def login(email: str = Body(...), password: str = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(401, "Invalid credentials")

    return {"token": f"mock_token_for_{email}", "user_id": str(user.id)}


@router.get("/me", response_model=UserResponse)
def get_me(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.put("/me")
def update_profile(updates: UserUpdate, user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/google")
def google_auth(code: str = Body(...)):
    return {"token": "google_auth_token", "user": {"email": "mock@example.com"}}
