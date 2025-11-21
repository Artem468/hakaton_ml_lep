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
    ConfirmUploadSerializer,
    BatchStatusSerializer,
    DeleteBatchSerializer,
    BulkDeleteImageSerializer, BatchUpdateResponseSerializer, BatchUpdateSerializer,
)
from .tasks import process_image_task
from .utils import make_file_key


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
class BatchDetailView(generics.ListAPIView):
    serializer_class = LepImageSerializer
    pagination_class = BatchDetailPagination

    def get_queryset(self):
        batch_id = self.kwargs.get("pk")
        return LepImage.objects.filter(batch_id=batch_id)

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

        try:
            AiModel.objects.get(id=model_id)
        except AiModel.DoesNotExist:
            return Response(
                {"detail": "Модель не найдена"}, status=status.HTTP_404_NOT_FOUND
            )

        s3 = settings.S3_CLIENT_PRIVATE
        confirmed_count = 0
        for image in batch.lepimage_set.filter(detection_result__isnull=True):
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
        responses={
            200: {
                "total": "integer",
                "processed": "integer",
                "not_processed": "integer",
            }
        },
    )
    def get(self, request):
        total = LepImage.objects.count()
        processed = LepImage.objects.filter(detection_result__isnull=False).count()
        not_processed = total - processed

        return Response(
            {"total": total, "processed": processed, "not_processed": not_processed},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Обработка и отдача фото"],
    summary="Удаление набора фото",
    description="Удаляет набор фото и файлы из бакета",
    responses={204: None},
)
class BatchDeleteView(generics.DestroyAPIView):
    queryset = Batch.objects.all()
    serializer_class = DeleteBatchSerializer


@extend_schema(
    tags=["Обработка и отдача фото"],
    summary="Удалить несколько изображений",
    description="Удаляет список фотографий по их ID",
    request=BulkDeleteImageSerializer,
    responses={
        204: None,
        400: "Ошибка валидации (например, пустой список)"
    },
)
class ImageDeleteView(generics.GenericAPIView):
    queryset = LepImage.objects.all()
    serializer_class = BulkDeleteImageSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids_to_delete = serializer.validated_data['ids']

        deleted_count, _ = self.get_queryset().filter(id__in=ids_to_delete).delete()

        if deleted_count == 0:
            return Response(
                {"detail": "Изображения с указанными ID не найдены."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Обработка и отдача фото"])
class BatchUpdateView(generics.UpdateAPIView):
    queryset = Batch.objects.all()
    serializer_class = BatchUpdateSerializer
    http_method_names = ['patch']

    @extend_schema(
        summary="Обновить батч и получить ссылки на S3",
        description="""
        Обновляет имя батча и генерирует Presigned URLs для загрузки файлов в S3.

        **Параметры:**
        - `name` (опционально) — новое имя батча
        - `upload_requests` (опционально) — массив имен файлов

        **Ответ:**
        - Данные батча + словарь `presigned_urls` с ссылками
        """,
        request=BatchUpdateSerializer,
        responses={200: BatchUpdateResponseSerializer},
        examples=[
            OpenApiExample(
                'Изменение имени и запрос ссылок',
                value={
                    "name": "Партия от 21 ноября",
                    "upload_requests": ["image1.jpg", "image2.png"]
                },
                request_only=True
            ),
            OpenApiExample(
                'Только изменение имени',
                value={"name": "Новое имя"},
                request_only=True
            )
        ]
    )
    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        upload_requests = serializer.validated_data.pop('upload_requests', [])

        self.perform_update(serializer)

        presigned_urls = {}

        if upload_requests:
            s3_client = settings.S3_CLIENT_PRIVATE

            for filename in upload_requests:
                s3_key = make_file_key(instance.id, filename)

                try:
                    url = s3_client.generate_presigned_url(
                        'put_object',
                        Params={
                            'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                            'Key': s3_key
                        },
                        ExpiresIn=3600
                    )
                    presigned_urls[filename] = url
                except Exception as e:
                    pass

        response_data = serializer.data
        response_data['presigned_urls'] = presigned_urls

        return Response(response_data, status=status.HTTP_200_OK)
