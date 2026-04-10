from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import cv2
import numpy as np
import base64
import io
import uuid
import pydicom
import os
from PIL import Image
from fastapi.responses import FileResponse
from pydantic import BaseModel
from report_generator import ReportGenerator

from blood import DRAnalyzer

# ================= APP =================
app = FastAPI(title="Diabetic Retinopathy Detection API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= REPORT MODELS =================
class ReportRequest(BaseModel):
    patient_name: str
    doctor_name: str
    diagnosis: str
    confidence: float
    metrics: dict
    images: dict
    modality: str

# ================= STORAGE =================
results_db: Dict[str, dict] = {}

# ================= MODEL =================
print("⏳ Loading DR Engine...")
dr_engine = DRAnalyzer(os.path.abspath("best_modeldensenet121.pth"))

# ================= HELPERS =================
def img_to_base64(img):
    _, buffer = cv2.imencode(".png", cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    return base64.b64encode(buffer).decode("utf-8")

def process_image_file(file_content: bytes, filename: str) -> np.ndarray:
    try:
        if filename.lower().endswith(".dcm"):
            dicom_data = pydicom.dcmread(io.BytesIO(file_content))
            img = dicom_data.pixel_array
            if img.max() > 255:
                img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
            img = img.astype(np.uint8)
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
            return img
        else:
            return np.array(Image.open(io.BytesIO(file_content)).convert("RGB"))
    except Exception as e:
        print(f"Error processing file {filename}: {e}")
        return None

@app.post("/analyze")
async def analyze(
    analysis_type: str = Form(...),
    files: List[UploadFile] = File(...)
):
    job_id = str(uuid.uuid4())
    responses = []

    for file in files:
        img_bytes = await file.read()
        img = process_image_file(img_bytes, file.filename)
        
        if img is None:
            responses.append({
                "filename": file.filename,
                "error": "Could not process image"
            })
            continue

        if analysis_type == "dr":
            # Diabetic Retinopathy Logic
            result = dr_engine.analyze(img)
            
            if "error" in result:
                 responses.append({
                    "filename": file.filename,
                    "error": result["error"]
                 })
            else:
                responses.append({
                    "filename": file.filename,
                    "detections_image": result.get('lesion_base64') or result.get('original_base64'),
                    "confidence": result.get('confidence'),
                    "method_used": f"DR AI: {result.get('prediction')}",
                    "smart_mode": True,
                    "dr_details": result 
                })


    results_db[job_id] = {
        "status": "completed",
        "analysis_type": analysis_type,
        "results": responses
    }

    return {
        "job_id": job_id,
        "message": "Analysis complete. Use GET /result/{job_id} to fetch results."
    }

@app.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in results_db:
        raise HTTPException(status_code=404, detail="Job ID not found")
    
    return results_db[job_id]

@app.post("/generate_report")
async def generate_report(req: ReportRequest):
    processed_images = {}
    for key, b64 in req.images.items():
        try:
            if "," in b64: b64 = b64.split(",")[1]
            b64 += "=" * ((4 - len(b64) % 4) % 4)
            img_data = base64.b64decode(b64)
            processed_images[key] = Image.open(io.BytesIO(img_data))
        except Exception as e:
            print(f"Image decode error {key}: {e}")
            processed_images[key] = None

    safe_name = "".join([c for c in req.patient_name if c.isalnum() or c in "._- "]).strip()
    pdf_filename = f"Report_{safe_name}.pdf"
    
    gen = ReportGenerator(pdf_filename)
    
    patient_data = {"name": req.patient_name, "doctor": req.doctor_name}
    analysis_data = {
        "diagnosis": req.diagnosis,
        "confidence": req.confidence,
        "metrics": req.metrics,
        "images": processed_images
    }
    
    pdf_path = gen.generate_report(patient_data, analysis_data, modality=req.modality)
    return FileResponse(pdf_path, media_type='application/pdf', filename=pdf_filename)
