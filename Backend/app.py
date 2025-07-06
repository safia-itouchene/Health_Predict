from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import logging
import traceback
import torch
from model import GNNHealthcareModel, Config, DataPreprocessor, MultiTaskHealthPredictor, SMOTEHandler
import os
import json
from datetime import datetime, timedelta
import joblib  # Added for XGBoost model loading
from model_xgboost import HealthForecastingModel  # Added to import HealthForecastingModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def convert_to_serializable(obj):
    if isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, np.float32) or isinstance(obj, np.float64):
        return float(obj)
    elif isinstance(obj, np.int32) or isinstance(obj, np.int64):
        return int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj
# Health metric units mapping
HEALTH_METRIC_UNITS = {
    'Tension_artérielle_systolique': 'mmHg',
    'Tension_artérielle_diastolique': 'mmHg',
    'Glycémie_à_jeun': 'mmol/L',
    'Cholestérol_total': 'mmol/L',
    'IMC': 'kg/m²',
    'LDL': 'mmol/L',
    'Triglycérides': 'mmol/L',
    'Fréquence_cardiaque_au_repos': 'bpm',
}

# Global variables to store data, model, and graphs
healthcare_model = None
patients_df = None
temporal_df = None
parents_df = None
graphs = None  # Store precomputed graphs
xgboost_model = None  # Added for XGBoost model
xgboost_df = None  # Added for XGBoost data

def convert_numpy_types(obj):
    """
    Recursively convert numpy types to native Python types for JSON serialization
    """
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, torch.Tensor):
        return obj.detach().cpu().numpy().tolist()
    elif pd.isna(obj):
        return None
    else:
        return obj

def load_data():
    """Load CSV data files"""
    global patients_df, temporal_df, parents_df, xgboost_df
    try:
        patients_df = pd.read_csv('./data/patients.csv')
        temporal_df = pd.read_csv('./data/temporal_data.csv')
        parents_df = pd.read_csv('./data/parent_relations.csv')
        xgboost_df = pd.read_csv('./data/Xgboost_data.csv')  # Load XGBoost data
        # Convert NIN columns to integers
        patients_df['NIN'] = patients_df['NIN'].astype(int)
        temporal_df['NIN'] = temporal_df['NIN'].astype(int)
        parents_df['ChildNIN'] = parents_df['ChildNIN'].astype(int)
        parents_df['ParentNIN'] = parents_df['ParentNIN'].astype(int)
        # Convert Monthly_Date to datetime
        temporal_df['Monthly_Date'] = pd.to_datetime(temporal_df['Monthly_Date'])
        logger.info(f"Data loaded successfully:")
        logger.info(f"Patients: {len(patients_df)} records")
        logger.info(f"Temporal: {len(temporal_df)} records")
        logger.info(f"Parents: {len(parents_df)} records")
        logger.info(f"XGBoost Data: {len(xgboost_df)} records")
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        raise

