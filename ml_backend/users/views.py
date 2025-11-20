from drf_spectacular.utils import extend_schema
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    UserTokenObtainPairSerializer,
    LogoutSerializer,
    MeSerializer,
    MeUpdateSerializer,
)


class LoginView(TokenObtainPairView):
    @extend_schema(
        tags=["Авторизация"],
        summary="Вход пользователя",
        description="Возвращает access и refresh токены",
        request=UserTokenObtainPairSerializer,
        responses={200: {"access": "string", "refresh": "string"}},
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RefreshView(TokenRefreshView):
    @extend_schema(
        tags=["Авторизация"],
        summary="Обновление токенов",
        description="Принимает refresh токен, возвращает новый access и refresh",
        request=TokenRefreshSerializer,
        responses={200: {"access": "string", "refresh": "string"}},
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(generics.GenericAPIView):
    """
    Выход пользователя из системы и аннулирование refresh токена
    """

    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Авторизация"],
        summary="Выход из системы",
        description="Принимает refresh токен и блокирует его",
        request=LogoutSerializer,
        responses={200: {"is_ok": "boolean", "message": "string"}},
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]

        if not refresh_token:
            return Response(
                {
                    "is_ok": False,
                    "message": "Refresh-токен не передан",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {
                    "is_ok": True,
                    "message": "Успешный выход",
                },
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {
                    "is_ok": False,
                    "message": "Некорректный или уже аннулированный токен",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Пользователь"],
    summary="Об пользователе",
    description="Возвращает объект пользователя",
    responses={200: MeSerializer},
)
class MeView(generics.RetrieveAPIView):
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=["Пользователь"],
    summary="Изменить пользователя",
    description="Позволяет изменить данные о пользователе",
    request=MeUpdateSerializer,
)
class MeUpdateView(generics.UpdateAPIView):
    serializer_class = MeUpdateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user