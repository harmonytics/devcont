from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from users.serializers import UserSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for monitoring."""
    return Response({"status": "ok", "message": "Django API is running"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return the current authenticated user."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
