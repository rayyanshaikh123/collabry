# tools/ocr_read.py
try:
    import pytesseract
    from PIL import Image
    _HAS_OCR = True
except Exception:
    _HAS_OCR = False

def ocr_read(path_or_bytes):
    if not _HAS_OCR:
        return {"error": "pytesseract/Pillow not installed"}
    try:
        if isinstance(path_or_bytes, (bytes, bytearray)):
            from io import BytesIO
            img = Image.open(BytesIO(path_or_bytes))
        else:
            img = Image.open(path_or_bytes)
        txt = pytesseract.image_to_string(img)
        return {"text": txt}
    except Exception as e:
        return {"error": str(e)}

TOOL = {"name": "ocr_read", "func": ocr_read, "description": "Extract text from image using Tesseract (optional)."}
