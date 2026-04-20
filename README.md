# Health Prediction Model (GCN-LSTM)

## Abstract

Faced with the growing challenges of health systems, particularly the increase in chronic diseases and massive medical data management, e-health emerges as a strategic solution. Predictive analysis provides tools to anticipate health risks and improve patient care.

This project proposes a health profile prediction approach based on the integration of medical, demographic, and genealogical data. Through advanced machine learning and deep learning techniques, we have designed a model combining **Graph Neural Networks (GNN)** and **LSTM networks** to model the evolution of health indicators and predict disease occurrence.

The solution uses synthetic data representing an Algerian population. Each patient is described through:
- Static demographic information
- Monthly measurement time series
- Kinship relationships (family graph)

The model combines individual and family dimensions to reflect the complexity of health determinants. Additionally, a global prediction of health trends is performed using the **XGBoost algorithm** for population-level observations across all studied diseases.

**Keywords:** E-health, predictive analysis, machine learning, GNN, LSTM, XGBoost, medical data, family graph, time series, health trends.

---

## Project Overview

This intelligent decision support system contributes to disease prevention and the optimization of public health policies through advanced predictive analytics.

### Core Technologies
- **Graph Convolutional Networks (GCN)**: Model family relationships and hereditary influences
- **LSTM Networks**: Capture temporal patterns in health data
- **XGBoost**: Population-level trend analysis
- **PyTorch & PyTorch Geometric**: Deep learning framework
- **Flask**: REST API backend
- **React + TypeScript**: Interactive dashboard frontend

---

## Architecture

The proposed architecture follows a structured process for efficiently utilizing Electronic Health Records (EHRs) for prediction:

### 1. **Data Layer**
- Structured database inspired by Electronic Medical Records (EHRs)
- Three main datasets:
  - `patients.csv`: Static patient information and demographics
  - `temporal_data.csv`: Monthly health measurements and disease indicators
  - `parent_relations.csv`: Family relationships and kinship graphs

### 2. **Preprocessing Layer**
- Data validation and cleaning
- Feature engineering and normalization
- Temporal sequence alignment
- Graph construction from family relationships

### 3. **Model Construction Layer**
- **GCN-LSTM Architecture**: Dual neural network approach
  - GCN processes family relationships to capture hereditary influences
  - LSTM processes temporal health data for time-dependent patterns
  - Dual output: numerical health metrics + disease risk probabilities
- **XGBoost Model**: Population-level trend prediction
- Model training, evaluation, and validation
- Hyperparameter optimization

### 4. **Model Deployment Layer**
- Flask REST API for model serving
- Persistent model storage and versioning
- Scalable backend infrastructure

### 5. **Visualization Layer**
- Interactive React dashboard
- Real-time prediction results
- Patient search and filtering
- Family relationship visualization
- Health trend charts and analytics

---

## Project Structure
### Backend (Python)

<img width="1156" height="572" alt="Screenshot 2026-04-20 124106" src="https://github.com/user-attachments/assets/7877ddf3-69be-4b61-8565-1dd3fe764abd" />

The backend is built with PyTorch and PyTorch Geometric for the ML components, and Flask for the API:

- `model.py`: Defines the GCN-LSTM architecture
- `preprocessing.py`: Handles data loading and preprocessing
- `train.py`: Contains the training and evaluation pipeline
- `run.py`: Entry point for running the model training
- `app.py`: Flask API for serving predictions

### Frontend (React)

The frontend is a React application with TypeScript for the dashboard:

- `App.tsx`: Main application component
- `components/`: UI components for the dashboard
- `api/`: API integration with the backend
- `types.ts`: TypeScript type definitions

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
