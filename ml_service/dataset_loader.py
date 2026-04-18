"""
HDFS dataset loader for the ALARS ML pipeline.

The HDFS labels are block-level. Each training sample represents one block ID,
created by aggregating all matching log lines from the structured 100k log
sample and joining them with the benchmark ground-truth label.
"""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

from preprocessing import compose_log_document, normalize_tag


BLOCK_ID_PATTERN = re.compile(r"(blk_-?\d+)")
COUNT_BUCKETS = (1, 3, 5, 10, 20, 50, 100)

DEFAULT_STRUCTURED_LOG_PATH = (
    Path(__file__).resolve().parent.parent
    / "ml_standard_hdfs_experiment"
    / "data"
    / "raw"
    / "HDFS_100k.log_structured.csv"
)

DEFAULT_ANOMALY_LABEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "ml_standard_hdfs_experiment"
    / "data"
    / "raw"
    / "HDFS.anomaly_label.csv"
)


def load_hdfs_dataset(
    structured_log_path: str | Path | None = None,
    anomaly_label_path: str | Path | None = None,
) -> pd.DataFrame:
    """
    Load the HDFS block-level benchmark dataset.

    Returns a DataFrame with:
        - block_id
        - text
        - label (0 = Normal, 1 = Anomaly)
        - line_count
        - unique_event_count
        - unique_component_count
    """
    log_path = Path(structured_log_path or DEFAULT_STRUCTURED_LOG_PATH)
    label_path = Path(anomaly_label_path or DEFAULT_ANOMALY_LABEL_PATH)

    if not log_path.exists():
        raise FileNotFoundError(f"Structured log file not found: {log_path}")
    if not label_path.exists():
        raise FileNotFoundError(f"Anomaly label file not found: {label_path}")

    print(f"Loading structured logs from: {log_path}")
    logs_df = pd.read_csv(log_path).fillna("")

    required_columns = {"Content", "EventTemplate", "EventId", "Component", "Level"}
    missing = required_columns - set(logs_df.columns)
    if missing:
        raise ValueError(f"Structured log CSV is missing columns: {sorted(missing)}")

    print(f"  Structured log lines: {len(logs_df):,}")

    print(f"Loading anomaly labels from: {label_path}")
    labels_df = pd.read_csv(label_path)
    if "BlockId" not in labels_df.columns or "Label" not in labels_df.columns:
        raise ValueError("Anomaly label CSV must contain BlockId and Label columns.")

    labels_df["block_id"] = labels_df["BlockId"].astype(str)
    labels_df["label"] = labels_df["Label"].apply(
        lambda value: 1 if str(value).strip().lower() == "anomaly" else 0
    )
    labels_by_block = dict(zip(labels_df["block_id"], labels_df["label"]))

    raw_normal_count = int((labels_df["label"] == 0).sum())
    raw_anomaly_count = int((labels_df["label"] == 1).sum())
    print(f"  Raw labeled blocks: {len(labels_df):,}")
    print(f"    Normal:  {raw_normal_count:,}")
    print(f"    Anomaly: {raw_anomaly_count:,}")

    print("Aggregating structured rows into block-level documents...")

    block_records: dict[str, dict[str, list[str] | int]] = defaultdict(
        lambda: {
            "documents": [],
            "event_tokens": [],
            "component_tokens": [],
            "level_tokens": [],
            "line_count": 0,
        }
    )

    dropped_without_block_id = 0
    for row in logs_df.itertuples(index=False):
        block_ids = _extract_block_ids(str(row.Content))
        if not block_ids:
            dropped_without_block_id += 1
            continue

        document = compose_log_document(
            content=str(row.Content),
            template=str(row.EventTemplate),
            event_id=str(row.EventId),
            component=str(row.Component),
            level=str(row.Level),
        )

        event_token = normalize_tag(str(row.EventId), "event")
        component_token = normalize_tag(str(row.Component), "component")
        level_token = normalize_tag(str(row.Level), "level")

        for block_id in block_ids:
            block = block_records[block_id]
            block["documents"].append(document)
            block["event_tokens"].append(event_token)
            block["component_tokens"].append(component_token)
            block["level_tokens"].append(level_token)
            block["line_count"] += 1

    if dropped_without_block_id:
        print(f"  Dropped lines without block IDs: {dropped_without_block_id:,}")

    rows = []
    for block_id, block in block_records.items():
        label = labels_by_block.get(block_id)
        if label is None:
            continue

        event_tokens = list(block["event_tokens"])
        component_tokens = list(block["component_tokens"])
        level_tokens = list(block["level_tokens"])
        line_count = int(block["line_count"])

        unique_event_count = len(set(event_tokens))
        unique_component_count = len(set(component_tokens))

        summary_tokens = [
            _bucket_token("line_count", line_count),
            _bucket_token("unique_events", unique_event_count),
            _bucket_token("unique_components", unique_component_count),
            _bucket_token("event_tokens", len(event_tokens)),
        ]

        text_parts = [
            " ".join(block["documents"]),
            "event_sequence " + " ".join(event_tokens),
            "component_sequence " + " ".join(component_tokens),
            "level_sequence " + " ".join(level_tokens),
            " ".join(summary_tokens),
        ]

        rows.append(
            {
                "block_id": block_id,
                "text": " ".join(part for part in text_parts if part).strip(),
                "label": int(label),
                "line_count": line_count,
                "unique_event_count": unique_event_count,
                "unique_component_count": unique_component_count,
            }
        )

    dataset = pd.DataFrame(rows).sort_values("block_id").reset_index(drop=True)

    normal_count = int((dataset["label"] == 0).sum())
    anomaly_count = int((dataset["label"] == 1).sum())

    source_stats = {
        "label_granularity": "block_level",
        "structured_log_lines": int(len(logs_df)),
        "structured_unique_blocks": int(dataset["block_id"].nunique()),
        "dropped_lines_without_block_id": int(dropped_without_block_id),
        "raw_label_count": int(len(labels_df)),
        "raw_normal_count": raw_normal_count,
        "raw_anomaly_count": raw_anomaly_count,
        "matched_blocks": int(len(dataset)),
        "matched_normal_count": normal_count,
        "matched_anomaly_count": anomaly_count,
        "unmatched_labeled_blocks": int(len(labels_df) - len(dataset)),
        "document_fields": [
            "Content",
            "EventTemplate",
            "EventId",
            "Component",
            "Level",
        ],
    }
    dataset.attrs["source_stats"] = source_stats

    print("\nFinal block-level dataset:")
    print(f"  Samples:  {len(dataset):,}")
    print(f"  Normal:   {normal_count:,} ({normal_count / len(dataset) * 100:.1f}%)")
    print(f"  Anomaly:  {anomaly_count:,} ({anomaly_count / len(dataset) * 100:.1f}%)")
    print(f"  Blocks:   {dataset['block_id'].nunique():,}")

    return dataset


