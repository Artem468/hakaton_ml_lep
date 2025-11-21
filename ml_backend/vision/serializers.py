from rest_framework import serializers

from .models import AiModel, Batch, LepImage


class AiModelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiModel
        fields = ("id", "name")


class BatchListSerializer(serializers.ModelSerializer):
    photo_count = serializers.SerializerMethodField()
    processing_status = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ("id", "name", "uploaded_at", "photo_count", "processing_status",)

    def get_photo_count(self, obj) -> int:
        return obj.lepimage_set.count()

    def get_processing_status(self, obj) -> str:
        if obj.status:
            return "reviewed"

        images = LepImage.objects.filter(batch=obj)
        total = images.count()

        processed_count = images.filter(detection_result__isnull=False).count()

        if processed_count == 0:
            return "not_processed"

        if processed_count < total:
            return "processing"

        if processed_count == total:
            return "completed"

        return "not_processed"


class LepImageSerializer(serializers.ModelSerializer):
    uploaded_at = serializers.DateTimeField(source='batch.uploaded_at', read_only=True)

    damages = serializers.SerializerMethodField()
    objects = serializers.SerializerMethodField()

    class Meta:
        model = LepImage
        fields = [
            "id",
            "file_key",
            "preview",
            "result",
            "latitude",
            "longitude",
            "uploaded_at",
            "damages",
            "objects"
        ]

    def _filter_detections(self, data, target_classes):
        if not data:
            return []

        return [
            {
                "class": item.get("class"),
                "confidence": item.get("confidence")
            }
            for item in data
            if item.get("class") in target_classes
        ]

    def get_damages(self, obj):
        damage_classes = {
            "bad_insulator",
            "damaged_insulator",
            "nest"
        }
        return self._filter_detections(obj.detection_result, damage_classes)

    def get_objects(self, obj):
        object_classes = {
            "vibration_damper",
            "festoon_insulators",
            "traverse",
            "polymer_insulators",
            "safety_sign"
        }
        return self._filter_detections(obj.detection_result, object_classes)


class UploadFileItemSerializer(serializers.Serializer):
    filename = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)


class InitUploadSerializer(serializers.Serializer):
    batch_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    files = UploadFileItemSerializer(many=True)


class ConfirmUploadSerializer(serializers.Serializer):
    batch_id = serializers.IntegerField()
    model_id = serializers.IntegerField()


class BatchStatusSerializer(serializers.ModelSerializer):
    processing_status = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ["id", "name", "uploaded_at", "processing_status"]

    def get_processing_status(self, obj: Batch) -> str:
        if obj.status:
            return "reviewed"

        images = LepImage.objects.filter(batch=obj)
        total = images.count()

        processed_count = images.filter(detection_result__isnull=False).count()

        if processed_count == 0:
            return "not_processed"

        if processed_count < total:
            return "processing"

        if processed_count == total:
            return "completed"

        return "not_processed"


class DeleteBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = ['id']


class BulkDeleteImageSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        help_text="Список ID изображений для удаления"
    )


class BatchUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для входящих данных"""
    upload_requests = serializers.ListField(
        child=serializers.CharField(max_length=255),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="Список имен файлов для загрузки"
    )

    class Meta:
        model = Batch
        fields = ['id', 'name', 'status', 'uploaded_at', 'upload_requests']
        read_only_fields = ['id', 'status', 'uploaded_at']


class BatchUpdateResponseSerializer(serializers.ModelSerializer):
    """Сериализатор для ответа (показывает presigned_urls в Swagger)"""
    presigned_urls = serializers.DictField(
        child=serializers.URLField(),
        read_only=True,
        help_text="Словарь с presigned URLs: {'filename.jpg': 'https://s3.amazonaws.com/...'}"
    )

    class Meta:
        model = Batch
        fields = ['id', 'name', 'status', 'uploaded_at', 'presigned_urls']


class DailyDefectSerializer(serializers.Serializer):
    """Статистика дефектов по дням"""
    date = serializers.DateField(help_text="Дата")
    defect_count = serializers.IntegerField(help_text="Количество дефектов")
    image_count = serializers.IntegerField(help_text="Количество изображений")


class DefectStatsWeeklySerializer(serializers.Serializer):
    """Статистика за неделю"""
    daily_stats = DailyDefectSerializer(many=True, help_text="Статистика по дням")
    total_defects = serializers.IntegerField(help_text="Всего дефектов за неделю")
