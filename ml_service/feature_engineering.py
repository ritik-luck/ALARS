"""
TF-IDF + handcrafted feature engineering for the ALARS ML pipeline.

Combines sparse TF-IDF vectors with dense domain-aware features so that
the model has strong discriminating signals even from short single-line
log inputs.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from scipy.sparse import hstack, issparse, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer

from preprocessing import clean_logs


# ---------------------------------------------------------------------------
# Handcrafted feature keywords
# ---------------------------------------------------------------------------
_ANOMALY_KW = [
    "exception", "error", "fail", "failed", "failure", "fatal",
    "terminating", "terminated", "timeout", "timed",
    "outofmemory", "oom", "ioexception", "nullpointerexception",
    "refused", "rejected", "abort", "aborted",
    "corrupt", "corrupted", "missing", "lost",
    "unreachable", "disconnect", "broken",
    "shutdown", "killed", "panic", "crash",
    "writeblock",
]

_NORMAL_KW = [
    "receiving", "received", "served", "replicated",
    "addstoredblock", "allocateblock", "addblock",
    "starting", "started", "completed", "succeeded",
    "verified", "transmitted", "transferred",
    "updating", "updated",
]

_ERROR_LEVELS = ["error", "warn", "fatal", "critical"]


def _extract_handcrafted(texts: list[str]) -> np.ndarray:
    """
    Extract dense handcrafted features from already-cleaned texts.

    Features (per row):
      0  anomaly_keyword_count
      1  normal_keyword_count
      2  text_length (log10 scaled)
      3  word_count  (log10 scaled)
      4  has_error_level  (0/1)
      5  anomaly_normal_ratio  (anomaly_count / (normal_count + 1))
      6  has_sig_anomaly       (0/1)  — from preprocessing signal injection
      7  has_sig_multi_anomaly (0/1)
    """
    n = len(texts)
    features = np.zeros((n, 8), dtype=np.float32)

    for i, text in enumerate(texts):
        lower = text.lower()

        anom_count = sum(1 for kw in _ANOMALY_KW if kw in lower)
        norm_count = sum(1 for kw in _NORMAL_KW if kw in lower)

        features[i, 0] = anom_count
        features[i, 1] = norm_count
        features[i, 2] = np.log1p(len(text))
        features[i, 3] = np.log1p(len(text.split()))
        features[i, 4] = 1.0 if any(lv in lower for lv in _ERROR_LEVELS) else 0.0
        features[i, 5] = anom_count / (norm_count + 1.0)
        features[i, 6] = 1.0 if "sig_has_anomaly_keyword" in lower else 0.0
        features[i, 7] = 1.0 if "sig_multi_anomaly_keyword" in lower else 0.0

    return features


HANDCRAFTED_FEATURE_NAMES = [
    "hc_anomaly_kw_count",
    "hc_normal_kw_count",
    "hc_text_length_log",
    "hc_word_count_log",
    "hc_has_error_level",
    "hc_anomaly_normal_ratio",
    "hc_has_sig_anomaly",
    "hc_has_sig_multi_anomaly",
]


class FeatureExtractor:
    """
    Fit and apply a TF-IDF vectorizer plus handcrafted features for log text.
    """

    def __init__(
        self,
        max_features: int = 10000,
        ngram_range: tuple[int, int] = (1, 2),
        min_df: int = 1,
        max_df: float = 1.0,
        sublinear_tf: bool = True,
    ):
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=ngram_range,
            min_df=min_df,
            max_df=max_df,
            sublinear_tf=sublinear_tf,
            strip_accents="unicode",
            lowercase=False,
            token_pattern=r"(?u)\b[a-z0-9_][a-z0-9_]+\b",
            dtype=np.float32,
        )
        self._config = {
            "max_features": max_features,
            "ngram_range": list(ngram_range),
            "min_df": min_df,
            "max_df": max_df,
            "sublinear_tf": sublinear_tf,
            "token_pattern": self.vectorizer.token_pattern,
        }

    def fit_transform(self, raw_texts: list[str]):
        cleaned = clean_logs(raw_texts)
        tfidf_features = self.vectorizer.fit_transform(cleaned)
        handcrafted = _extract_handcrafted(cleaned)
        combined = hstack([tfidf_features, csr_matrix(handcrafted)], format="csr")
        tfidf_count = tfidf_features.shape[1]
        print(f"  TF-IDF features: {tfidf_count:,}  |  Handcrafted: {handcrafted.shape[1]}  |  Total: {combined.shape[1]:,}")
        return combined

    def transform(self, raw_texts: list[str]):
        cleaned = clean_logs(raw_texts)
        tfidf_features = self.vectorizer.transform(cleaned)
        handcrafted = _extract_handcrafted(cleaned)
        return hstack([tfidf_features, csr_matrix(handcrafted)], format="csr")

    def get_feature_names(self) -> list[str]:
        tfidf_names = list(self.vectorizer.get_feature_names_out())
        return tfidf_names + HANDCRAFTED_FEATURE_NAMES

    def get_config(self) -> dict:
        config = self._config.copy()
        if hasattr(self.vectorizer, "vocabulary_"):
            tfidf_count = int(len(self.vectorizer.get_feature_names_out()))
            config["actual_feature_count"] = tfidf_count + len(HANDCRAFTED_FEATURE_NAMES)
            config["tfidf_feature_count"] = tfidf_count
            config["handcrafted_feature_count"] = len(HANDCRAFTED_FEATURE_NAMES)
        return config

    def save(self, path: Path | str):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.vectorizer, path)
        print(f"  TF-IDF vectorizer saved to: {path}")

    @classmethod
    def load(cls, path: Path | str) -> "FeatureExtractor":
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Vectorizer not found: {path}")

        instance = cls()
        instance.vectorizer = joblib.load(path)

        params = instance.vectorizer.get_params()
        instance._config = {
            "max_features": params.get("max_features"),
            "ngram_range": list(params.get("ngram_range", (1, 1))),
            "min_df": params.get("min_df"),
            "max_df": params.get("max_df"),
            "sublinear_tf": params.get("sublinear_tf"),
            "token_pattern": params.get("token_pattern"),
        }
        return instance
