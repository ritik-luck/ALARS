import sys
from pathlib import Path

# Add ml_service to path so we can import predict
sys.path.append(str(Path(__file__).parent.resolve() / "ml_service"))

from predict import RiskPredictor

predictor = RiskPredictor(artifacts_dir=str(Path(__file__).parent.resolve() / "ml_service" / "artifacts"))
if not predictor.load():
    print("Could not load model")
    sys.exit(1)

normal_line = "Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010"
warning_line = "Connection timeout to DataNode 10.250.19.102:50010 after 30000ms"
anomaly_line = "writeBlock blk_-1608999687919862906 is being written to 10.250.19.102:50010"
critical_line = "Exception in thread main java.lang.OutOfMemoryError: Java heap space"
critical_line2 = "FATAL dfs.DataNode: Initialization failed for block blk_-3544583377289625738"
critical_line3 = "PacketResponder 1 for block blk_38865049064139660 terminating"

tests = [
    ("Normal Line", normal_line, "LOW"),
    ("Warning Line", warning_line, "MEDIUM"),
    ("Anomaly Line", anomaly_line, "HIGH"),
    ("Critical Line (OOM)", critical_line, "CRITICAL"),
    ("Critical Line (FATAL)", critical_line2, "CRITICAL"),
    ("Critical Line (Terminating)", critical_line3, "CRITICAL"),
]

print("\n=== ALARS Risk Classifier Single-Line Tests ===\n")
for name, log, expected in tests:
    result = predictor.predict(log)
    risk = result['risk_level']
    prob = result['anomaly_probability']
    raw = result['raw_ml_anomaly_probability']
    status = "PASS" if risk == expected else "FAIL"
    print(f"  [{status}] {name}")
    print(f"         Expected: {expected:>8}  |  Got: {risk:>8}  |  Anomaly: {prob*100:5.1f}%  |  Raw ML: {raw*100:5.1f}%")
    print()
