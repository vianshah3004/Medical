from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import numpy as np
import torch
import os
import io
import uuid
from typing import Dict, List
from PIL import Image

from .ecg_model import ECGModel
from .report_generator import ReportGenerator
from unified_medical_api.config import WEIGHTS_DIR

# ================= APP =================
app = FastAPI(title="ECG Detection API")

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
# In-memory storage for job results
results_db: Dict[str, dict] = {}

# ================= MODEL =================
print("⏳ Loading ECG Model...")

MODEL_PATH = str(WEIGHTS_DIR / "ecg_mit_model.pth")

model = ECGModel()
model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
model.eval()

print("✅ ECG Model Loaded")

# ================= CLASSES =================
CLASSES = ["Normal", "PVC", "Atrial", "LBBB"]

# ================= PREPROCESS =================
def preprocess(signal):
    signal = signal[:200]

    if len(signal) < 200:
        signal = np.pad(signal, (0, 200 - len(signal)))

    signal = (signal - np.mean(signal)) / (np.std(signal) + 1e-8)

    signal = signal.reshape(1, 1, 200)
    return torch.tensor(signal, dtype=torch.float32)

# ================= PREDICT =================
def predict(signal):
    tensor = preprocess(signal)

    with torch.no_grad():
        output = model(tensor)
        probs = torch.softmax(output, dim=1)
        pred = torch.argmax(probs, dim=1).item()

    return {
        "prediction": CLASSES[pred],
        "confidence": float(probs[0][pred])
    }

# ================= API =================
@app.post("/analyze")
async def analyze_ecg(
    analysis_type: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        file = files[0] # Take the first ECG file
        job_id = str(uuid.uuid4())
        
        # Save uploaded file temporarily
        temp_path = f"temp_{job_id}_{file.filename}"

        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Load data
        try:
            # Robust loading: try different delimiters
            data = None
            for delim in [None, ',', ';', '\t']:
                try:
                    data = np.loadtxt(temp_path, delimiter=delim)
                    if data is not None: break
                except:
                    continue
            
            if data is None:
                raise ValueError("Could not parse signal data with standard delimiters.")

            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

            # Handle CSV / TXT (multi-column)
            if len(data.shape) > 1:
                # Take the first channel/column
                signal = data[:, 0]
            else:
                signal = data

            res = predict(signal)
            
            # Store result in same format as others for frontend compatibility
            results_db[job_id] = {
                "status": "completed",
                "results": [
                    {
                        "filename": file.filename,
                        "prediction": res["prediction"],
                        "confidence": round(res["confidence"] * 100, 1),
                        "detections_image": None, # ECG doesn't have detection images yet
                        "ecg_details": {
                            "prediction": res["prediction"],
                            "confidence": round(res["confidence"] * 100, 1),
                            "insight": f"Analysis indicates {res['prediction']} rhythm with high confidence."
                        }
                    }
                ]
            }

            return {
                "status": "success",
                "job_id": job_id
            }

        except Exception as inner_e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Analysis Error: {str(inner_e)}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in results_db:
        raise HTTPException(status_code=404, detail="Job ID not found")
    return results_db[job_id]

@app.post("/generate_report")
async def generate_report(req: ReportRequest):
    processed_images = {}
    # ECG might not have images, but we'll try to process if any sent
    for key, b64 in req.images.items():
        if not b64: continue
        try:
            import base64
            if "," in b64: b64 = b64.split(",")[1]
            b64 += "=" * ((4 - len(b64) % 4) % 4)
            img_data = base64.b64decode(b64)
            processed_images[key] = Image.open(io.BytesIO(img_data))
        except Exception as e:
            print(f"Image decode error {key}: {e}")
            processed_images[key] = None

    safe_name = "".join([c for c in req.patient_name if c.isalnum() or c in "._- "]).strip()
    pdf_filename = f"ECG_Report_{safe_name}.pdf"
    
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