# Data Flow & Timing Architecture

This document describes the exact temporal and data flow lifecycle mapping for the Dual System layout.

## Live Trading Flow (00:00 - 02:59)
- **Every 60 Seconds**: `02_enhanced_data_collector.py` fetches the latest 1M klines and saves them to `data/raw/latest_1m.csv`.
- **Every 5 Minutes**: The Orchestrator runs the micro-trader inference. It reads that live 1M layout, generates low-latency predictions (< 100ms), and outputs signal arrays.
- **Hourly**: Depending on the sync intervals, the Unified Manager refreshes the internal CSV structures up to the current daily marker.

## Nightly Retraining Flow (03:00 - 03:59)
1. **03:00:00** - Orchestrator pauses live actions and invokes `nightly_update()`
2. **03:00:05** - `03_unified_data_manager.py` fires an aggregation sweep. It takes all recent 1M instances and produces daily candles in `btc_unified_data.csv`.
3. **03:00:15** - Orchestrator fires `03_train_micro_model.py`. The micro model retrains using standard historical minute data. (Takes ~5 mins).
4. **03:06:00** - Orchestrator drops into `multi_task_transformer.py` training. The complex transformer model fits to the newly daily-updated `btc_unified_data.csv`. (Takes ~20-30 mins).
5. **03:30:00 ~ 03:45:00** - Training concludes.
6. Execution naturally yields back to the standard sub-process live loops seamlessly. Models pick up the newly generated `best_*_model.pth` files.

## Data Schema Summary
| Dataset | Owner | Interval | Latency Class | Purpose |
|---------|-------|----------|---------------|---------|
| `latest_1m.csv` | Collector | 1 Minute | RT (seconds) | Raw ingestion |
| `btc_live_updated.csv` | Manager | 1 Minute | Fast (< 1m) | Micro Trader signals |
| `btc_unified_data.csv` | Manager | Daily | Daily | Multi-Task Transformer |
