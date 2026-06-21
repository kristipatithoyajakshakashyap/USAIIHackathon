from enum import Enum
from fastapi import Depends, HTTPException, status
from .dependencies import get_current_user


class Role(str, Enum):
    ADMIN    = "admin"
    OPERATOR = "operator"
    VIEWER   = "viewer"


ROLE_PERMISSIONS = {
    Role.ADMIN: [
        "view_dashboard",
        "view_alerts",
        "manage_alerts",
        "view_incidents",
        "view_live_feed",
        "manage_cameras",
        "manage_users",
        "view_analytics",
        "view_heatmap",
        "view_reports",
        "export_reports",
        "view_explainability",
        "change_settings",
    ],
    Role.OPERATOR: [
        "view_dashboard",
        "view_alerts",
        "manage_alerts",
        "view_incidents",
        "view_live_feed",
        "view_analytics",
        "view_heatmap",
        "view_reports",
        "view_explainability",
    ],
    Role.VIEWER: [
        "view_dashboard",
        "view_alerts",
        "view_incidents",
        "view_analytics",
        "view_reports",
    ],
}


def check_permission(permission: str):
    def permission_checker(current_user: dict = Depends(get_current_user)):
        role = current_user.get("role")
        role_perms = ROLE_PERMISSIONS.get(Role(role), [])
        if permission not in role_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your role '{role}' does not have '{permission}' permission."
            )
        return current_user
    return permission_checker


def get_user_permissions(role: str) -> list:
    return ROLE_PERMISSIONS.get(Role(role), [])