def load_model():
    """Load the trained healthcare model and precompute graphs"""
    global healthcare_model, graphs
    try:
        model_path = './models/GNN-LSTM/healthcare_model.pth'
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        logger.info("Loading model with weights_only=False and CPU mapping...")
        checkpoint = torch.load(
            model_path,
            map_location=torch.device('cpu'),
            weights_only=False
        )
        healthcare_model = GNNHealthcareModel()
        healthcare_model.config = checkpoint['config']
        healthcare_model.preprocessor = checkpoint['preprocessor']
        healthcare_model.device = torch.device('cpu')
        healthcare_model.model = MultiTaskHealthPredictor(healthcare_model.config).to(healthcare_model.device)
        healthcare_model.model.load_state_dict(checkpoint['model_state_dict'])
        healthcare_model.model.eval()
        patients_processed, temporal_processed, parents_processed = healthcare_model.preprocessor.preprocess_data(
            patients_df.copy(),
            temporal_df.copy(),
            parents_df.copy(),
            fit_scalers=False
        )
        graphs = healthcare_model.preprocessor.create_family_graphs(
            patients_processed,
            temporal_processed,
            parents_processed,
            apply_smote=False
        )
        logger.info("Healthcare model and graphs loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def load_xgboost_model():
    """Load the pre-trained XGBoost models"""
    global xgboost_model
    try:
        xgboost_model = HealthForecastingModel(df=xgboost_df)
        model_dir = './models/XGBOOST'
        xgboost_model.load_models(model_dir)
        logger.info("XGBoost models loaded successfully")
    except Exception as e:
        logger.error(f"Error loading XGBoost models: {str(e)}")
        raise

def get_patient_basic_info(nin):
    """Get patient's basic information (name, age without decimals)"""
    try:
        patient_row = patients_df[patients_df['NIN'] == nin]
        if patient_row.empty:
            logger.warning(f"No patient found with NIN: {nin}")
            return None
        patient = patient_row.iloc[0]
        birth_date = pd.to_datetime(patient['BirthDate'])
        today = datetime.now()
        age = today.year - birth_date.year
        if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
            age -= 1
        result = {
            'NIN': str(int(patient['NIN'])),
            'Nom': str(patient['LastName']) if pd.notna(patient['LastName']) else "",
            'Prénom': str(patient['FirstName']) if pd.notna(patient['FirstName']) else "",
            'Age': int(age),
            'age': int(age),
            'Sex': str(patient['Sex']) if pd.notna(patient['Sex']) else "",
            'Sexe': str(patient['Sex']) if pd.notna(patient['Sex']) else "",
            'Blood_Group': str(patient['BloodGroup']) if pd.notna(patient['BloodGroup']) else "",
            'Groupe_sanguin': str(patient['BloodGroup']) if pd.notna(patient['BloodGroup']) else "",
            'Occupation': str(patient['Job']) if pd.notna(patient['Job']) else "",
            'Wilaya': str(patient['Wilaya']) if pd.notna(patient['Wilaya']) else "",
            'Location': str(patient['Wilaya']) if pd.notna(patient['Wilaya']) else ""
        }
        logger.info(f"Patient basic info retrieved for NIN {nin}: {result['Nom']} {result['Prénom']}")
        return result
    except Exception as e:
        logger.error(f"Error getting patient basic info for NIN {nin}: {str(e)}")
        return None

def get_last_8_months_health_metrics(nin):
    """Get patient's health metrics for the last 8 months - only specific metrics with units"""
    try:
        patient_temporal = temporal_df[temporal_df['NIN'] == nin].copy()
        if patient_temporal.empty:
            logger.warning(f"No temporal data found for NIN: {nin}")
            return []
        patient_temporal = patient_temporal.sort_values('Monthly_Date', ascending=False).head(8)
        health_metrics_columns = [
            'Cholestérol_total',
            'Fréquence_cardiaque_au_repos',
            'Glycémie_à_jeun',
            'IMC',
            'LDL',
            'Tension_artérielle_diastolique',
            'Tension_artérielle_systolique',
            'Triglycérides'
        ]
        metrics_data = []
        for _, row in patient_temporal.iterrows():
            month_data = {
                'date': row['Monthly_Date'].strftime('%Y-%m-%d'),
                'metrics': {}
            }
            for metric in health_metrics_columns:
                if metric in row:
                    value = row[metric]
                    if pd.notna(value):
                        if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                            converted_value = int(value)
                        elif isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
                            converted_value = float(value)
                        else:
                            converted_value = value
                        month_data['metrics'][metric] = {
                            'value': converted_value,
                            'unit': HEALTH_METRIC_UNITS.get(metric, '')
                        }
                    else:
                        month_data['metrics'][metric] = {
                            'value': None,
                            'unit': HEALTH_METRIC_UNITS.get(metric, '')
                        }
            metrics_data.append(month_data)
        logger.info(f"Found {len(metrics_data)} months of health metrics for NIN: {nin}")
        return metrics_data
    except Exception as e:
        logger.error(f"Error getting health metrics for NIN {nin}: {str(e)}")
        return []

def get_current_diseases(nin):
    """Get patient's current diseases (from latest temporal record - 1/1/2025)"""
    try:
        patient_temporal = temporal_df[temporal_df['NIN'] == nin].copy()
        if patient_temporal.empty:
            logger.warning(f"No temporal data found for current diseases for NIN: {nin}")
            return []
        latest_record = patient_temporal.sort_values('Monthly_Date', ascending=False).iloc[0]
        disease_columns = [
            'Hypertension', 'Diabète_type_2', 'Obésité', 'Asthme',
            'Cancer_du_poumon', 'Cancer_du_sein', 'Cancer_de_la_prostate',
            'Maladie_cardiovasculaire'
        ]
        current_diseases = []
        for disease in disease_columns:
            if disease in latest_record:
                value = latest_record[disease]
                if pd.notna(value) and int(value) == 1:
                    current_diseases.append(str(disease))
        return current_diseases
    except Exception as e:
        logger.error(f"Error getting current diseases for NIN {nin}: {str(e)}")
        return []

def get_parent_details(nin):
    """Get detailed information about patient's parents"""
    try:
        parent_relations = parents_df[parents_df['ChildNIN'] == nin]
        if parent_relations.empty:
            logger.info(f"No parent relations found for NIN: {nin}")
            return {
                'hasParentsData': False,
                'parents': []
            }
        parent_details = []
        for _, relation in parent_relations.iterrows():
            parent_nin = int(relation['ParentNIN'])
            parent_info = get_patient_basic_info(parent_nin)
            if parent_info:
                parent_diseases = get_current_diseases(parent_nin)
                parent_temporal = temporal_df[temporal_df['NIN'] == parent_nin].copy()
                latest_metrics = {}
                if not parent_temporal.empty:
                    latest_record = parent_temporal.sort_values('Monthly_Date', ascending=False).iloc[0]
                    health_metrics_columns = [
                        'Tension_artérielle_systolique', 'Tension_artérielle_diastolique',
                        'Glycémie_à_jeun', 'Cholestérol_total', 'IMC'
                    ]
                    for metric in health_metrics_columns:
                        if metric in latest_record and pd.notna(latest_record[metric]):
                            value = latest_record[metric]
                            if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                                converted_value = int(value)
                            elif isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
                                converted_value = float(value)
                            else:
                                converted_value = value
                            latest_metrics[metric] = {
                                'value': converted_value,
                                'unit': HEALTH_METRIC_UNITS.get(metric, '')
                            }
                parent_detail = {
                    **parent_info,
                    'current_diseases': parent_diseases,
                    'latest_health_metrics': latest_metrics,
                    'relation_type': 'Parent'
                }
                parent_details.append(parent_detail)
        return {
            'hasParentsData': len(parent_details) > 0,
            'parents': parent_details
        }
    except Exception as e:
        logger.error(f"Error getting parent details for NIN {nin}: {str(e)}")
        return {
            'hasParentsData': False,
            'parents': []
        }

def get_disease_risk_predictions(predictions, current_diseases):
    """Extract and filter disease risk predictions"""
    try:
        if not predictions or 'disease_risk_prediction' not in predictions:
            logger.warning("No disease_risk_prediction found in predictions")
            return []
        diseases_to_exclude = set(current_diseases)
        disease_risks = []
        disease_predictions = predictions['disease_risk_prediction']
        for disease_key, prediction_value in disease_predictions.items():
            if disease_key not in diseases_to_exclude:
                risk_percentage = 0
                risk_level = 'Low'
                try:
                    if isinstance(prediction_value, dict):
                        if 'risk_score' in prediction_value:
                            risk_score = prediction_value['risk_score']
                            if hasattr(risk_score, 'item'):
                                risk_score = risk_score.item()
                            risk_percentage = float(risk_score) * 100
                            risk_level = prediction_value.get('risk_level', 'Unknown')
                        elif 'probability' in prediction_value:
                            prob = prediction_value['probability']
                            if hasattr(prob, 'item'):
                                prob = prob.item()
                            risk_percentage = float(prob) * 100
                        elif 'risk' in prediction_value:
                            risk = prediction_value['risk']
                            if hasattr(risk, 'item'):
                                risk = risk.item()
                            risk_percentage = float(risk) * 100
                        else:
                            for key, value in prediction_value.items():
                                try:
                                    if hasattr(value, 'item'):
                                        value = value.item()
                                    risk_percentage = float(value) * 100
                                    break
                                except:
                                    continue
                    elif isinstance(prediction_value, (int, float)):
                        risk_percentage = float(prediction_value) * 100
                    else:
                        if hasattr(prediction_value, 'item'):
                            risk_percentage = float(prediction_value.item()) * 100
                        else:
                            risk_percentage = float(prediction_value) * 100
                    if risk_level == 'Low' or risk_level == 'Unknown':
                        if risk_percentage > 70:
                            risk_level = 'High'
                        elif risk_percentage > 40:
                            risk_level = 'Medium'
                        else:
                            risk_level = 'Low'
                except Exception as e:
                    logger.warning(f"Could not convert prediction value for {disease_key}: {prediction_value}, Error: {e}")
                    risk_percentage = 0
                    risk_level = 'Unknown'
                disease_risks.append({
                    'disease': disease_key,
                    'risk': round(risk_percentage, 2),
                    'risk_level': risk_level
                })
        return disease_risks
    except Exception as e:
        logger.error(f"Error getting disease risk predictions: {str(e)}")
        return []

def get_health_metrics_predictions(predictions):
    """Extract health metrics predictions from the model output"""
    try:
        if not predictions:
            logger.warning("No predictions available for health metrics")
            return {}
        health_metrics_predictions = {}
        if 'health_metrics_prediction' in predictions:
            health_data = predictions['health_metrics_prediction']
            if isinstance(health_data, list):
                processed_predictions = []
                for time_step_data in health_data:
                    if isinstance(time_step_data, dict):
                        time_step = time_step_data.get('time_step', 'Unknown')
                        predictions_data = time_step_data.get('predictions', {})
                        converted_predictions = {}
                        for key, value in predictions_data.items():
                            if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                                converted_predictions[key] = int(value)
                            elif isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
                                converted_predictions[key] = float(value)
                            elif hasattr(value, 'item'):
                                converted_predictions[key] = float(value.item())
                            else:
                                converted_predictions[key] = value
                        processed_predictions.append({
                            'time_step': time_step,
                            'predictions': converted_predictions
                        })
                health_metrics_predictions = {'time_series': processed_predictions}
            elif isinstance(health_data, dict):
                for key, value in health_data.items():
                    if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                        health_metrics_predictions[key] = int(value)
                    elif isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
                        health_metrics_predictions[key] = float(value)
                    elif hasattr(value, 'item'):
                        health_metrics_predictions[key] = float(value.item())
                    else:
                        health_metrics_predictions[key] = value
        possible_keys = [
            'vital_signs_prediction',
            'biomarkers_prediction',
            'lifestyle_prediction',
            'next_month_prediction',
            'future_health_metrics'
        ]
        for key in possible_keys:
            if key in predictions:
                data = predictions[key]
                if isinstance(data, dict):
                    converted_data = {}
                    for k, v in data.items():
                        if isinstance(v, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                            converted_data[k] = int(v)
                        elif isinstance(v, (np.floating, np.float64, np.float32, np.float16)):
                            converted_data[k] = float(v)
                        elif hasattr(v, 'item'):
                            converted_data[k] = float(v.item())
                        else:
                            converted_data[k] = v
                    health_metrics_predictions[key] = converted_data
        if not health_metrics_predictions:
            health_metric_keys = [
                'blood_pressure_systolic', 'blood_pressure_diastolic', 'glucose', 'cholesterol',
                'bmi', 'heart_rate', 'Tension_artérielle_systolique', 'Tension_artérielle_diastolique',
                'Glycémie_à_jeun', 'Cholestérol_total', 'IMC', 'Fréquence_cardiaque_au_repos'
            ]
            for metric_key in health_metric_keys:
                if metric_key in predictions:
                    value = predictions[metric_key]
                    if isinstance(value, (np.integer, np.int64, np.int32, np.int16, np.int8)):
                        health_metrics_predictions[metric_key] = int(value)
                    elif isinstance(value, (np.floating, np.float64, np.float32, np.float16)):
                        health_metrics_predictions[metric_key] = float(value)
                    elif hasattr(value, 'item'):
                        health_metrics_predictions[metric_key] = float(value.item())
                    else:
                        health_metrics_predictions[metric_key] = value
        return health_metrics_predictions
    except Exception as e:
        logger.error(f"Error processing health metrics predictions: {str(e)}")
        return {}

@app.after_request
def log_response(response):
    """Log the response data sent to the frontend"""
    if response.content_type == 'application/json':
        try:
            response_data = json.loads(response.get_data(as_text=True))
        except json.JSONDecodeError:
            logger.info(f"Response data (non-JSON): {response.get_data(as_text=True)}")
    else:
        logger.info(f"Response data (non-JSON): {response.get_data(as_text=True)}")
    return response

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint using precomputed graphs"""
    try:
        data = request.get_json()
        if not data or 'nin' not in data:
            return jsonify({'error': 'NIN is required in request body'}), 400
        nin_str = data['nin']
        try:
            nin = int(nin_str)
        except ValueError:
            return jsonify({'error': 'Invalid NIN format. Must be a number.'}), 400
        if healthcare_model is None or graphs is None:
            return jsonify({'error': 'Model or graphs not loaded'}), 500
        if any([df is None for df in [patients_df, temporal_df, parents_df]]):
            return jsonify({'error': 'Data not loaded'}), 500
        if nin not in patients_df['NIN'].values:
            return jsonify({'error': f'Patient with NIN {nin} not found'}), 404
        patient_info = get_patient_basic_info(nin)
        if patient_info is None:
            return jsonify({'error': f'Patient basic info not found for NIN {nin}'}), 404
        health_metrics = get_last_8_months_health_metrics(nin)
        current_diseases = get_current_diseases(nin)
        family_data = get_parent_details(nin)
        try:
            prediction_result = healthcare_model.get_patient_prediction(
                nin,
                patients_df,
                temporal_df,
                parents_df,
                graphs
            )
            if prediction_result is None:
                return jsonify({'error': f'Failed to generate prediction for NIN {nin}'}), 400
            disease_risks = get_disease_risk_predictions(prediction_result, current_diseases)
            health_metrics_predictions = get_health_metrics_predictions(prediction_result)
            prediction_result_serializable = convert_numpy_types(prediction_result)
            response_data = {
                'patientDetails': patient_info,
                'healthMetrics': health_metrics,
                'currentDiseases': current_diseases,
                'familyData': family_data,
                'diseaseRisks': disease_risks,
                'healthMetricsPredictions': health_metrics_predictions,
                'fullPredictions': prediction_result_serializable
            }
            return jsonify({
                'success': True,
                'data': response_data
            })
        except ValueError as ve:
            logger.warning(f"Prediction failed for NIN {nin}: {str(ve)}")
            return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logger.error(f"Unexpected error in prediction: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/predict_xgboost', methods=['POST'])
def predict_xgboost():
    try:
        data = request.get_json()
        if not data or 'year' not in data:
            return jsonify({'error': 'Year is required in request body'}), 400
        year_str = data['year']
        try:
            year = int(year_str)
        except ValueError:
            return jsonify({'error': 'Invalid year format. Must be an integer.'}), 400
        if xgboost_model is None:
            return jsonify({'error': 'XGBoost model not loaded'}), 500
        predictions = xgboost_model.predict_future(year)
        predictions_serializable = convert_to_serializable(predictions)
        return jsonify({
            'success': True,
            'predictions': predictions_serializable
        })
    except Exception as e:
        logger.error(f"Error in XGBoost prediction: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/patient/<nin>', methods=['GET'])
def get_patient_info(nin):
    """Get patient information by NIN"""
    try:
        nin = int(nin)
        if patients_df is None:
            return jsonify({'error': 'Data not loaded'}), 500
        patient_info = patients_df[patients_df['NIN'] == nin]
        if patient_info.empty:
            return jsonify({'error': f'Patient with NIN {nin} not found'}), 404
        basic_info = get_patient_basic_info(nin)
        health_metrics = get_last_8_months_health_metrics(nin)
        current_diseases = get_current_diseases(nin)
        family_data = get_parent_details(nin)
        response_data = {
            'patientDetails': basic_info,
            'healthMetrics': health_metrics,
            'currentDiseases': current_diseases,
            'familyData': family_data
        }
        return jsonify({
            'success': True,
            'data': response_data
        })
    except ValueError:
        return jsonify({'error': 'Invalid NIN format'}), 400
    except Exception as e:
        logger.error(f"Error getting patient info: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/patients/list', methods=['GET'])
def list_patients():
    """List all patients with basic info"""
    try:
        if patients_df is None:
            return jsonify({'error': 'Data not loaded'}), 500
        patients_list = []
        for _, patient in patients_df.iterrows():
            nin = int(patient['NIN'])
            basic_info = get_patient_basic_info(nin)
            if basic_info:
                patients_list.append(basic_info)
        return jsonify({
            'success': True,
            'data': patients_list,
            'count': len(patients_list)
        })
    except Exception as e:
        logger.error(f"Error listing patients: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': healthcare_model is not None,
        'xgboost_model_loaded': xgboost_model is not None,  # Added for XGBoost
        'data_loaded': all([df is not None for df in [patients_df, temporal_df, parents_df, xgboost_df]]),
        'graphs_loaded': graphs is not None
    })

@app.route('/debug/patient/<nin>', methods=['GET'])
def debug_patient_data(nin):
    """Debug endpoint to check patient data availability"""
    try:
        nin = int(nin)
        debug_info = {
            'nin': nin,
            'patient_exists': nin in patients_df['NIN'].values if patients_df is not None else False,
            'temporal_records': len(temporal_df[temporal_df['NIN'] == nin]) if temporal_df is not None else 0,
            'parent_relations': len(parents_df[parents_df['ChildNIN'] == nin]) if parents_df is not None else 0,
            'temporal_columns': list(temporal_df.columns) if temporal_df is not None else [],
            'sample_temporal_dates': temporal_df[temporal_df['NIN'] == nin]['Monthly_Date'].tolist()[:5] if temporal_df is not None and not temporal_df[temporal_df['NIN'] == nin].empty else []
        }
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({'error': str(e)})

def initialize_app():
    """Initialize the application by loading data and models"""
    try:
        logger.info("Initializing Flask application...")
        load_data()
        load_model()
        load_xgboost_model()
        logger.info("Application initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        raise
    
if __name__ == '__main__':
    try:
        initialize_app()
        DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
        HOST = os.getenv('HOST', '0.0.0.0')
        PORT = int(os.getenv('PORT', 5000))
        logger.info(f"Starting Flask server on {HOST}:{PORT}")
        app.run(host=HOST, port=PORT, debug=DEBUG)
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        exit(1)