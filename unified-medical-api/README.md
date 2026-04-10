# Unified Medical AI API

Standalone FastAPI service that sits outside both source projects and combines:

- Atlas inference models as the primary engine
- DiagnoScope/Hackovium analyzers as fallbacks or specialty scans

## Run

```bash
cd unified-medical-api
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8010 --reload
```

## Main endpoints

- `GET /health`
- `GET /api/v1/scans/types`
- `POST /api/v1/scans/analyze`
- `POST /api/v1/ecg/analyze`
- `POST /api/v1/reports/generate`

