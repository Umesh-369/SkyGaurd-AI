<div align="center">

# 🛡️ SkyGuard AI
### **Next-Gen Autonomous Meteorological Command Center & AWS Sensor Intelligence**

[![SIH Problem Statement](https://img.shields.io/badge/SIH%202026-Problem%20Statement%2026073-0284c7?style=for-the-badge&logo=gov.in)](https://github.com/Umesh-369/SkyGaurd-AI)
[![OpenML Dataset](https://img.shields.io/badge/OpenML-Dataset%2043409%20(Goa%20Historical)-059669?style=for-the-badge&logo=python)](https://www.openml.org/d/43409)
[![Kaggle Dataset](https://img.shields.io/badge/Kaggle-Indian%20Climate%20Dataset%202024--2025-20BEFF?style=for-the-badge&logo=kaggle)](https://www.kaggle.com/datasets/ankushnarwade/indian-climate-dataset-20242025)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?style=for-the-badge&logo=fastapi)](backend/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-61DAFB?style=for-the-badge&logo=react)](frontend/)
[![Edge AI](https://img.shields.io/badge/Edge%20AI-Quantized%20ONNX%20%7C%20ESP32-f59e0b?style=for-the-badge&logo=cpu)](ml/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

**[⚡ System Overview](#-system-overview) • [✨ Core Capabilities](#-core-capabilities) • [🧠 Neural Topology](#-2d-neural-network-topology-graph) • [🏗️ Architecture](#️-system-architecture) • [📊 ML Benchmarks](#-ml-performance--edge-ai-benchmarks) • [📡 API Reference](#-api--websocket-reference) • [🚀 Quick Start](#-quick-start-guide)**

<br/>

</div>

---

## 📌 Executive Summary

Automatic Weather Stations (AWS) deployed in critical meteorological, agricultural, and aerospace corridors frequently suffer from **hardware sensor degradation, zero-variance freeze errors, calibration drift, and transient electrical spikes**. Unfiltered anomalous telemetry contaminates downstream weather forecasting and disaster response models.

**SkyGuard AI** delivers a unified, production-grade 2-Tier AI intelligence architecture:
1. **Tier 1 (Core Isolation)**: Evaluates core physical sensor parameters (**Temperature**, **Atmospheric Pressure**, **Relative Humidity**) in real-time using a multivariate **IsolationForest** trained on **108,096 observations from OpenML Dataset 43409 (Goa)**, supplemented by the **Kaggle Indian Climate Dataset (2024–2025)** as a secondary training source, with zero temporal leakage. Flags faults with instant **SHAP explainability**, triggers **spatio-temporal EMA value imputation**, and validates spatial consensus across neighboring stations.
2. **Tier 2 (Hazard Extended)**: Fuses validated AWS telemetry with regional meteorological context (Rainfall, Wind Speed) to dynamically quantify **Coastal Flood**, **Heatwave Thermal Stress**, and **Severe Storm/Cyclone** threat levels.

---

## 📸 Executive Command Center Preview

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ TIER 1 · SENSOR ANOMALY DETECTION [CRITICAL]     🛡️ TIER 2 · ENVIRONMENTAL RISK [HIGH RISK]         │
│  ┌─────────────────┐       ╭───╮                     ┌─────────────────┐       ╭───╮                   │
│  │ Temp (30.7°C)   │     ╭─╯0.68╰─╮                  │ 30.7°C Temp     │     ╭─╯HIGH╰─╮                │
│  │ Pressure (1010) │     │CRITICAL│                  │ 72.4% Humidity  │     │RISK LVL│                │
│  │ Humidity (72.4%)│     ╰────────╯                  │ 11.1 km/h Wind  │     ╰────────╯                │
│  └─────────────────┘  Conf: 96% | Time: 17:07 IST    └─────────────────┘  Flood: 5% | Heat: 17%        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Capabilities

### 🛡️ Tier 1: Real-Time Anomaly Detection & Sensor Diagnostics
- **Multivariate IsolationForest Engine**: Evaluates multivariate cross-correlations between Temperature, Pressure, and Humidity without relying on synthetic or artificial thresholds.
- **Dual-Source Training Pipeline**: Trained on 108,096 hourly samples from Goa (OpenML 43409) plus the Kaggle Indian Climate Dataset (2024–2025) as a supplementary source — merged only on columns validated as present in both, never fabricated to force a match.
- **Strict Chronological 80/20 Partitioning**: Trained without lookahead bias or future-leakage.
- **TreeSHAP Explainability**: Instant breakdown of feature contributions for every anomalous reading, identifying the exact root-cause parameter.
- **Physics-Guided Spatio-Temporal Imputation**: Automatically computes corrected sensor readings via hybrid inverse-distance weighting (IDW) and exponential moving averages (EMA).
- **Spatial Consensus Verification**: Evaluates consensus among neighboring stations within a 50 km radius to distinguish between isolated hardware faults and regional extreme weather phenomena.

### ⚡ Tier 2: Environmental Threat & Hazard Intelligence
- **Multi-Hazard Threat Scoring**: Calculates composite risk indices (0–100) across three climate vulnerabilities:
  - 🌊 **Coastal Flood Risk**: Evaluates barometric pressure collapse combined with extreme rainfall surge.
  - 🌡️ **Heatwave Risk (Humidex / HI)**: Computes thermal stress based on apparent temperature and diurnal deviation.
  - 🌀 **Cyclone & Storm Risk**: Monitors rapid pressure drops ($\Delta P > 6\text{ hPa}/3\text{h}$) coupled with wind velocity.
- **Real-Time Alert Cascade**: Automatically synthesizes human-readable operational threat bulletins for emergency responders.

### 🎮 Virtual AWS Hardware Simulator & Fault Injection
- **14 Connected AWS Nodes**: Complete coverage of the 4 Canonical Goa sector stations (`AWS-01` to `AWS-04`) + 10 major Indian climate stations (`Mumbai`, `Bengaluru`, `Chennai`, `Kolkata`, `Hyderabad`, `Ahmedabad`, `Jaipur`, `Lucknow`, `Bhopal`, `Delhi`).
