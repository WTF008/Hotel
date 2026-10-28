from rest_framework.permissions import BasePermission
class PaymentAccess(BasePermission):
    def has_permission(self,request,view): return bool(request.user.is_authenticated and request.user.role in {'admin','manager','register'})
