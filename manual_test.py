import sys
import json
from pathlib import Path

project_root = Path(__file__).parent.resolve()
sys.path.append(str(project_root / 'ml_service'))

from predict import RiskPredictor

def main():
    print("=" * 64)
    print("  ALARS ML Risk Classifier — Comprehensive Test")
    print("=" * 64)

    predictor = RiskPredictor(artifacts_dir=project_root / 'ml_service' / 'artifacts')
    if not predictor.load():
        print("FAILED to load model.")
        return

    print(f"\nRisk Thresholds: {predictor.thresholds}")
    print(f"Binary Threshold: {predictor.metadata.get('binary_decision_threshold')}")

    # ---- Test cases: one log for each expected risk level ----
    test_cases = [
        {
            "label": "LOW RISK — Normal block receive",
            "expected": "LOW",
            "log": "Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010",
        },
        {
            "label": "LOW RISK — Block served",
            "expected": "LOW",
            "log": "10.251.73.220:50010 Served block blk_7128370237687728475 to /10.250.19.102",
        },
        {
            "label": "MEDIUM RISK — Connection timeout (warning keyword)",
            "expected": "MEDIUM",
            "log": "Connection timeout to DataNode 10.250.19.102:50010 after 30000ms",
        },
        {
            "label": "HIGH RISK — writeBlock issue (single anomaly keyword)",
            "expected": "HIGH",
            "log": "writeBlock blk_-1608999687919862906 is being written to 10.250.19.102:50010",
        },
        {
            "label": "CRITICAL RISK — PacketResponder terminating",
            "expected": "CRITICAL",
            "log": "PacketResponder 1 for block blk_38865049064139660 terminating",
        },
        {
            "label": "CRITICAL RISK — OutOfMemoryError",
            "expected": "CRITICAL",
            "log": "Exception in thread main java.lang.OutOfMemoryError: Java heap space",
        },
        {
            "label": "CRITICAL RISK — FATAL initialization failure",
            "expected": "CRITICAL",
            "log": "FATAL dfs.DataNode: Initialization failed for block blk_-3544583377289625738",
        },
    ]

    print(f"\n{'─' * 64}")
    all_pass = True
    results = []

    for tc in test_cases:
        result = predictor.predict(tc["log"])
        risk = result["risk_level"]
        prob = result["anomaly_probability"]
        raw_ml = result["raw_ml_anomaly_probability"]
        passed = "✓" if risk == tc["expected"] else "✗"
        if risk != tc["expected"]:
            all_pass = False

        print(f"\n  {passed} {tc['label']}")
        log_display = tc['log'] if isinstance(tc['log'], str) else tc['log'].get('message', str(tc['log']))
        print(f"    Log:        {str(log_display)[:80]}...")
        print(f"    Expected:   {tc['expected']}")
        print(f"    Got:        {risk}")
        print(f"    Anomaly %:  {prob * 100:.1f}%  (raw ML: {raw_ml * 100:.1f}%)")
        print(f"    Confidence: {result['confidence']:.4f}")

        results.append({
            "label": tc["label"],
            "expected": tc["expected"],
            "predicted": risk,
            "anomaly_prob": prob,
            "raw_ml_prob": raw_ml,
            "pass": risk == tc["expected"],
        })

    print(f"\n{'─' * 64}")
    passed_count = sum(1 for r in results if r["pass"])
    print(f"\n  Results: {passed_count}/{len(results)} tests passed")

    if all_pass:
        print("  ✓ ALL TESTS PASSED — Risk levels are correctly differentiated!")
    else:
        print("  ✗ Some tests failed — see details above")

    # Save results to JSON
    with open("test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n  Full results saved to test_results.json")

if __name__ == "__main__":
    main()
