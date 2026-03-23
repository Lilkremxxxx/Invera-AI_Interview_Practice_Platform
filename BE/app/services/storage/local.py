import os
from pathlib import Path

# Thư mục uploads nằm ở gốc project (cùng cấp với BE/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"


class LocalStorageService:
    """Service lưu file trên local disk trong thư mục uploads/."""

    def __init__(self):
        self.base_dir = UPLOAD_DIR
        self.base_dir.mkdir(exist_ok=True)

    def save_file(self, file_obj, storage_path: str) -> str:
        """Lưu file vào disk, tạo thư mục con nếu cần. Trả về đường dẫn đầy đủ."""
        full_path = self.base_dir / storage_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "wb") as f:
            content = file_obj.read()
            f.write(content)
        return str(full_path)

    def get_url(self, storage_path: str) -> str:
        """Trả về URL public để truy cập file qua /media endpoint."""
        return f"/media/{storage_path}"

    def delete(self, storage_path: str) -> None:
        """Xóa file khỏi disk nếu tồn tại."""
        full_path = self.base_dir / storage_path
        if full_path.exists():
            full_path.unlink()
