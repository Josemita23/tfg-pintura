from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6, trim_whitespace=False)
    password_confirm = serializers.CharField(min_length=6, trim_whitespace=False)

    def validate_username(self, value):
        User = get_user_model()

        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese nombre.")

        return value

    def validate_email(self, value):
        User = get_user_model()

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese correo.")

        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )

        return attrs


class ProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=300)
    email = serializers.EmailField()

    def validate_email(self, value):
        User = get_user_model()
        request = self.context["request"]

        if User.objects.exclude(pk=request.user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese correo.")

        return value


def serialize_user(user):
    full_name = user.get_full_name().strip()

    return {
        "id": user.id,
        "username": user.username,
        "full_name": full_name or user.username,
        "email": user.email,
        "is_staff": user.is_staff,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )

    if not user or not user.is_active:
        return Response(
            {"detail": "Usuario o contraseña incorrectos."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({"user": serialize_user(user), "token": token.key})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    if request.auth:
        request.auth.delete()

    return Response({"detail": "Sesion cerrada correctamente."})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    User = get_user_model()
    user = User.objects.create_user(
        username=serializer.validated_data["username"],
        email=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
        first_name=serializer.validated_data["first_name"],
        last_name=serializer.validated_data.get("last_name", ""),
    )

    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {"user": serialize_user(user), "token": token.key},
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    serializer = ProfileSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)

    full_name = serializer.validated_data["full_name"].strip()
    name_parts = full_name.split(maxsplit=1)

    request.user.first_name = name_parts[0]
    request.user.last_name = name_parts[1] if len(name_parts) > 1 else ""
    request.user.email = serializer.validated_data["email"].strip()
    request.user.save(update_fields=["first_name", "last_name", "email"])

    return Response({"user": serialize_user(request.user)})
