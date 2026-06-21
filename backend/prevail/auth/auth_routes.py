from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from .jwt_handler import create_access_token
from .dependencies import get_current_user
from .rbac import get_user_permissions

router = APIRouter(prefix="/auth", tags=["Authentication"])

FAKE_USERS = {
    "admin": {
        "username": "admin",
        "password": "prevail-admin-2024",
        "role": "admin",
    },
    "operator1": {
        "username": "operator1",
        "password": "operator-pass",
        "role": "operator",
    },
    "viewer1": {
        "username": "viewer1",
        "password": "viewer-pass",
        "role": "viewer",
    },
}


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(request: LoginRequest):
    user = FAKE_USERS.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    token = create_access_token(data={
        "sub": user["username"],
        "role": user["role"]
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"]
    }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    permissions = get_user_permissions(current_user["role"])
    return {
        "username": current_user["username"],
        "role": current_user["role"],
        "permissions": permissions
    }


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully. Please delete your token."}