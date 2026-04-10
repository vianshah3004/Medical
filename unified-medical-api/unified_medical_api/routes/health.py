from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from unified_medical_api.services.registry import registry

router = APIRouter(tags=["health"])


@router.get("/")
def root() -> dict[str, object]:
    return {
        "service": "Unified Medical AI API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "scan_types": "/api/v1/scans/types",
        "ui": "/ui",
    }


@router.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "atlas_loaded": registry.atlas_loaded,
        "diagno_loaded": registry.diagno_loaded,
        "supported_scan_types": registry.scan_catalog(),
    }


@router.get("/ui")
def test_ui() -> HTMLResponse:
    scan_options = [
        ("brain", "Brain MRI"),
        ("lung", "Lung Scan"),
        ("skin", "Skin Lesion"),
        ("fracture", "Fracture"),
        ("diabetic_retinopathy", "Diabetic Retinopathy"),
        ("ecg_image", "ECG Image"),
        ("ecg_signal", "ECG Signal"),
    ]
    options_html = "\n".join(
        f'<option value="{value}">{label}</option>' for value, label in scan_options
    )
    return HTMLResponse(
        f"""
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Unified Medical AI Tester</title>
          <style>
            body {{
              font-family: Arial, sans-serif;
              max-width: 880px;
              margin: 40px auto;
              padding: 0 16px;
              background: #f7faf9;
              color: #1f2937;
            }}
            .card {{
              background: white;
              border: 1px solid #d1fae5;
              border-radius: 14px;
              padding: 24px;
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
            }}
            form {{
              display: grid;
              gap: 16px;
            }}
            label {{
              display: grid;
              gap: 8px;
              font-weight: 600;
            }}
            select, input, button {{
              font: inherit;
              padding: 12px;
              border-radius: 10px;
              border: 1px solid #cbd5e1;
            }}
            button {{
              background: #2563eb;
              border: none;
              color: white;
              cursor: pointer;
              font-weight: 700;
            }}
            pre {{
              white-space: pre-wrap;
              word-break: break-word;
              background: #0f172a;
              color: #e2e8f0;
              padding: 16px;
              border-radius: 12px;
              margin-top: 20px;
            }}
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Unified Medical AI Tester</h1>
            <p>Choose a scan type, upload a file, and run a test request.</p>
            <form id="scan-form">
              <label>
                Scan Type
                <select id="scan_type" name="scan_type" required>
                  {options_html}
                </select>
              </label>

              <label>
                File Upload
                <input id="files" name="files" type="file" required />
              </label>

              <label>
                MC Samples
                <input id="mc_samples" name="mc_samples" type="number" min="1" max="50" value="1" />
              </label>

              <button type="submit">Run Scan</button>
            </form>

            <pre id="result">Waiting for request...</pre>
          </div>

          <script>
            const form = document.getElementById('scan-form');
            const result = document.getElementById('result');

            form.addEventListener('submit', async (event) => {{
              event.preventDefault();
              const fileInput = document.getElementById('files');
              const scanType = document.getElementById('scan_type').value;
              const mcSamples = document.getElementById('mc_samples').value;

              if (!fileInput.files.length) {{
                result.textContent = 'Please choose a file first.';
                return;
              }}

              const body = new FormData();
              body.append('scan_type', scanType);
              body.append('files', fileInput.files[0]);
              body.append('mc_samples', mcSamples);

              const endpoint = scanType === 'ecg_signal'
                ? '/api/v1/ecg/analyze'
                : '/api/v1/scans/analyze';

              if (scanType === 'ecg_signal') {{
                body.delete('scan_type');
                body.delete('mc_samples');
                body.delete('files');
                body.append('file', fileInput.files[0]);
              }}

              const response = await fetch(endpoint, {{
                method: 'POST',
                body
              }});

              const payload = await response.json();
              result.textContent = JSON.stringify(payload, null, 2);
            }});
          </script>
        </body>
        </html>
        """
    )
