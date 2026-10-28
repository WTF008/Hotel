from rest_framework.permissions import BasePermission

class RolePermission(BasePermission):
    allowed_roles = set()
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.allowed_roles)

class IsAdmin(RolePermission):
    allowed_roles = {"admin"}

class IsStaffRole(RolePermission):
    allowed_roles = {"admin", "manager", "register"}

class IsAdminOrManager(RolePermission):
    allowed_roles = {"admin", "manager"}
