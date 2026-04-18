"""
Flask microservice for ALARS ML risk classification.

Endpoints:
    POST /predict
    GET  /health
    GET  /model-info
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from flask import Flask, jsonify, request

sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from flask_cors import CORS

    HAS_CORS = True
except ImportError:
    HAS_CORS = False

from predict import RiskPredictor


app = Flask(__name__)
predictor = RiskPredictor()
SERVICE_START_TIME = time.time()

if HAS_CORS:
    CORS(app)
else:

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response


def ensure_model_loaded():
    artifacts_dir = Path(__file__).resolve().parent / "artifacts"
    model_path = artifacts_dir / "model.joblib"

    if not model_path.exists():
        print("\nNo trained model found. Training now...\n")
        from train import main as train_main

        train_main()

    if not predictor.load():
        print("ERROR: Failed to load model artifacts.")
        sys.exit(1)

    print(f"ML service ready. Model: {predictor.metadata.get('model_name', 'unknown')}")


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    supported_keys = {"message", "messages", "content", "template", "event_id", "component", "level"}
    if not any(key in data for key in supported_keys):
        return jsonify(
            {
                "error": (
                    "Provide one of: message, messages, or structured fields "
                    "(content/template/event_id/component/level)."
                )
            }
        ), 400

    try:
        started_at = time.time()
        result = predictor.predict(data)
        result["inference_time_ms"] = round((time.time() - started_at) * 1000, 2)
        return jsonify(result)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        return jsonify({"error": f"Prediction failed: {err}"}), 500


@app.route("/health", methods=["GET"])
def health():
    model_loaded = predictor.model is not None
    uptime_seconds = round(time.time() - SERVICE_START_TIME, 1)

    return jsonify(
        {
            "status": "healthy" if model_loaded else "degraded",
            "model_loaded": model_loaded,
            "model_name": predictor.metadata.get("model_name", "none") if predictor.metadata else "none",
            "uptime_seconds": uptime_seconds,
        }
    )


@app.route("/model-info", methods=["GET"])
def model_info():
    if predictor.model is None:
        return jsonify({"error": "Model not loaded"}), 503
    return jsonify(predictor.get_model_info())


@app.route("/", methods=["GET"])
def index():
    return jsonify(
        {
            "service": "ALARS ML Risk Classification Service",
            "version": "1.0.0",
            "port": int(os.environ.get("ML_SERVICE_PORT", 5001)),
            "endpoints": {
                "POST /predict": "Predict risk level from raw or structured logs",
                "GET /health": "Service health check",
                "GET /model-info": "Model metadata and evaluation metrics",
            },
            "example_requests": [
                {"message": "ERROR: writeBlock exception java.io.IOException Pipeline failure"},
                {
                    "message": "PacketResponder for block blk_456 terminating",
                    "event_id": "E7",
                    "component": "dfs.DataNode$PacketResponder",
                    "level": "WARN",
                },
            ],
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("ML_SERVICE_PORT", 5001))
    print(f"ALARS ML service starting on port {port}...")
    ensure_model_loaded()
    app.run(host="0.0.0.0", port=port, debug=False)
