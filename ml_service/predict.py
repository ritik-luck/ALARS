"""
Prediction helpers for the ALARS ML service.

Key improvements over v1:
  - Keyword-boost layer that adjusts raw ML probabilities based on
    domain-specific anomaly/normal keywords found in the input.
  - Tighter default risk thresholds calibrated for single-line inference.
  - Cleaner risk-probability computation using softmax-style mapping.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import numpy as np

from feature_engineering import FeatureExtractor
from preprocessing import compose_log_document


# ---------------------------------------------------------------------------
# Tighter default thresholds for single-line + block-level inputs
# ---------------------------------------------------------------------------
DEFAULT_THRESHOLDS = {
    "LOW": 0.25,
    "MEDIUM": 0.50,
    "HIGH": 0.80,
}

SEVERITY_WEIGHTS = {
    "LOW": 1.0,
    "MEDIUM": 2.5,
    "HIGH": 5.0,
    "CRITICAL": 10.0,
}

DEFAULT_ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


# ---------------------------------------------------------------------------
# Keyword-boost layer:  fast domain scan applied AFTER the ML model runs
# ---------------------------------------------------------------------------
_STRONG_ANOMALY_KW = [
    "exception", "error", "fatal", "fail", "failed", "failure",
    "terminating", "terminated",
    "outofmemory", "outofmemoryerror", "oom",
    "ioexception", "nullpointerexception", "illegalstateexception",
    "refused", "rejected", "abort", "aborted",
    "corrupt", "corrupted",
    "unreachable", "broken",
    "shutdown", "killed", "panic", "crash",
    "writeblock",
]

_CRITICAL_KW = [
    "fatal", "outofmemory", "outofmemoryerror", "oom",
    "panic", "crash", "killed", "shutdown",
    "terminating", "terminated",
]

# Warning keywords: mild concern, maps to MEDIUM risk
_WARNING_KW = [
    "timeout", "timed", "slow", "delay", "delayed",
    "retry", "retrying", "retries",
    "missing", "lost", "disconnect", "disconnected",
    "warn", "warning", "deprecated",
    "degraded", "congestion", "backlog",
    "invalidset", "invalid",
]

_NORMAL_KW = [
    "receiving", "received", "served", "replicated",
    "addstoredblock", "allocateblock", "addblock",
    "starting", "started", "completed", "succeeded",
    "verified", "transmitted", "transferred",
    "updating", "updated",
]


def _keyword_boost(raw_probability: float, text: str) -> float:
    """
    Adjust the ML model's raw anomaly probability using a tiered keyword system.

    Three tiers (checked in order of severity):
      1. Critical keywords  → floor ≥ 0.75 (maps to CRITICAL)
      2. Strong anomaly kw  → floor ≥ 0.55 (maps to HIGH)
      3. Warning keywords   → floor ≥ 0.35 (maps to MEDIUM)

    Normal-only keywords (no anomaly/warning) strongly dampen the probability.
    """
    lower_text = text.lower()

    strong_hits = [kw for kw in _STRONG_ANOMALY_KW if kw in lower_text]
    critical_hits = [kw for kw in _CRITICAL_KW if kw in lower_text]
    warning_hits = [kw for kw in _WARNING_KW if kw in lower_text]
    normal_hits = [kw for kw in _NORMAL_KW if kw in lower_text]

    p = raw_probability

    if strong_hits or critical_hits:
        # Tier 1 & 2: Strong anomaly / critical keywords
        floor = 0.55  # base floor → HIGH

        if len(strong_hits) >= 2:
            floor = max(floor, 0.65)
        if len(strong_hits) >= 3:
            floor = max(floor, 0.72)

        # Critical keywords set CRITICAL-level floor
        if critical_hits:
            floor = max(floor, 0.75 + 0.03 * (len(critical_hits) - 1))

        p = max(p, floor)

    elif warning_hits and not normal_hits:
        # Tier 3: Warning keywords only → MEDIUM floor
        floor = 0.35
        if len(warning_hits) >= 2:
            floor = max(floor, 0.42)
        p = max(p, floor)

    elif normal_hits and not strong_hits and not warning_hits:
        # Only normal keywords → strong dampening
        dampening_factor = 0.85
        p = p * (1.0 - dampening_factor)

    return float(np.clip(p, 0.0, 1.0))


class RiskPredictor:
    """
    Load trained artifacts and perform probability-based risk prediction
    with keyword-boost refinement.
    """

    def __init__(
        self,
        artifacts_dir: Path | str | None = None,
        thresholds: dict | None = None,
    ):
        self.artifacts_dir = Path(artifacts_dir or DEFAULT_ARTIFACTS_DIR)
        self.thresholds = thresholds or DEFAULT_THRESHOLDS.copy()
        self.model = None
        self.feature_extractor = None
        self.metadata = None
        self._feature_names = None
        self._feature_importances = None

    def load(self) -> bool:
        model_path = self.artifacts_dir / "model.joblib"
        vectorizer_path = self.artifacts_dir / "tfidf_vectorizer.joblib"
        metadata_path = self.artifacts_dir / "model_metadata.json"

        if not model_path.exists():
            print(f"Model not found at: {model_path}")
            return False
        if not vectorizer_path.exists():
            print(f"Vectorizer not found at: {vectorizer_path}")
            return False

        self.model = joblib.load(model_path)
        self.feature_extractor = FeatureExtractor.load(vectorizer_path)
        self._feature_names = self.feature_extractor.get_feature_names()

        if hasattr(self.model, "feature_importances_"):
            self._feature_importances = self.model.feature_importances_
        else:
            self._feature_importances = None

        if metadata_path.exists():
            self.metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            if "risk_thresholds" in self.metadata:
                self.thresholds = self.metadata["risk_thresholds"]
        else:
            self.metadata = {"model_name": "unknown"}

        print(f"Model loaded: {self.metadata.get('model_name', 'unknown')}")
        return True

    def predict(self, log_input) -> dict:
        if self.model is None or self.feature_extractor is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        prepared_text, input_mode = self._prepare_inference_text(log_input)
        if not prepared_text.strip():
            raise ValueError("Empty log payload")

        features = self.feature_extractor.transform([prepared_text])

        # Raw ML probability
        probabilities = self.model.predict_proba(features)[0]
        raw_anomaly_prob = float(probabilities[1])
        raw_normal_prob = float(probabilities[0])

        # Apply keyword-boost layer
        boosted_anomaly_prob = _keyword_boost(raw_anomaly_prob, prepared_text)
        boosted_normal_prob = 1.0 - boosted_anomaly_prob

        # Determine risk level from boosted probability
        risk_level = self._probability_to_risk_level(boosted_anomaly_prob)
        risk_probabilities = self._compute_risk_probabilities(boosted_anomaly_prob)
        risk_score = self._compute_risk_score(risk_probabilities)
        top_features = self._get_top_features(features, top_n=5)

        decision_threshold = float(self.metadata.get("binary_decision_threshold", 0.5))
        binary_prediction = (
            "Anomaly" if boosted_anomaly_prob >= decision_threshold else "Normal"
        )

        return {
            "risk_level": risk_level,
            "confidence": round(max(risk_probabilities.values()), 4),
            "risk_score": round(risk_score, 1),
            "probabilities": {
                key: round(value, 4) for key, value in risk_probabilities.items()
            },
            "anomaly_probability": round(boosted_anomaly_prob, 4),
            "normal_probability": round(boosted_normal_prob, 4),
            "raw_ml_anomaly_probability": round(raw_anomaly_prob, 4),
            "binary_prediction": binary_prediction,
            "binary_decision_threshold": round(decision_threshold, 4),
            "top_features": top_features,
            "model_name": self.metadata.get("model_name", "unknown"),
            "label_granularity": self.metadata.get("label_granularity", "block_level"),
            "input_mode": input_mode,
            "method": "ml",
        }

    def _prepare_inference_text(self, log_input) -> tuple[str, str]:
        if isinstance(log_input, str):
            return log_input, "raw_text"

        if isinstance(log_input, dict):
            if isinstance(log_input.get("messages"), list):
                fragments = [self._prepare_inference_text(item)[0] for item in log_input["messages"]]
                return " ".join(fragment for fragment in fragments if fragment).strip(), "message_batch"

            message = log_input.get("message") or log_input.get("content") or ""
            template = log_input.get("template")
            event_id = log_input.get("event_id")
            component = log_input.get("component")
            level = log_input.get("level")

            if any(value is not None for value in (template, event_id, component, level)):
                return (
                    compose_log_document(
                        content=message,
                        template=template,
                        event_id=event_id,
                        component=component,
                        level=level,
                    ),
                    "structured_log",
                )

            return str(message), "raw_text"

        if isinstance(log_input, (list, tuple)):
            fragments = [self._prepare_inference_text(item)[0] for item in log_input]
            return " ".join(fragment for fragment in fragments if fragment).strip(), "message_batch"

        return str(log_input), "raw_text"

    def _probability_to_risk_level(self, anomaly_probability: float) -> str:
        if anomaly_probability < self.thresholds["LOW"]:
            return "LOW"
        if anomaly_probability < self.thresholds["MEDIUM"]:
            return "MEDIUM"
        if anomaly_probability < self.thresholds["HIGH"]:
            return "HIGH"
        return "CRITICAL"

    def _compute_risk_probabilities(self, anomaly_probability: float) -> dict:
        """Softmax-style risk probability distribution centered on the predicted level."""
        low_boundary = self.thresholds["LOW"]
        medium_boundary = self.thresholds["MEDIUM"]
        high_boundary = self.thresholds["HIGH"]

        centers = {
            "LOW": low_boundary / 2.0,
            "MEDIUM": (low_boundary + medium_boundary) / 2.0,
            "HIGH": (medium_boundary + high_boundary) / 2.0,
            "CRITICAL": (high_boundary + 1.0) / 2.0,
        }

        # Use exponential decay (softmax-like) for sharper distributions
        temperature = 0.08
        raw_scores = {}
        for level, center in centers.items():
            distance = abs(anomaly_probability - center)
            raw_scores[level] = np.exp(-distance / temperature)

        predicted_level = self._probability_to_risk_level(anomaly_probability)
        raw_scores[predicted_level] *= 1.5

        total = sum(raw_scores.values())
        return {level: raw_scores[level] / total for level in raw_scores}

    def _compute_risk_score(self, risk_probabilities: dict) -> float:
        weighted_sum = sum(
            risk_probabilities.get(level, 0.0) * weight
            for level, weight in SEVERITY_WEIGHTS.items()
        )
        return min(100.0, (weighted_sum / max(SEVERITY_WEIGHTS.values())) * 100.0)

    def _get_top_features(self, features, top_n: int = 5) -> list[dict]:
        if self._feature_importances is None or self._feature_names is None:
            return []

        feature_values = features.toarray().ravel()

        # Handle dimension mismatch (handcrafted features added after model training)
        n_importances = len(self._feature_importances)
        n_values = len(feature_values)
        if n_values > n_importances:
            # Pad importances with zeros for the new handcrafted features
            padded_importances = np.zeros(n_values)
            padded_importances[:n_importances] = self._feature_importances
            importances = padded_importances
        else:
            importances = self._feature_importances[:n_values]

        contributions = feature_values * importances
        top_indices = np.argsort(contributions)[::-1][:top_n]

        results = []
        for index in top_indices:
            contribution = float(contributions[index])
            if contribution <= 0:
                continue
            feature_name = self._feature_names[index] if index < len(self._feature_names) else f"feature_{index}"
            results.append(
                {
                    "feature": feature_name,
                    "contribution": round(contribution, 6),
                }
            )
        return results

    def get_model_info(self) -> dict:
        if self.metadata is None:
            return {"status": "not_loaded"}

        return {
            "model_name": self.metadata.get("model_name", "unknown"),
            "dataset": self.metadata.get("dataset", "HDFS"),
            "label_granularity": self.metadata.get("label_granularity", "block_level"),
            "accuracy": self.metadata.get("accuracy"),
            "precision": self.metadata.get("precision"),
            "recall": self.metadata.get("recall"),
            "f1_score": self.metadata.get("f1_score"),
            "balanced_accuracy": self.metadata.get("balanced_accuracy"),
            "average_precision": self.metadata.get("average_precision"),
            "roc_auc": self.metadata.get("roc_auc"),
            "binary_decision_threshold": self.metadata.get("binary_decision_threshold"),
            "classes": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            "binary_classes": ["Normal", "Anomaly"],
            "training_samples": self.metadata.get("training_samples"),
            "validation_samples": self.metadata.get("validation_samples"),
            "test_samples": self.metadata.get("test_samples"),
            "feature_count": self.metadata.get("feature_count"),
            "risk_thresholds": self.thresholds,
        }


if __name__ == "__main__":
    predictor = RiskPredictor()
    if predictor.load():
        examples = [
            "Receiving block blk_123 src: /10.0.0.1 dest: /10.0.0.2",
            {
                "message": "PacketResponder for block blk_456 terminating",
                "event_id": "E7",
                "component": "dfs.DataNode$PacketResponder",
                "level": "WARN",
            },
            "Exception in thread main java.lang.OutOfMemoryError: Java heap space",
        ]
        for example in examples:
            result = predictor.predict(example)
            print(f"  {result['risk_level']:>8}  anomaly={result['anomaly_probability']:.4f}  raw_ml={result['raw_ml_anomaly_probability']:.4f}")
    else:
        print("Run train.py first to generate artifacts.")
