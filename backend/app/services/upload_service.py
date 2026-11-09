import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings


ALLOWED_TYPES = {"image/jpeg": ("JPEG", ".jpg"), "image/png": ("PNG", ".png"), "image/webp": ("WEBP", ".webp")}
MAX_PIXELS = 20_000_000


def _cloudinary_uploader():
    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Cloudinary package is not installed") from exc
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    return cloudinary.uploader


def _sanitize_image(data: bytes, content_type: str) -> bytes:
    expected_format, _ = ALLOWED_TYPES[content_type]
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
        with Image.open(io.BytesIO(data)) as image:
            if image.format != expected_format:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image content does not match its file type")
            if image.width * image.height > MAX_PIXELS:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image dimensions are too large")
            image.thumbnail((2400, 2400))
            output = io.BytesIO()
            if expected_format == "JPEG":
                image = image.convert("RGB")
                image.save(output, format="JPEG", quality=90, optimize=True)
            elif expected_format == "PNG":
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA")
                image.save(output, format="PNG", optimize=True)
            else:
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGB")
                image.save(output, format="WEBP", quality=90, method=4)
            return output.getvalue()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is not a valid image") from exc


async def validate_image(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPG, PNG and WEBP images are allowed")
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image must be under {settings.max_upload_mb} MB")
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    return _sanitize_image(data, file.content_type)


async def save_product_image(file: UploadFile) -> str:
    data = await validate_image(file)
    _, extension = ALLOWED_TYPES[file.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"

    if settings.cloudinary_configured:
        uploader = _cloudinary_uploader()
        result = uploader.upload(data, folder="customgift/products", resource_type="image")
        return result["secure_url"]

    folder = settings.media_root / "products"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / filename).write_bytes(data)
    return f"/media/products/{filename}"


async def save_customization_image(file: UploadFile, user_id: int) -> str:
    data = await validate_image(file)
    _, extension = ALLOWED_TYPES[file.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"

    if settings.cloudinary_configured:
        uploader = _cloudinary_uploader()
        result = uploader.upload(
            data,
            folder=f"customgift/customizations/{user_id}",
            resource_type="image",
            type="upload",
        )
        return result["secure_url"]

    relative = Path("customizations") / str(user_id) / filename
    destination = settings.media_root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return f"local:{relative.as_posix()}"


def resolve_private_local_path(reference: str) -> Path | None:
    if not reference.startswith("local:"):
        return None
    relative = Path(reference.removeprefix("local:"))
    candidate = (settings.media_root / relative).resolve()
    root = settings.media_root.resolve()
    if root not in candidate.parents:
        return None
    return candidate
