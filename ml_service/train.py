"""
Train the ALARS HDFS anomaly model.

Pipeline:
    1. Load the real HDFS benchmark at block level
    2. Build TF-IDF features from aggregated structured logs
    3. Train XGBoost (primary) and RandomForest (fallback)
    4. Calibrate binary and risk thresholds on a validation split
    5. Refit the selected model on train+validation and evaluate on test
    6. Save artifacts for the Flask inference service
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.utils.class_weight import compute_sample_weight

from dataset_loader import get_dataset_info, load_hdfs_dataset
from evaluate import (
    derive_risk_thresholds,
    evaluate_binary,
    evaluate_risk_levels,
    find_best_binary_threshold,
    print_evaluation_summary,
    save_evaluation_report,
)
from feature_engineering import FeatureExtractor


ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
RANDOM_STATE = 42
TEST_SIZE = 0.20
VALIDATION_SHARE = 0.20
SEARCH_N_JOBS = 1


def build_xgboost_classifier(
    random_state: int,
    scale_pos_weight: float,
    **overrides,
):
    from xgboost import XGBClassifier

    params = {
        "objective": "binary:logistic",
        "eval_metric": "aucpr",
        "tree_method": "hist",
        "scale_pos_weight": scale_pos_weight,
        "random_state": random_state,
        "n_jobs": -1,
        "verbosity": 0,
        "n_estimators": 350,
        "max_depth": 6,
        "learning_rate": 0.08,
        "subsample": 0.9,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,
        "gamma": 0.0,
        "reg_alpha": 0.0,
        "reg_lambda": 1.5,
    }
    params.update(overrides)
    return XGBClassifier(**params)


def build_random_forest_classifier(random_state: int, **overrides):
    params = {
        "class_weight": "balanced_subsample",
        "random_state": random_state,
        "n_jobs": -1,
        "n_estimators": 500,
        "max_depth": None,
        "min_samples_split": 2,
        "min_samples_leaf": 1,
        "max_features": "sqrt",
    }
    params.update(overrides)
    return RandomForestClassifier(**params)


def compute_scale_pos_weight(y_values: np.ndarray) -> float:
    negative = int(np.sum(y_values == 0))
    positive = int(np.sum(y_values == 1))
    return float(negative / max(positive, 1))


def train_xgboost(X_train, y_train, random_state: int, search_iterations: int = 10):
    try:
        from xgboost import XGBClassifier  # noqa: F401
    except ImportError as err:
        raise RuntimeError("xgboost is not installed. Run: pip install xgboost") from err

    scale_pos_weight = compute_scale_pos_weight(y_train)
    estimator = build_xgboost_classifier(
        random_state=random_state,
        scale_pos_weight=scale_pos_weight,
    )

    param_distributions = {
        "n_estimators": [250, 350, 500],
        "max_depth": [3, 4, 6, 8],
        "learning_rate": [0.03, 0.05, 0.08, 0.12],
        "subsample": [0.8, 0.9, 1.0],
        "colsample_bytree": [0.6, 0.8, 1.0],
        "min_child_weight": [1, 3, 5, 7],
        "gamma": [0.0, 0.1, 0.2, 0.4],
        "reg_alpha": [0.0, 0.1, 0.5],
        "reg_lambda": [1.0, 1.5, 2.0, 3.0],
    }

    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=random_state)
    search = RandomizedSearchCV(
        estimator=estimator,
        param_distributions=param_distributions,
        n_iter=search_iterations,
        scoring={
            "average_precision": "average_precision",
            "f1": "f1",
            "roc_auc": "roc_auc",
        },
        refit="average_precision",
        cv=cv,
        random_state=random_state,
        n_jobs=SEARCH_N_JOBS,
        verbose=0,
        return_train_score=False,
    )

    print("\n  Training XGBoost with class imbalance handling")
    print(f"    scale_pos_weight: {scale_pos_weight:.2f}")
    start = time.time()
    search.fit(X_train, y_train)
    elapsed = time.time() - start

    print(f"    Best CV average precision: {search.best_score_:.4f}")
    print(f"    Best params: {search.best_params_}")
    print(f"    Training time: {elapsed:.1f}s")

    return search.best_estimator_, {
        "search_metric": "average_precision",
        "best_cv_score": float(search.best_score_),
        "best_params": {key: _make_serializable(value) for key, value in search.best_params_.items()},
        "scale_pos_weight": round(scale_pos_weight, 4),
        "training_time_seconds": round(elapsed, 1),
    }


def train_random_forest(X_train, y_train, random_state: int, search_iterations: int = 8):
    estimator = build_random_forest_classifier(random_state=random_state)
    param_distributions = {
        "n_estimators": [300, 500, 700],
        "max_depth": [None, 15, 25, 40],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "max_features": ["sqrt", "log2", 0.4, 0.6],
    }

    sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=random_state)
    search = RandomizedSearchCV(
        estimator=estimator,
        param_distributions=param_distributions,
        n_iter=search_iterations,
        scoring={
            "average_precision": "average_precision",
            "f1": "f1",
            "roc_auc": "roc_auc",
        },
        refit="average_precision",
        cv=cv,
        random_state=random_state,
        n_jobs=SEARCH_N_JOBS,
        verbose=0,
        return_train_score=False,
    )

    print("\n  Training RandomForest fallback")
    start = time.time()
    search.fit(X_train, y_train, sample_weight=sample_weights)
    elapsed = time.time() - start

    print(f"    Best CV average precision: {search.best_score_:.4f}")
    print(f"    Best params: {search.best_params_}")
    print(f"    Training time: {elapsed:.1f}s")

    return search.best_estimator_, {
        "search_metric": "average_precision",
        "best_cv_score": float(search.best_score_),
        "best_params": {key: _make_serializable(value) for key, value in search.best_params_.items()},
        "training_time_seconds": round(elapsed, 1),
    }


def fit_final_model(model_name: str, best_params: dict, X_train, y_train, random_state: int):
    if model_name == "xgboost":
        model = build_xgboost_classifier(
            random_state=random_state,
            scale_pos_weight=compute_scale_pos_weight(y_train),
            **best_params,
        )
        model.fit(X_train, y_train)
        return model

    if model_name == "random_forest":
        model = build_random_forest_classifier(random_state=random_state, **best_params)
        sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)
        model.fit(X_train, y_train, sample_weight=sample_weights)
        return model

    raise ValueError(f"Unsupported model name: {model_name}")


def _make_serializable(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def main():
    print("=" * 64)
    print("  ALARS HDFS ML Training")
    print("=" * 64)

    print("\n[1/7] Loading HDFS block-level dataset...")
    dataset = load_hdfs_dataset()
    dataset_info = get_dataset_info(dataset)

    print("\n[2/7] Creating train/validation/test splits...")
    X_texts = dataset["text"].tolist()
    y_labels = dataset["label"].to_numpy()

    X_train_val_texts, X_test_texts, y_train_val, y_test = train_test_split(
        X_texts,
        y_labels,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y_labels,
    )

    X_train_texts, X_val_texts, y_train, y_val = train_test_split(
        X_train_val_texts,
        y_train_val,
        test_size=VALIDATION_SHARE,
        random_state=RANDOM_STATE,
        stratify=y_train_val,
    )

    print(f"  Train samples:      {len(X_train_texts):,}")
    print(f"  Validation samples: {len(X_val_texts):,}")
    print(f"  Test samples:       {len(X_test_texts):,}")
    print(f"  Train anomaly rate:      {np.mean(y_train) * 100:.2f}%")
    print(f"  Validation anomaly rate: {np.mean(y_val) * 100:.2f}%")
    print(f"  Test anomaly rate:       {np.mean(y_test) * 100:.2f}%")

    print("\n[3/7] Fitting TF-IDF on training split...")
    selection_features = FeatureExtractor(
        max_features=10000,
        ngram_range=(1, 2),
        min_df=1,
        max_df=1.0,
        sublinear_tf=True,
    )
    X_train = selection_features.fit_transform(X_train_texts)
    X_val = selection_features.transform(X_val_texts)

    print("\n[4/7] Training candidate models...")
    models = {}
    training_info = {}

    try:
        xgboost_model, xgboost_info = train_xgboost(
            X_train,
            y_train,
            RANDOM_STATE,
            search_iterations=20,
        )
        models["xgboost"] = xgboost_model
        training_info["xgboost"] = xgboost_info
    except RuntimeError as err:
        print(f"  Skipping XGBoost: {err}")

    random_forest_model, random_forest_info = train_random_forest(
        X_train,
        y_train,
        RANDOM_STATE,
        search_iterations=15,
    )
    models["random_forest"] = random_forest_model
    training_info["random_forest"] = random_forest_info

    if not models:
        raise RuntimeError("No trainable models were available.")

    print("\n[5/7] Calibrating thresholds on validation split...")
    selection_results = {}
    for model_name, model in models.items():
        y_val_prob = model.predict_proba(X_val)[:, 1]
        decision_threshold = find_best_binary_threshold(y_val, y_val_prob)
        risk_thresholds = derive_risk_thresholds(y_val, y_val_prob, decision_threshold)

        binary_metrics = evaluate_binary(y_val, y_val_prob, threshold=decision_threshold)
        risk_metrics = evaluate_risk_levels(y_val_prob, y_val, thresholds=risk_thresholds)

        selection_results[model_name] = {
            "validation_binary_metrics": binary_metrics,
            "validation_risk_metrics": risk_metrics,
            "decision_threshold": decision_threshold,
            "risk_thresholds": risk_thresholds,
            "training_info": training_info[model_name],
        }

        print_evaluation_summary(
            f"{model_name} validation",
            binary_metrics,
            risk_metrics,
        )

    best_name = max(
        selection_results,
        key=lambda name: (
            selection_results[name]["validation_binary_metrics"]["f1_score"],
            selection_results[name]["validation_binary_metrics"]["average_precision"],
        ),
    )
    best_selection = selection_results[best_name]

    print("\nSelected model based on validation performance:")
    print(f"  Model: {best_name}")
    print(
        f"  Validation F1: {best_selection['validation_binary_metrics']['f1_score']:.4f}"
    )
    print(
        "  Validation average precision: "
        f"{best_selection['validation_binary_metrics']['average_precision']:.4f}"
    )

    print("\n[6/7] Refitting selected model on train+validation and evaluating on test...")
    final_feature_extractor = FeatureExtractor(
        max_features=10000,
        ngram_range=(1, 2),
        min_df=1,
        max_df=1.0,
        sublinear_tf=True,
    )
    X_train_val = final_feature_extractor.fit_transform(X_train_val_texts)
    X_test = final_feature_extractor.transform(X_test_texts)

    final_model = fit_final_model(
        model_name=best_name,
        best_params=best_selection["training_info"]["best_params"],
        X_train=X_train_val,
        y_train=y_train_val,
        random_state=RANDOM_STATE,
    )

    y_test_prob = final_model.predict_proba(X_test)[:, 1]
    final_binary_metrics = evaluate_binary(
        y_test,
        y_test_prob,
        threshold=best_selection["decision_threshold"],
    )
    final_risk_metrics = evaluate_risk_levels(
        y_test_prob,
        y_test,
        thresholds=best_selection["risk_thresholds"],
    )

    print_evaluation_summary(
        f"{best_name} final test",
        final_binary_metrics,
        final_risk_metrics,
    )

    print("\n[7/7] Saving model artifacts...")
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = ARTIFACTS_DIR / "model.joblib"
    vectorizer_path = ARTIFACTS_DIR / "tfidf_vectorizer.joblib"
    metadata_path = ARTIFACTS_DIR / "model_metadata.json"
    report_path = ARTIFACTS_DIR / "evaluation_report.json"

    joblib.dump(final_model, model_path)
    print(f"  Model saved to: {model_path}")
    final_feature_extractor.save(vectorizer_path)

    metadata = {
        "model_name": best_name,
        "dataset": "HDFS_100k (LogHub Benchmark)",
        "label_granularity": dataset_info.get("label_granularity", "block_level"),
        "accuracy": final_binary_metrics["accuracy"],
        "precision": final_binary_metrics["precision"],
        "recall": final_binary_metrics["recall"],
        "f1_score": final_binary_metrics["f1_score"],
        "balanced_accuracy": final_binary_metrics["balanced_accuracy"],
        "average_precision": final_binary_metrics["average_precision"],
        "roc_auc": final_binary_metrics.get("roc_auc"),
        "binary_decision_threshold": best_selection["decision_threshold"],
        "risk_thresholds": best_selection["risk_thresholds"],
        "classes": {
            "binary": ["Normal", "Anomaly"],
            "risk_levels": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        },
        "dataset_info": dataset_info,
        "train_samples": len(X_train_texts),
        "validation_samples": len(X_val_texts),
        "training_samples": len(X_train_val_texts),
        "test_samples": len(X_test_texts),
        "feature_count": len(final_feature_extractor.get_feature_names()),
        "feature_config": final_feature_extractor.get_config(),
        "selection_metric": "validation_f1_score",
        "all_models_evaluated": {
            name: {
                "validation_f1_score": results["validation_binary_metrics"]["f1_score"],
                "validation_average_precision": results["validation_binary_metrics"]["average_precision"],
                "validation_accuracy": results["validation_binary_metrics"]["accuracy"],
            }
            for name, results in selection_results.items()
        },
    }
    metadata_path.write_text(
        json.dumps(metadata, indent=2, default=str),
        encoding="utf-8",
    )
    print(f"  Metadata saved to: {metadata_path}")

    evaluation_report = {
        "dataset_info": dataset_info,
        "split_info": {
            "train_samples": len(X_train_texts),
            "validation_samples": len(X_val_texts),
            "test_samples": len(X_test_texts),
            "train_anomaly_rate": round(float(np.mean(y_train)), 6),
            "validation_anomaly_rate": round(float(np.mean(y_val)), 6),
            "test_anomaly_rate": round(float(np.mean(y_test)), 6),
        },
        "model_selection": selection_results,
        "final_test": {
            "model_name": best_name,
            "binary_metrics": final_binary_metrics,
            "risk_level_metrics": final_risk_metrics,
            "decision_threshold": best_selection["decision_threshold"],
            "risk_thresholds": best_selection["risk_thresholds"],
            "training_info": best_selection["training_info"],
        },
    }
    save_evaluation_report(evaluation_report, report_path)

    print("\nTraining complete.")
    print(f"  Selected model: {best_name}")
    print(f"  Test F1:        {final_binary_metrics['f1_score']:.4f}")
    print(f"  Test accuracy:  {final_binary_metrics['accuracy']:.4f}")
    print(f"  Artifacts dir:  {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
