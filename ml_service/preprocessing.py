"""
Log preprocessing helpers for the ALARS ML pipeline.

The HDFS benchmark is highly structured. These helpers preserve informative
tokens such as event IDs and component names while normalizing noisy values
like IPs, paths, block IDs, and timestamps.

After normalization, domain-specific signal tokens (sig_anomaly_*, sig_normal_*)
are injected so TF-IDF and the model can discriminate even from short single-line
inputs.
"""

from __future__ import annotations

import re


_IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b")
_PATH_PATTERN = re.compile(r"\b/[a-zA-Z0-9_./-]+\b")
_BLOCK_ID_PATTERN = re.compile(r"\bblk_-?\d+\b", re.IGNORECASE)
_HEX_PATTERN = re.compile(r"\b0x[0-9a-fA-F]+\b")
_TIMESTAMP_PATTERN = re.compile(
    r"\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[,.]\d+)?\b"
)
_UUID_PATTERN = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-"
    r"[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b"
)
_NUMBER_PATTERN = re.compile(r"\b\d+\b")
_NON_TOKEN_PATTERN = re.compile(r"[^a-z0-9_\s]")
_MULTI_SPACE_PATTERN = re.compile(r"\s+")

# ---------------------------------------------------------------------------
# Domain keyword lists for signal injection
# ---------------------------------------------------------------------------
_ANOMALY_KEYWORDS = [
    "exception", "error", "fail", "failed", "failure", "fatal",
    "terminating", "terminated", "timeout", "timed",
    "outofmemoryerror", "outofmemory", "oom",
    "stackoverflowerror", "stackoverflow",
    "ioexception", "nullpointerexception", "illegalstateexception",
    "refused", "rejected", "abort", "aborted",
    "corrupt", "corrupted", "missing", "lost",
    "unreachable", "disconnect", "broken",
    "shutdown", "killed", "panic", "crash",
    "writeblock",
]

_NORMAL_KEYWORDS = [
    "receiving", "received", "served", "replicated",
    "addstoredblock", "allocateblock", "addblock",
    "starting", "started", "completed", "succeeded",
    "verified", "transmitted", "transferred",
    "updating", "updated",
]


def _inject_signal_tokens(cleaned_text: str) -> str:
    """
    Scan cleaned (lowered) text for domain keywords and append explicit
    signal tokens.  These give TF-IDF a strong categorical signal even
    from a single short log line.
    """
    tokens_to_add: list[str] = []
    anomaly_hit_count = 0
    normal_hit_count = 0

    for kw in _ANOMALY_KEYWORDS:
        if kw in cleaned_text:
            tokens_to_add.append(f"sig_anomaly_{kw}")
            anomaly_hit_count += 1

    for kw in _NORMAL_KEYWORDS:
        if kw in cleaned_text:
            tokens_to_add.append(f"sig_normal_{kw}")
            normal_hit_count += 1

    # Inject a summary token that counts the number of anomaly/normal hits
    if anomaly_hit_count > 0:
        tokens_to_add.append("sig_has_anomaly_keyword")
    if anomaly_hit_count >= 2:
        tokens_to_add.append("sig_multi_anomaly_keyword")
    if normal_hit_count > 0:
        tokens_to_add.append("sig_has_normal_keyword")

    if tokens_to_add:
        return cleaned_text + " " + " ".join(tokens_to_add)
    return cleaned_text


def normalize_tag(value: str | None, prefix: str) -> str:
    """
    Convert a structured field into a stable token.

    Example:
        normalize_tag("dfs.DataNode$PacketResponder", "component")
        -> "component_dfs_datanode_packetresponder"
    """
    if value is None:
        return f"{prefix}_unknown"

    token = str(value).strip().lower()
    token = re.sub(r"[^a-z0-9]+", "_", token).strip("_")
    return f"{prefix}_{token}" if token else f"{prefix}_unknown"


def compose_log_document(
    content: str | None,
    template: str | None = None,
    event_id: str | None = None,
    component: str | None = None,
    level: str | None = None,
) -> str:
    """
    Build a structured training or inference document from log fields.
    """
    parts: list[str] = []

    if level:
        parts.append(normalize_tag(level, "level"))
    if component:
        parts.append(normalize_tag(component, "component"))
    if event_id:
        parts.append(normalize_tag(event_id, "event"))
    if template:
        parts.append(f"template {template}")
    if content:
        parts.append(f"content {content}")

    return " ".join(parts).strip()


class LogPreprocessor:
    """
    Normalize raw log text while preserving structured helper tokens.
    After lowering and stripping noisy patterns, inject domain-specific
    signal tokens for anomaly/normal keyword detection.
    """

    def __init__(self):
        self._rules = [
            (_IP_PATTERN, " ip_addr "),
            (_PATH_PATTERN, " path_token "),
            (_BLOCK_ID_PATTERN, " block_id "),
            (_HEX_PATTERN, " hex_token "),
            (_TIMESTAMP_PATTERN, " timestamp_token "),
            (_UUID_PATTERN, " uuid_token "),
            (_NUMBER_PATTERN, " num_token "),
            (_NON_TOKEN_PATTERN, " "),
            (_MULTI_SPACE_PATTERN, " "),
        ]

    def clean(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        cleaned = text.lower()
        for pattern, replacement in self._rules:
            cleaned = pattern.sub(replacement, cleaned)
        cleaned = cleaned.strip()
        # Inject domain signal tokens
        cleaned = _inject_signal_tokens(cleaned)
        return cleaned

    def clean_batch(self, texts: list[str]) -> list[str]:
        return [self.clean(text) for text in texts]


_default_preprocessor = LogPreprocessor()


def clean_log(text: str) -> str:
    return _default_preprocessor.clean(text)


def clean_logs(texts: list[str]) -> list[str]:
    return _default_preprocessor.clean_batch(texts)


if __name__ == "__main__":
    examples = [
        compose_log_document(
            content=(
                "Receiving block blk_-1608999687919862906 "
                "src: /10.250.19.102:54106 dest: /10.250.19.102:50010"
            ),
            template="Receiving block <*> src: /<*> dest: /<*>",
            event_id="E5",
            component="dfs.DataNode$DataXceiver",
            level="INFO",
        ),
        compose_log_document(
            content="WARN PacketResponder 1 for block blk_8229193803249955061 terminating",
            event_id="E7",
            component="dfs.DataNode$PacketResponder",
            level="WARN",
        ),
        "Exception in thread main java.lang.OutOfMemoryError: Java heap space",
        "writeBlock blk_123 received exception java.io.IOException",
    ]

    print("Preprocessing examples:")
    print("=" * 60)
    for example in examples:
        print("RAW:    ", example[:120])
        print("CLEANED:", clean_log(example)[:160])
        print()
