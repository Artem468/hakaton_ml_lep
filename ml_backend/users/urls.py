from django.urls import path

from users.views import LoginView, RefreshView, LogoutView, MeView, MeUpdateView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/update/", MeUpdateView.as_view(), name="me"),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]