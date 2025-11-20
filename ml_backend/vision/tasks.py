from io import BytesIO
from PIL import Image
from celery import shared_task
from django.conf import settings
from .models import LepImage
from ultralytics import YOLO



@shared_task
def process_image_task(file_key: str, model: YOLO):
    s3_client = settings.S3_CLIENT_PRIVATE
    bucket = settings.AWS_STORAGE_BUCKET_NAME

    image_obj = LepImage.objects.get(file_key=file_key)

    obj = s3_client.get_object(Bucket=bucket, Key=file_key)
    img_data = obj['Body'].read()
    image = Image.open(BytesIO(img_data))

    results = model.predict(image, imgsz=640, conf=0.25, save=False)
    r = results[0]

    detections = []
    labels = r.boxes.cls.cpu().numpy()
    scores = r.boxes.conf.cpu().numpy()
    boxes = r.boxes.xyxy.cpu().numpy()

    for cls, conf, box in zip(labels, scores, boxes):
        detections.append({
            "class": model.names[int(cls)],
            "confidence": float(conf),
            "bbox": box.tolist()
        })

    plotted_image_array = r.plot()
    plotted_image = Image.fromarray(plotted_image_array[..., ::-1])

    result_bytes = BytesIO()
    img_format = image.format if image.format else "JPEG"
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
    image_obj.save()