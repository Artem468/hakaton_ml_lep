from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse,
)
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import BatchFilter
from .models import AiModel, Batch, LepImage
from .serializers import (
    AiModelListSerializer,
    BatchListSerializer,
    LepImageSerializer,
    InitUploadSerializer,
    ConfirmUploadSerializer, BatchStatusSerializer,
)
from .utils import make_file_key
from .tasks import process_image_task


@extend_schema(
    tags=["Модели ИИ"],
    summary="Список моделей",
    description="Возвращает список всех загруженных моделей ИИ с id и названием",
    responses={200: AiModelListSerializer(many=True)},
)
class AiModelListView(generics.ListAPIView):
    queryset = AiModel.objects.all()
    serializer_class = AiModelListSerializer


class BatchPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "size"
    max_page_size = 50


@extend_schema(
    tags=["Обработка и отдача фото"],
    summary="Список наборов фото",
    description=(
            "Возвращает список наборов фото с возможностью фильтрации по имени и дате.\n"
            "Для каждого набора возвращается количество фото и результаты ИИ для всех фото."
    ),
    parameters=[
        OpenApiParameter(name="page", type=int, description="Номер страницы"),
        OpenApiParameter(name="size", type=int, description="Размер страницы"),
        OpenApiParameter(name="name", type=str, description="Фильтр по имени"),
        OpenApiParameter(name="date_from", type=str, description="Фильтр по дате (с)"),
        OpenApiParameter(name="date_to", type=str, description="Фильтр по дате (по)"),
    ],
    responses={200: BatchListSerializer(many=True)},
)
class BatchListView(generics.ListAPIView):
    queryset = (
        Batch.objects.all().prefetch_related("lepimage_set").order_by("-uploaded_at")
    )
    serializer_class = BatchListSerializer
    filterset_class = BatchFilter
    pagination_class = BatchPagination

    @extend_schema(operation_id="batch_list")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class BatchDetailPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "size"
    max_page_size = 50


@extend_schema(
    tags=["Обработка и отдача фото"],
    summary="Детальная информация о наборе",
    description="Возвращает подробную информацию о наборе",
    parameters=[
        OpenApiParameter(name="page", type=int, description="Номер страницы"),
        OpenApiParameter(name="size", type=int, description="Размер страницы"),
    ],
    responses={200: LepImageSerializer(many=True)},
)
class BatchDetailView(generics.RetrieveAPIView):
    queryset = LepImage.objects.all()
    serializer_class = LepImageSerializer
    pagination_class = BatchDetailPagination

    @extend_schema(operation_id="batch_detail")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class InitUploadAPIView(APIView):
    @extend_schema(
        tags=["Обработка и отдача фото"],
        summary="Создаёт batch и возвращает ключи и pre-signed URL для загрузки картинок",
        description=(
                "Создаёт новый набор изображений (*batch*) и генерирует ключи "
                "и pre-signed URL для прямой загрузки файлов в MinIO.\n\n"
                "**Важно:** Django сам файл не принимает — загрузка происходит напрямую в MinIO.\n\n"
                "**На вход:** список оригинальных имён файлов.\n\n"
                "**На выход:** `batch_id`, список созданных объектов `LepImage` "
                "с полями `image_id`, `file_key` и `upload_url`."
        ),
        request=InitUploadSerializer,
        responses={
            201: OpenApiResponse(
                description="Успешное создание batch и выдача URL для загрузки файлов",
                response=OpenApiTypes.OBJECT,
                examples=[
                    OpenApiExample(
                        "Пример успешного ответа",
                        value={
                            "batch_id": 12,
                            "files": [
                                {
                                    "image_id": 101,
                                    "file_key": "uploads/2025/11/19/batch_12/abc123.jpg",
                                    "upload_url": "https://minio.example.com/...signed...",
                                },
                                {
                                    "image_id": 102,
                                    "file_key": "uploads/2025/11/19/batch_12/qwe987.png",
                                    "upload_url": "https://minio.example.com/...signed...",
                                },
                            ],
                        },
                    )
                ],
            )
        },
    )
    def post(self, request):
        serializer = InitUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        batch_name = serializer.validated_data["batch_name"]

        batch = Batch.objects.create(name=batch_name)

        response_files = []

        for file_data in serializer.validated_data["files"]:
            filename = file_data["filename"]
            latitude = file_data.get("latitude")
            longitude = file_data.get("longitude")

            key = make_file_key(batch.id, filename)

            image = LepImage.objects.create(
                batch=batch,
                file_key=key,
                latitude=latitude,
                longitude=longitude,
            )

            url = settings.S3_CLIENT_PUBLIC.generate_presigned_url(
                ClientMethod="put_object",
                Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": key},
                ExpiresIn=3600,
            )

            response_files.append(
                {"image_id": image.id, "file_key": key, "upload_url": url}
            )

        return Response(
            {"batch_id": batch.id, "files": response_files},
            status=status.HTTP_201_CREATED,
        )


class ConfirmUploadAPIView(APIView):
    @extend_schema(
        tags=["Обработка и отдача фото"],
        summary="Подтверждение загрузки batch",
        description=(
                "После того, как клиент загрузил все файлы через pre-signed URL, "
                "эта ручка проверяет наличие файлов и помечает их как загруженные. "
                "Также запускается прогон выбранной модели ИИ по новым изображениям."
        ),
        request=ConfirmUploadSerializer,
        responses={
            200: OpenApiResponse(
                description="Batch подтвержден и запущен прогон моделей",
                response=OpenApiTypes.OBJECT,
                examples=[
                    OpenApiExample(
                        "Пример ответа",
                        value={
                            "batch_id": 12,
                            "processed_images": 10,
                        },
                    )
                ],
            )
        },
    )
    def post(self, request):
        serializer = ConfirmUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch_id = serializer.validated_data["batch_id"]
        model_id = serializer.validated_data["model_id"]

        try:
            batch = Batch.objects.get(id=batch_id)
        except Batch.DoesNotExist:
            return Response(
                {"detail": "Batch не найден"}, status=status.HTTP_404_NOT_FOUND
            )

        s3 = settings.S3_CLIENT_PRIVATE
        confirmed_count = 0
        for image in batch.lepimage_set.all():
            try:
                s3.head_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=image.file_key
                )
                confirmed_count += 1
                process_image_task.delay(image.file_key, model_id)
            except s3.exceptions.ClientError:
                continue

        return Response(
            {"batch_id": batch.id, "processed_images": confirmed_count},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Обработка и отдача фото"],
    summary="Статус набора",
    description="Возвращает статус набора",
    responses={200: BatchStatusSerializer},
)
class BatchStatusView(generics.RetrieveAPIView):
    queryset = Batch.objects.all()
    serializer_class = BatchStatusSerializer


class BatchImagesStatsView(APIView):
    @extend_schema(
        tags=["Обработка и отдача фото"],
        summary="Процент обработанных фотографий от общего количества",
        description="Процент обработанных фотографий от общего количества",
        responses={200: {"total": "integer", "processed": "integer", "not_processed": "integer"}},
    )
    def get(self, request):
        total = LepImage.objects.count()
        processed = LepImage.objects.filter(detection_result__isnull=False).count()
        not_processed = total - processed

        return Response({
            "total": total,
            "processed": processed,
            "not_processed": not_processed
        }, status=status.HTTP_200_OK)
