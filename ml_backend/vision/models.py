from django.db import models


class AiModel(models.Model):
    model_file = models.FileField(
        upload_to="models/", max_length=500, verbose_name="Файл"
    )
    name = models.CharField(max_length=255, verbose_name="Название")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Загружено")

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-uploaded_at"]
        verbose_name = "Модель ИИ"
        verbose_name_plural = "Модели ИИ"


class Batch(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название", null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Загружено")
    status = models.BooleanField(default=False, verbose_name="Просмотрено")

    def __str__(self):
        return self.name or '---'

    class Meta:
        ordering = ["-uploaded_at"]
        verbose_name = "Набор фото"
        verbose_name_plural = "Наборы фото"


class LepImage(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, verbose_name="Контейнер")
    file_key = models.CharField(
        max_length=500,
        help_text="Путь в бакете MinIO (например: uploads/2025/11/18/dronex/12345.tiff)",
        verbose_name="Оригинал",
    )
    preview = models.CharField(
        max_length=500,
        help_text="Путь в бакете на превью MinIO (например: uploads/2025/11/18/dronex/12345.tiff)",
        verbose_name="Превью",
        null=True,
        blank=True,
    )
    result = models.CharField(
        max_length=500,
        help_text="Путь в бакете на результат ИИ MinIO (например: uploads/2025/11/18/dronex/12345.tiff)",
        verbose_name="Результат",
        null=True,
        blank=True,
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text="Широта (GPS) снимка",
        verbose_name="Широта",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text="Долгота (GPS) снимка",
        verbose_name="Долгота",
    )
    created_at = models.DateTimeField(null=True, blank=True, verbose_name="Создано")
    detection_result = models.JSONField(blank=True, null=True)

    def __str__(self):
        return self.file_key

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Фото"
        verbose_name_plural = "Фото"