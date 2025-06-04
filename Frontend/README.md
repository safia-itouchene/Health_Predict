# Health Prediction Model (GCN-LSTM)

This project implements a predictive model for health data using a Graph Convolutional Network (GCN) combined with Long Short-Term Memory (LSTM) neural networks. The model is designed to predict future health metrics and disease risks based on patient history and family relationships.

## Project Structure

### Backend (Python)

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

### Installation

1. Clone the repository:

```
git clone <repository-url>
cd health-prediction-model
```

2. Install Python dependencies:

```
pip install -r requirements.txt
```

3. Install frontend dependencies:

```
npm install
```

### Running the Application

1. Start the backend server:

```
cd backend
python app.py
```

2. Start the frontend development server:

```
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Model Training

To train the model from scratch:

```
cd backend
python run.py --epochs 50 --batch_size 32
```

## Features

- Temporal health data visualization and prediction
- Disease risk prediction and analysis
- Family relationship graph visualization
- Patient search and filtering
- Responsive dashboard design

## Data Structure

The model uses three main datasets:

1. **patients.csv**: Contains static patient information
2. **temporal_data.csv**: Monthly health measurements and disease indicators
3. **parent_relations.csv**: Family relationships between patients

## Model Architecture

The GCN-LSTM model combines:

- **Graph Convolutional Network (GCN)**: Processes family relationships to capture hereditary influences
- **Long Short-Term Memory (LSTM)**: Processes temporal health data to capture time-dependent patterns
- **Dual Output**: Predicts both numerical health metrics and disease risk probabilities

## License

[MIT License](LICENSE)