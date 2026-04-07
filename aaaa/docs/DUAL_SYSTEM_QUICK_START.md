# Dual System Quick Start Guide

## Prerequisites
- Python 3.9+
- Activated Virtual Environment
- Installed dependencies: `pip install pandas requests schedule torch`

## 1. Fast Launch
The easiest way to start the system is through the unified launcher:

```bash
cd aaaa/
python 05_launch_dual_system.py
```

## 2. What Happens Next?
1. The script verifies all dependencies and critical files.
2. An initial data sync is invoked (transforming whatever raw data is present to daily + live files).
3. The `04_master_orchestrator.py` takes over execution natively.
4. Two major loops start:
   - Data collection fetches BTC prices every minute.
   - Micro-trader evaluates conditions every ~5 minutes.

## 3. Configuration Customization
All configurations can be found inside `01_system_config.json`.
You can tweak:
- `nightly_update_hour`: The 24-hour HH:MM time when full retraining triggers (default: `"03:00"`).
- `prediction_interval_minutes`: How often the micro trader executes.

## 4. Troubleshooting
**Q: The Master Orchestrator crashed.**  
A: Check `orchestrator.log` in the folder. Processes usually self-restart, but missing library imports will halt the boot sequence.

**Q: Where are the prediction results stored?**  
A: Daily multi-task predictions are handled per the existing `predict_multi_task.py`. Micro-trader operates live and yields results to standard output/logs.

## 5. Important Note
The existing Multi-Task Transformer (`multi_task_transformer.py` / `predict_multi_task.py`) was **kept completely unchanged**. The Orchestrator interacts with it entirely from the outside via standard Python CLI calls.
