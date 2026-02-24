import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
import jwt
import hashlib

from database.config import get_db
from database.models import User

logger = logging.getLogger("auth_router")

router = APIRouter(prefix="/auth", tags=["Auth"])

# Password hashing config
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT config (In production, use randomly generated secret key loaded from env)
SECRET_KEY = "biogas-nexus-super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

def verify_password(plain_password, hashed_password):
    # SHA-256 pre-hashing to bypass bcrypt 72-byte limit
    pre_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    return pwd_context.verify(pre_hash, hashed_password)

def get_password_hash(password):
    # SHA-256 pre-hashing to bypass bcrypt 72-byte limit
    pre_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    return pwd_context.hash(pre_hash)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Schemas ---

class SignupRequest(BaseModel):
    full_name: str
    organization: str
    email: EmailStr
    username: str
    phone: str | None = None
    password: str

class LoginRequest(BaseModel):
    login: str  # Can be email or username
    password: str

class AuthResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "bearer"
    user: dict

# --- Endpoints ---

@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if username or email exists
    query = select(User).where((User.email == req.email) | (User.username == req.username))
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        if existing_user.email == req.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Store new user
    new_user = User(
        email=req.email,
        username=req.username,
        full_name=req.full_name,
        organization=req.organization,
        phone=req.phone,
        hashed_password=get_password_hash(req.password)
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "success": True,
        "access_token": access_token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "organization": new_user.organization
        }
    }

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Find user by either email or username
    query = select(User).where((User.email == req.login) | (User.username == req.login))
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email/username or password")
    
    # Generate token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "success": True,
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "organization": user.organization
        }
    }
