"""
rbac.py
Role-Based Access Control: restricts endpoints to specific roles.
Depends on auth.py's get_current_user to know who's calling.
"""

from fastapi import Depends, HTTPException, status
from .auth import get_current_user, TokenData

# Role hierarchy for reference (not enforced automatically — explicit per endpoint):
#   admin    -> full access (manage cameras, view everything, run analysis)
#   operator -> can run analysis, view alerts, cannot manage users/cameras
#   viewer   -> read-only, dashboard view only


def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that only allows the given roles through.

    Usage:
        @app.post("/predict")
        def predict(user: TokenData = Depends(require_role("admin", "operator"))):
            ...
    """
    def role_checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted to access this resource.",
            )
        return current_user
    return role_checker


# Convenience shortcuts for the most common checks
require_admin = require_role("admin")
require_operator_or_admin = require_role("admin", "operator")
require_any_role = require_role("admin", "operator", "viewer")