def _extract_block_ids(content: str) -> list[str]:
    """
    Extract all block IDs from a log line while preserving their first-seen order.
    """
    return list(dict.fromkeys(BLOCK_ID_PATTERN.findall(content)))


def _bucket_token(prefix: str, value: int) -> str:
    for boundary in COUNT_BUCKETS:
        if value <= boundary:
            return f"{prefix}_le_{boundary}"
    return f"{prefix}_gt_{COUNT_BUCKETS[-1]}"


def get_dataset_info(dataset: pd.DataFrame) -> dict:
    """
    Return summary statistics for the prepared dataset.
    """
    info = {
        "total_samples": int(len(dataset)),
        "normal_count": int((dataset["label"] == 0).sum()),
        "anomaly_count": int((dataset["label"] == 1).sum()),
        "unique_blocks": int(dataset["block_id"].nunique()),
        "avg_text_length": int(dataset["text"].str.len().mean()),
        "max_text_length": int(dataset["text"].str.len().max()),
        "min_text_length": int(dataset["text"].str.len().min()),
        "avg_lines_per_block": round(float(dataset["line_count"].mean()), 2),
        "max_lines_per_block": int(dataset["line_count"].max()),
        "avg_unique_events": round(float(dataset["unique_event_count"].mean()), 2),
        "avg_unique_components": round(
            float(dataset["unique_component_count"].mean()), 2
        ),
    }
    info.update(dataset.attrs.get("source_stats", {}))
    return info


if __name__ == "__main__":
    dataframe = load_hdfs_dataset()
    print("\n" + "=" * 60)
    for key, value in get_dataset_info(dataframe).items():
        print(f"{key}: {value}")
