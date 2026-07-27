"""Auth: signup, login, Emergent Google OAuth session, /me, logout."""
import uuid, requests
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie
from typing import Optional
from db import db, OWNER_EMAIL
from utils import now_iso, hash_password, check_password, make_jwt
from deps import get_current_user
from models import SignupBody, LoginBody

router = APIRouter()


@router.post("/auth/signup")
async def signup(body: SignupBody):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "admin" if email == OWNER_EMAIL else "customer"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id, "email": email, "name": body.name, "role": role,
        "password_hash": hash_password(body.password), "picture": "", "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id, role)
    return {"token": token, "user": {"user_id": user_id, "email": email, "name": body.name, "role": role, "picture": ""}}


@router.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if email == OWNER_EMAIL and user.get("role") != "admin":
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": "admin"}})
        user["role"] = "admin"
    token = make_jwt(user["user_id"], user["role"])
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "role": user["role"], "picture": user.get("picture", "")}}


@router.post("/auth/oauth/session")
async def oauth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"OAuth verification failed: {e}")

    email = data["email"].lower().strip()
    session_token = data["session_token"]
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        user_id = user["user_id"]; role = user["role"]
        if email == OWNER_EMAIL and role != "admin":
            role = "admin"
            await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin", "picture": data.get("picture", "")}})
        else:
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": data.get("picture", user.get("picture", ""))}})
    else:
        role = "admin" if email == OWNER_EMAIL else "customer"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data.get("name", email.split("@")[0]),
            "role": role, "picture": data.get("picture", ""), "created_at": now_iso(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at, "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(
        key="session_token", value=session_token, max_age=7 * 24 * 60 * 60,
        httponly=True, secure=True, samesite="none", path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user_doc}


@router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user


@router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
