from django.urls import path

from .views import (
    AiModelListView,
    BatchListView,
    BatchDetailView,
    InitUploadAPIView,
    ConfirmUploadAPIView,
    BatchStatusView,
    BatchImagesStatsView, BatchDeleteView, ImageDeleteView,
)

urlpatterns = [
    path("models/", AiModelListView.as_view(), name="ai-model-list"),
    path("batches/", BatchListView.as_view(), name="batches"),
    path("batches/<int:pk>/", BatchDetailView.as_view(), name="batch-detail"),
    path("batches/init/", InitUploadAPIView.as_view(), name="init-upload"),
    path("batches/confirm/", ConfirmUploadAPIView.as_view(), name="confirm-upload"),
    path("batches/status/<int:pk>/", BatchStatusView.as_view(), name="batch-status"),
    path("batches/stats/", BatchImagesStatsView.as_view(), name="batch-stats"),
    path('batches/delete/<int:pk>/', BatchDeleteView.as_view(), name='delete-batch'),
    path('images/delete/<int:pk>/', ImageDeleteView.as_view(), name='delete-image')

]
