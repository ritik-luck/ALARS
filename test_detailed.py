import sys
import json
from pathlib import Path
sys.path.append('c:\\Users\\sanus\\OneDrive\\Desktop\\S-LAB\\alars-system\\ml_service')
from predict import RiskPredictor

predictor = RiskPredictor(artifacts_dir='c:\\Users\\sanus\\OneDrive\\Desktop\\S-LAB\\alars-system\\ml_service\\artifacts')
if not predictor.load():
    sys.exit(1)

logs = {
  'normal': 'Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010',
  'anomaly': 'PacketResponder 2 for block blk_-3544583377289625738 terminating',
  'critical': 'Exception in thread \"main\" java.lang.OutOfMemoryError: Java heap space'
}

results = {}
for k, v in logs.items():
    results[k] = predictor.predict(v)

with open('results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
