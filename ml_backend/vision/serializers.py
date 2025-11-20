from rest_framework import serializers

from .models import AiModel, Batch, LepImage


class AiModelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiModel
        fields = ("id", "name")


class BatchListSerializer(serializers.ModelSerializer):
    photo_count = serializers.SerializerMethodField()
    detection_results = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ("id", "name", "uploaded_at", "photo_count", "detection_results")

    def get_photo_count(self, obj) -> int:
        return obj.lepimage_set.count()

    def get_detection_results(self, obj) -> list:
        return [
            img.detection_result
            for img in obj.lepimage_set.all()
            if img.detection_result
        ]


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