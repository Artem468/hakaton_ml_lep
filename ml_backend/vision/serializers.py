from rest_framework import serializers

from .models import AiModel, Batch, LepImage


class AiModelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiModel
        fields = ("id", "name")


class BatchListSerializer(serializers.ModelSerializer):
    photo_count = serializers.SerializerMethodField()
    detection_results = serializers.SerializerMethodField()
    processing_status = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ("id", "name", "uploaded_at", "photo_count", "detection_results", "processing_status",)

    def get_photo_count(self, obj) -> int:
        return obj.lepimage_set.count()

    def get_detection_results(self, obj) -> list:
        return [
            img.detection_result
            for img in obj.lepimage_set.all()
            if img.detection_result
        ]

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
    class Meta:
        model = LepImage
        fields = [
            "id",
            "file_key",
            "preview",
            "latitude",
            "longitude",
            "created_at",
            "detection_result",
        ]


class UploadFileItemSerializer(serializers.Serializer):
    filename = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)


class InitUploadSerializer(serializers.Serializer):
    batch_name = serializers.CharField()
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
