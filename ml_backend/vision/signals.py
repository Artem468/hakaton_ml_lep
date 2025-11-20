from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import LepImage


@receiver(post_delete, sender=LepImage)
def delete_s3_files_on_image_delete(sender, instance, **kwargs):
    """
    Удаляет файлы из S3 при удалении записи LepImage из БД.
    """
    s3_client = settings.S3_CLIENT_PRIVATE
    bucket = settings.AWS_STORAGE_BUCKET_NAME

    keys_to_delete = []

    if instance.file_key:
        keys_to_delete.append(instance.file_key)

    if instance.preview:
        keys_to_delete.append(instance.preview)

    if instance.result:
        keys_to_delete.append(instance.result)

    if not keys_to_delete:
        return

    objects_to_delete = [{'Key': key} for key in keys_to_delete]

    try:
        s3_client.delete_objects(
            Bucket=bucket,
            Delete={
                'Objects': objects_to_delete,
                'Quiet': True
            }
        )
    except Exception as e:
        print(f"Error deleting files from S3 for Image {instance.id}: {str(e)}")
