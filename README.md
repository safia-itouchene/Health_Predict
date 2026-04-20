
# 🏥 Health Profile Predictive Analysis System (GAT-LSTM)

**An intelligent decision support system for disease prevention and public health optimization through advanced predictive analytics**

---

## 🎯 Overview

This project proposes a comprehensive **health profile prediction system** that integrates medical, demographic, and genealogical data through a hybrid deep learning approach. The solution combines **Graph Attention Networks (GAT)** with **Bidirectional LSTM networks** to predict disease onset and anticipate health parameter evolution while accounting for hereditary influences.

**Innovation:** Unlike existing solutions that focus primarily on individual medical history, this system explicitly incorporates family relationships and genetic dimensions for more accurate personalized medicine.

### Core Objectives
- ✅ Predict individual disease risk based on personal and family health history
- ✅ Monitor evolution of health indicators over time
- ✅ Forecast population-level health trends
- ✅ Support early diagnosis and preventive interventions
- ✅ Optimize public health resource allocation

---

## ✨ Key Features

| Feature | Description | Impact |
|---------|-------------|--------|
| **Dual-Architecture Model** | GAT-LSTM combining hereditary patterns + temporal trends | Captures both individual and family health dynamics |
| **Multi-Task Learning** | Simultaneous disease classification + health regression | Comprehensive health assessment in one model |
| **Family Graph Integration** | Kinship relationships as graph structure | Quantifies hereditary disease transmission |
| **Temporal Analysis** | Monthly health measurements over 10 years | Detects health trajectory changes |
| **Population Forecasting** | XGBoost for aggregate trend prediction | Supports public health planning |
| **Interactive Dashboard** | React-based visualization system | Accessible insights for stakeholders |
| **REST API Backend** | Flask server with model persistence | Production-ready deployment |
| **Interpretable Results** | Clear disease risk attribution | Supports clinical decision-making |

---

## 🏗️ System Architecture

The system follows a **five-layer pipeline** for efficient electronic health record utilization:


<img width="1089" height="507" alt="Screenshot 2026-04-20 123446" src="https://github.com/user-attachments/assets/4767038f-0d57-4e70-8781-2a2b2684f37a" />


---

<table>
<tr>
<td width="25%">

**Data Base**
- DME Records
- 12,756 patients
- 1.5M measurements

</td>
<td width="25%">

**Preprocessing**
- Variable selection
- Data cleaning
- Data encoding
- Normalization

</td>
<td width="25%">

**Model Building**
- Algorithm choice
- Training & testing
- Model validation
- Model saving

</td>
<td width="25%">

**Deployment & Visualization**
- REST API
- Flask Server
- Dashboard
- Real-time analytics

</td>
</tr>
</table>

---
## 📚 Data Description

| Dataset | Records | Features | Purpose |
|---------|---------|----------|---------|
| **patients.csv** | 12,756 | 15 | Static demographics & medical history |
| **temporal_data.csv** | 1,543,476 | 12 | Monthly health measurements |
| **parent_relations.csv** | 17,096 | 3 | Family relationships
## 🧠 Model Architecture Details

### GAT-LSTM Hybrid Architecture

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">

<img width="1000" height="400" alt="Screenshot 2026-04-20 124106" src="https://github.com/user-attachments/assets/173b8826-d47a-4b5c-87c9-2ca4ad752a73" />


### Training Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| **Loss Function** | 0.4·L_disease + 0.4·L_health + 0.2·L_aux | Balanced multi-task learning |
| **Optimizer** | Adam (lr=0.001) | Adaptive learning rates |
| **Batch Size** | 32 | Memory-efficient training |
| **Max Epochs** | 100 | Sufficient convergence |
| **Early Stopping** | Patience=10 | Prevent overfitting |
| **Device** | CUDA GPU (Tesla T4) | Acceleration |
| **Train/Val Split** | 80/20 | Standard evaluation |

---

## 📊 Dashboard & Visualization

