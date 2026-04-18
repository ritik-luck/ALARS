"""
Model evaluation helpers for the ALARS ML pipeline.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)


def find_best_binary_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    """
    Choose the probability threshold that maximizes validation F1.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)
    if thresholds.size == 0:
        return 0.5

    precision = precision[:-1]
    recall = recall[:-1]
    f1_scores = (2.0 * precision * recall) / np.clip(precision + recall, 1e-12, None)
    best_index = int(np.nanargmax(f1_scores))
    return float(np.clip(thresholds[best_index], 0.05, 0.95))


def derive_risk_thresholds(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    binary_threshold: float,
) -> dict:
    """
    Derive LOW/MEDIUM/HIGH boundaries from validation probabilities.

    LOW boundary:
        75th percentile of normal-class probabilities (tighter than before)
    MEDIUM boundary:
        best binary decision threshold (capped lower for reachability)
    HIGH boundary:
        50th percentile of anomaly-class probabilities
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    normal_probs = y_prob[y_true == 0]
    anomaly_probs = y_prob[y_true == 1]

    low_boundary = (
        float(np.quantile(normal_probs, 0.75)) if normal_probs.size else 0.20
    )
    high_boundary = (
        float(np.quantile(anomaly_probs, 0.50)) if anomaly_probs.size else 0.75
    )

    # Tighter clipping so all four risk levels are reachable
    # Enforce minimum 0.15 gap between MEDIUM and HIGH for a usable HIGH band
    low_boundary = float(np.clip(low_boundary, 0.05, 0.30))
    medium_boundary = float(np.clip(binary_threshold, low_boundary + 0.05, 0.50))
    min_high = medium_boundary + 0.15  # at least 0.15 above MEDIUM
    high_boundary = float(
        np.clip(max(high_boundary, min_high), max(min_high, 0.70), 0.85)
    )

    return {
        "LOW": round(low_boundary, 4),
        "MEDIUM": round(medium_boundary, 4),
        "HIGH": round(high_boundary, 4),
    }


def evaluate_binary(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
) -> dict:
    """
    Evaluate binary Normal vs Anomaly performance from probabilities.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    y_pred = (y_prob >= threshold).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "average_precision": float(average_precision_score(y_true, y_prob)),
        "decision_threshold": float(threshold),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "classification_report": classification_report(
            y_true,
            y_pred,
            target_names=["Normal", "Anomaly"],
            output_dict=True,
            zero_division=0,
        ),
        "predicted_positive_rate": float(np.mean(y_pred)),
    }

    try:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_prob))
    except ValueError:
        metrics["roc_auc"] = None

    return metrics


def evaluate_risk_levels(
    y_prob: np.ndarray,
    y_true_binary: np.ndarray,
    thresholds: dict,
) -> dict:
    """
    Evaluate how anomaly probabilities map into four operational risk levels.
    """
    risk_levels = _map_probabilities_to_risk(y_prob, thresholds)
    risk_array = np.asarray(risk_levels)

    distribution = {
        level: int(np.sum(risk_array == level))
        for level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    }

    by_label = {}
    for label_value, label_name in ((0, "Normal"), (1, "Anomaly")):
        label_mask = y_true_binary == label_value
        by_label[label_name] = {
            level: int(np.sum(label_mask & (risk_array == level)))
            for level in distribution
        }

    anomaly_mask = y_true_binary == 1
    normal_mask = y_true_binary == 0
    high_critical_mask = np.isin(risk_array, ["HIGH", "CRITICAL"])
    critical_mask = risk_array == "CRITICAL"

    anomaly_detection_rate = (
        float(np.sum(anomaly_mask & high_critical_mask) / anomaly_mask.sum())
        if anomaly_mask.sum()
        else 0.0
    )
    critical_capture_rate = (
        float(np.sum(anomaly_mask & critical_mask) / anomaly_mask.sum())
        if anomaly_mask.sum()
        else 0.0
    )
    false_alarm_rate = (
        float(np.sum(normal_mask & high_critical_mask) / normal_mask.sum())
        if normal_mask.sum()
        else 0.0
    )

    return {
        "risk_distribution": distribution,
        "by_true_label": by_label,
        "thresholds": thresholds,
        "anomaly_detection_as_high_critical": round(anomaly_detection_rate, 4),
        "anomaly_detection_as_critical": round(critical_capture_rate, 4),
        "normal_false_alarm_as_high_critical": round(false_alarm_rate, 4),
    }


def _map_probabilities_to_risk(probabilities: np.ndarray, thresholds: dict) -> list[str]:
    risk_levels = []
    for probability in probabilities:
        if probability < thresholds["LOW"]:
            risk_levels.append("LOW")
        elif probability < thresholds["MEDIUM"]:
            risk_levels.append("MEDIUM")
        elif probability < thresholds["HIGH"]:
            risk_levels.append("HIGH")
        else:
            risk_levels.append("CRITICAL")
    return risk_levels


def print_evaluation_summary(model_name: str, binary_metrics: dict, risk_metrics: dict):
    """
    Print a compact evaluation summary.
    """
    print(f"\n{'=' * 64}")
    print(f"  {model_name}")
    print(f"{'=' * 64}")
    print("  Binary metrics:")
    print(f"    Accuracy:           {binary_metrics['accuracy']:.4f}")
    print(f"    Precision:          {binary_metrics['precision']:.4f}")
    print(f"    Recall:             {binary_metrics['recall']:.4f}")
    print(f"    F1:                 {binary_metrics['f1_score']:.4f}")
    print(f"    Balanced accuracy:  {binary_metrics['balanced_accuracy']:.4f}")
    print(f"    Average precision:  {binary_metrics['average_precision']:.4f}")
    print(f"    Decision threshold: {binary_metrics['decision_threshold']:.4f}")

    roc_auc = binary_metrics.get("roc_auc")
    if roc_auc is not None:
        print(f"    ROC-AUC:            {roc_auc:.4f}")

    confusion = binary_metrics["confusion_matrix"]
    print("  Confusion matrix:")
    print("                    Pred Normal   Pred Anomaly")
    print(f"    Actual Normal      {confusion[0][0]:>6}        {confusion[0][1]:>6}")
    print(f"    Actual Anomaly     {confusion[1][0]:>6}        {confusion[1][1]:>6}")

    print("  Risk mapping:")
    for level, count in risk_metrics["risk_distribution"].items():
        print(f"    {level:>8}: {count}")
    print(
        "    Anomaly as HIGH/CRITICAL: "
        f"{risk_metrics['anomaly_detection_as_high_critical'] * 100:.1f}%"
    )
    print(
        "    Anomaly as CRITICAL:      "
        f"{risk_metrics['anomaly_detection_as_critical'] * 100:.1f}%"
    )
    print(
        "    Normal false HIGH/CRIT:   "
        f"{risk_metrics['normal_false_alarm_as_high_critical'] * 100:.1f}%"
    )


def save_evaluation_report(report: dict, path: Path | str):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"  Evaluation report saved to: {path}")
