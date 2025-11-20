import datetime
import uuid


def make_file_key(batch_id: int, original_name: str) -> str:
    ext = original_name.split(".")[-1].lower()
    uid = uuid.uuid4()
    today = datetime.datetime.now(datetime.UTC)

    return (
        f"uploads/{today:%Y/%m/%d}/batch_{batch_id}/{uid}.{ext}"
    )