<table>
<tr>
<td style="text-align: center; padding: 10px;">
<img src="https://github.com/user-attachments/assets/753ab78f-716a-430d-8947-1efc5aab0c77" alt="Patient Dashboard" style="width: 100%; height: auto; border-radius: 8px;" />
<b>Patient profile interface</b>
</td>
</tr>
  <tr>
<td style="text-align: center; padding: 10px;">
<img src="https://github.com/user-attachments/assets/a26fcf6d-12ed-42bc-b2f5-afb2407dffa4" alt="Health Predictions" style="width: 100%; height: auto; border-radius: 8px;" />
<b>Health parameters monitoring interface</b>
</td>
     </tr>
  <tr> 
<td colspan="2" style="text-align: center; padding: 10px;">
<img src="https://github.com/user-attachments/assets/713b252d-5a25-41bd-9c90-1a06c3b76f50" alt="Population Trends" style="width: 100%; height: auto; border-radius: 8px;" />
<b>Disease risk interface</b>
</td>
 </tr>
</table>


## 📈 Performance Metrics

### Individual-Level Predictions (GAT-LSTM)

**Disease Classification:**
| Metric | Value | Details |
|--------|-------|---------|
| **Accuracy** | 94.20% | Overall correctness |
| **Precision** | 94.18% | False positive rate minimized |
| **Recall** | 94.20% | Disease detection rate |
| **F1-Score** | 94.11% | Balanced performance |
| **ROC-AUC** | 0.9732 | Excellent discrimination |

**Health Metric Regression:**
| Metric | Value | Details |
|--------|-------|---------|
| **R² Score** | 0.9698 | Explains 96.98% variance |
| **RMSE** | 0.0742 | Root mean squared error |
| **MAE** | 0.0637 | Average absolute error |

### Population-Level Forecasts (XGBoost)

**Trend Forecasting:**
| Metric | Value | Details |
|--------|-------|---------|
| **R² Score** | 0.9616 | Explains 96.16% variance |
| **RMSE** | 4,125 cases | Root mean squared error |
| **MAE** | 3,681 cases | Average absolute error |

---

## 🛠️ Technical Stack

| Category | Technologies |
|----------|-------------|
| **Backend (Python)** | PyTorch, PyTorch Geometric, XGBoost, scikit-learn, Pandas, NumPy, Imbalanced-learn |
| **Server & Deployment** | Flask, Pickle, Gunicorn |
| **Frontend (React + TypeScript)** | React 18+, TypeScript, Tailwind CSS, Plotly React, D3.js, Recharts |
| **Infrastructure & Data** | Python 3.8+, Node.js 14+, SQLite / PostgreSQL, Kaggle GPU (Tesla T4) |


## 🚀 Quick Start Guide

### Prerequisites

```bash
# Backend requirements
- Python 3.8+
- CUDA 11.0+ (optional, for GPU acceleration)

# Frontend requirements
- Node.js 14+
- npm or yarn
```

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/safia-itouchene/Health_Predict.git
cd Health_Predict
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import torch; print(f'PyTorch version: {torch.__version__}')"
```

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
# or
yarn install
```

### Running the Application

#### Start the Backend API

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Run Flask server
python app.py

# Server will be available at http://localhost:5000
```

#### Start the Frontend Development Server

```bash
cd frontend

npm run dev
# or
yarn dev

# Application will open at http://localhost:5173
```


---




## 👥 Team & Attribution

**Master's Thesis Project - 2025**

**Graduate Students:**
- ITOUCHENE Safia
- [TALBI Yamina](https://github.com/yaminatal)

**Academic Supervisors:**
- Prof. BELKHIR Abdelkader
- Dr. GUEBLI Wassila
- Prof. BOUYAKOUB Fayçal M'hamed

**Institution:**
University of Science and Technology Houari Boumediene (USTHB)
Faculty of Computer Science

**Defense Date:** July 2, 2025

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:


