from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import AiModel, Batch, LepImage


@admin.register(AiModel)
class AiModelAdmin(ModelAdmin):
    list_display = ("name", "uploaded_at",)
    search_fields = ("name",)
    readonly_fields = ("uploaded_at",)



@admin.register(Batch)
class BatchAdmin(ModelAdmin):
    list_display = ("name", "id", "uploaded_at", "photo_count")
    search_fields = ("name",)
    readonly_fields = ("uploaded_at",)

    def photo_count(self, obj):
        return obj.lepimage_set.count()
    photo_count.short_description = "Количество фото"


@admin.register(LepImage)
class LepImageAdmin(ModelAdmin):
    list_display = ("file_key", "created_at", "latitude", "longitude")
    list_filter = ("batch",)
    autocomplete_fields = ("batch",)
    search_fields = ("file_key",)
    readonly_fields = ("created_at", "detection_result")

