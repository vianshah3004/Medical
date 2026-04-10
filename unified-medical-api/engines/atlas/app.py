from __future__ import annotations

from contextlib import asynccontextmanager
from enum import Enum

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, Response

from catalog import CLINICAL_SYSTEM_NAME, MODEL_SPECS
from service import InferenceService

inference_service = InferenceService()


ModelName = Enum(
    "ModelName",
    {name: name for name in [*MODEL_SPECS.keys(), CLINICAL_SYSTEM_NAME]},
    type=str,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    inference_service.load_all()
    yield


app = FastAPI(
    title="Atlas Unified PT Inference Service",
    version="1.0.0",
    description="Standalone FastAPI service for the VaidyaVision PyTorch checkpoints.",
    lifespan=lifespan,
)


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse(
        {
            "service": "Atlas Unified PT Inference Service",
            "status": "ok",
            "ui": "/ui",
            "docs": "/docs",
            "health": "/health",
            "models": "/models",
            "predict": "/predict",
        }
    )


@app.get("/favicon.ico")
def favicon() -> Response:
    return Response(status_code=204)


@app.get("/ui")
def upload_ui() -> HTMLResponse:
    return HTMLResponse(
        """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Atlas Inference UI</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 880px; margin: 40px auto; padding: 0 16px; }
            form { display: grid; gap: 16px; padding: 20px; border: 1px solid #ddd; border-radius: 12px; }
            label { display: grid; gap: 8px; font-weight: 600; }
            input, select, button { font: inherit; padding: 10px; }
            button { cursor: pointer; }
            pre { white-space: pre-wrap; word-break: break-word; background: #f6f8fa; padding: 16px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <h1>Atlas Unified PT Inference Service</h1>
          <p>Upload a JPEG or PNG image, choose a model, and run prediction.</p>

          <form id="predict-form">
            <label>
              Model
              <select id="model_name" name="model_name" required></select>
            </label>

            <label>
              MC Samples
              <input id="mc_samples" name="mc_samples" type="number" min="1" max="50" value="1" />
            </label>

            <label>
              Image
              <input id="image" name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" required />
            </label>

            <button type="submit">Predict</button>
          </form>

          <h2>Response</h2>
          <pre id="result">Waiting for request...</pre>

          <script>
            async function loadModels() {
              const response = await fetch('/models');
              const payload = await response.json();
              const select = document.getElementById('model_name');

              for (const model of payload.models) {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name + ' - ' + model.purpose;
                select.appendChild(option);
              }

              select.value = 'clinical_system';
            }

            document.getElementById('predict-form').addEventListener('submit', async (event) => {
              event.preventDefault();

              const formData = new FormData();
              const fileInput = document.getElementById('image');
              const modelName = document.getElementById('model_name').value;
              const mcSamples = document.getElementById('mc_samples').value;

              if (!fileInput.files.length) {
                document.getElementById('result').textContent = 'Please choose an image file.';
                return;
              }

              formData.append('image', fileInput.files[0]);
              formData.append('model_name', modelName);
              formData.append('mc_samples', mcSamples);

              const response = await fetch('/predict', { method: 'POST', body: formData });
              const payload = await response.json();
              document.getElementById('result').textContent = JSON.stringify(payload, null, 2);
            });

            loadModels();
          </script>
        </body>
        </html>
        """
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "device": str(inference_service.device),
        "loaded_models": list(inference_service.models.keys()) + [CLINICAL_SYSTEM_NAME],
    }


@app.get("/models")
def list_models() -> dict[str, object]:
    return {"models": inference_service.list_models()}


@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    model_name: ModelName = Form(...),
    mc_samples: int = Form(1),
) -> dict[str, object]:
    if mc_samples < 1 or mc_samples > 50:
        raise HTTPException(status_code=400, detail="mc_samples must be between 1 and 50.")

    if image.content_type not in {"image/jpeg", "image/png", "image/jpg", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PNG and JPEG images are supported.")

    try:
        contents = await image.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")
        return inference_service.predict(contents, model_name=model_name.value, mc_samples=mc_samples)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
