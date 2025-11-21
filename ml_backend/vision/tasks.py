import os
import tempfile
from io import BytesIO
from PIL import Image
from celery import shared_task
from django.conf import settings
from ultralytics import YOLO

from .models import LepImage


@shared_task
def process_image_task(file_key: str, model: YOLO):
    """
    Обрабатывает изображение с помощью YOLO модели.

    Args:
        file_key: Ключ файла в S3
        model: Объект модели
    """
    s3_client = settings.S3_CLIENT_PRIVATE
    bucket = settings.AWS_STORAGE_BUCKET_NAME

    try:
        image_obj = LepImage.objects.get(file_key=file_key)
    except LepImage.DoesNotExist:
        return {"error": f"Image with file_key={file_key} not found"}

    try:
        obj = s3_client.get_object(Bucket=bucket, Key=file_key)
        img_data = obj["Body"].read()
    except Exception as e:
        return {"error": f"Failed to load image from S3: {str(e)}"}

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
        tmp_path = tmp_file.name
        tmp_file.write(img_data)

    try:
        image = Image.open(BytesIO(img_data))
        img_format = image.format if image.format else "JPEG"

        results = model.predict(tmp_path, imgsz=768, conf=0.25, save=False)

        # Проверяем что результаты получены
        if not results or len(results) == 0:
            return {
                "error": "No results from YOLO prediction",
                "file_key": file_key,
                "detections_count": 0,
            }

        r = results[0]

        detections = []
        if r.boxes is not None and len(r.boxes) > 0:
            labels = r.boxes.cls.cpu().numpy()
            scores = r.boxes.conf.cpu().numpy()
            boxes = r.boxes.xyxy.cpu().numpy()

            for cls, conf, box in zip(labels, scores, boxes):
                detections.append({
                    "class": model.names[int(cls)],
                    "confidence": float(conf),
                    "bbox": box.tolist(),
                })

        plotted_image_array = r.plot()
        plotted_image = Image.fromarray(plotted_image_array[..., ::-1])

        result_bytes = BytesIO()
        plotted_image.save(result_bytes, format=img_format)
        result_bytes.seek(0)

        result_key = file_key.replace("uploads", "results")
        if result_key == file_key:
            result_key = f"results/{file_key}"

        s3_client.put_object(
            Bucket=bucket,
            Key=result_key,
            Body=result_bytes,
            ContentType=f"image/{img_format.lower()}",
            ACL="public-read",
        )

        # Создаём и сохраняем превью
        preview = image.copy()
        preview.thumbnail((512, 512))
        preview_bytes = BytesIO()
        preview.save(preview_bytes, format=img_format)
        preview_bytes.seek(0)

        preview_key = file_key.replace("uploads", "previews")
        if preview_key == file_key:
            preview_key = f"previews/{file_key}"

        s3_client.put_object(
            Bucket=bucket,
            Key=preview_key,
            Body=preview_bytes,
            ContentType=f"image/{img_format.lower()}",
            ACL="public-read",
        )

        # Обновляем объект в БД
        image_obj.preview = preview_key
        image_obj.result = result_key
        image_obj.detection_result = detections
        image_obj.save()

        return {
            "file_key": file_key,
            "detections_count": len(detections),
            "result_key": result_key,
            "preview_key": preview_key,
        }

    except Exception as e:
        return {"error": f"Error during prediction: {str(e)}", "file_key": file_key}

    finally:
        # Удаляем временный файл
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
