import os
import tempfile
from io import BytesIO

from PIL import Image
from PIL.ExifTags import GPSTAGS, IFD
from celery import shared_task
from django.conf import settings
from ultralytics import YOLO

from .models import LepImage, AiModel


def dms_to_decimal(dms, ref):
    """
    Конвертирует координаты из DMS (градусы, минуты, секунды) в десятичный формат.

    Args:
        dms: tuple из (градусы, минуты, секунды)
        ref: направление ('N', 'S', 'E', 'W')

    Returns:
        float: координата в десятичном формате
    """
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)

    if ref in ['S', 'W']:
        decimal = -decimal

    return decimal


def extract_gps_from_image(image):
    """
    Извлекает GPS координаты из EXIF данных изображения.

    Args:
        image: PIL Image объект

    Returns:
        dict: словарь с latitude и longitude или None
    """
    try:
        exif = image.getexif()

        if not exif:
            return None

        # Получаем GPS информацию
        gps_info = exif.get_ifd(IFD.GPSInfo)

        if not gps_info:
            return None

        # Извлекаем необходимые GPS теги
        gps_latitude = gps_info.get(GPSTAGS.get('GPSLatitude'))
        gps_latitude_ref = gps_info.get(GPSTAGS.get('GPSLatitudeRef'))
        gps_longitude = gps_info.get(GPSTAGS.get('GPSLongitude'))
        gps_longitude_ref = gps_info.get(GPSTAGS.get('GPSLongitudeRef'))

        if gps_latitude and gps_latitude_ref and gps_longitude and gps_longitude_ref:
            lat = dms_to_decimal(gps_latitude, gps_latitude_ref)
            lon = dms_to_decimal(gps_longitude, gps_longitude_ref)

            return {
                'latitude': lat,
                'longitude': lon
            }

        return None

    except Exception as e:
        print(f"Error extracting GPS: {str(e)}")
        return None


@shared_task(
    soft_time_limit=300,
    time_limit=360,
)
def process_image_task(file_key: str, model_id: int):
    """
    Обрабатывает изображение с помощью YOLO модели.

    Args:
        file_key: Ключ файла в S3
        model_id: Объект модели
    """
    s3_client = settings.S3_CLIENT_PRIVATE
    bucket = settings.AWS_STORAGE_BUCKET_NAME

    try:
        image_obj = LepImage.objects.get(file_key=file_key)
    except LepImage.DoesNotExist:
        return {"error": f"Image with file_key={file_key} not found"}

    try:
        model_obj = AiModel.objects.get(id=model_id)
        model = YOLO(model_obj.model_file.path)
    except AiModel.DoesNotExist:
        return {"error": f"Model with id={model_id} not found"}

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

        gps_data = extract_gps_from_image(image)

        results = model.predict(tmp_path, imgsz=768, conf=0.25, save=False)

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

        image_obj.preview = preview_key
        image_obj.result = result_key
        image_obj.detection_result = detections

        if gps_data:
            image_obj.latitude = gps_data['latitude']
            image_obj.longitude = gps_data['longitude']
        else:
            # СДЕЛАНО ИСКЛЮЧИТЕЛЬНО ДЛЯ ТЕСТА И ПОКАЗА ФУНКЦИОНАЛЬНОСТИ
            # УБРАТЬ ДЛЯ ПРОДАКШЕНА
            _gps = generate_random_russia_coordinates()
            image_obj.latitude = _gps["latitude"]
            image_obj.longitude = _gps["longitude"]

        image_obj.save()

        response_data = {
            "file_key": file_key,
            "detections_count": len(detections),
            "result_key": result_key,
            "preview_key": preview_key,
        }

        return response_data

    except Exception as e:
        return {"error": f"Error during prediction: {str(e)}", "file_key": file_key}

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)





def generate_random_russia_coordinates():
    import random
    """
    Генерирует случайные GPS координаты в пределах РФ
    """

    latitude = random.uniform(53.0, 58.0)
    longitude = random.uniform(35.0, 42.0)

    return {
        'latitude': round(latitude, 6),
        'longitude': round(longitude, 6)
    }