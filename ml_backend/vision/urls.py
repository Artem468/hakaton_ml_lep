from django.urls import path

from .views import (
    AiModelListView,
    BatchListView,
    BatchDetailView,
    InitUploadAPIView,
    ConfirmUploadAPIView,
)

urlpatterns = [
    path("models/", AiModelListView.as_view(), name="ai-model-list"),
    path("batches/", BatchListView.as_view(), name="batches"),
    path("batches/<int:pk>/", BatchDetailView.as_view(), name="batch-detail"),
    path("batches/init/", InitUploadAPIView.as_view(), name="init-upload"),
    path("batches/confirm/", ConfirmUploadAPIView.as_view(), name="confirm-upload"),
]