# tools/image_generation.py
import os
import requests

# Use STABLE_DIFFUSION_API from ENV (set in .env file)
STABLE_URL = os.environ.get("STABLE_DIFFUSION_API") or os.environ.get("SD_WEBUI_URL")

def image_gen(prompt: str, width: int = 512, height: int = 512, steps: int = 20):
    if not STABLE_URL:
        return {"error": "No STABLE_DIFFUSION_API configured in .env file"}
    try:
        api = STABLE_URL.rstrip("/") + "/sdapi/v1/txt2img"
        data = {"prompt": prompt, "steps": steps, "width": width, "height": height}
        r = requests.post(api, json=data, timeout=30)
        if r.status_code != 200:
            return {"error": f"sd api returned {r.status_code}"}
        j = r.json()
        # return base64 or image list
        return {"ok": True, "result": j.get("images", [])}
    except Exception as e:
        return {"error": str(e)}

TOOL = {"name": "image_gen", "func": image_gen, "description": "Generate image (requires local Stable Diffusion WebUI configured)."}
