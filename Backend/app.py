from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import pandas as pd
import numpy as np
from model import Config, DataProcessor, GCNLSTMModel, PredictionService
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/predict": {"origins": "http://localhost:5173"}})

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

config = Config()
processor = DataProcessor(config)
patients, temporal, parents = processor.load_data('./data')
patients, temporal, parents = processor.preprocess_data(patients, temporal, parents)
G, edge_index, nin_to_idx, node_features = processor.create_patient_graph(patients, temporal, parents)

print(f"Loaded {len(patients)} patients")
print(f"Loaded {len(temporal)} temporal records")
print(f"Graph has {len(nin_to_idx)} nodes")

model = GCNLSTMModel(
    input_dim=len(config.feature_cols),
    node_feature_dim=4,
    hidden_dim=config.hidden_dim,
    output_dim_health=len(config.target_health_cols),
    output_dim_disease=len(config.target_disease_cols),
    pred_length=config.pred_length
).to(device)

try:
    model.load_state_dict(torch.load('best_model.pt', map_location=device))
    model.eval()
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")

prediction_service = PredictionService(model, config, processor)

HEALTH_METRIC_UNITS = {
    'Tension_artérielle_systolique': 'mmHg',
    'Tension_artérielle_diastolique': 'mmHg',
    'Glycémie_à_jeun': 'mmol/L',
    'Cholestérol_total': 'mmol/L',
    'IMC': 'kg/m²',
    'LDL': 'mmol/L',
    'Triglycérides': 'mmol/L',
    'Fréquence_cardiaque_au_repos': 'bpm',
    'HDL': 'mmol/L',
    'Poids': 'kg',
    'Taille': 'cm',
    'Tour_de_taille': 'cm',
    'Tension_artérielle_moyenne': 'mmHg',
    'Glycémie_postprandiale': 'mmol/L',
    'HbA1c': '%',
    'Créatinine': 'µmol/L',
    'Urée': 'mmol/L',
    'Acide_urique': 'µmol/L',
    'Protéine_C_réactive': 'mg/L',
    'Vitesse_sédimentation': 'mm/h',
    'Hémoglobine': 'g/dL',
    'Hématocrite': '%',
    'Plaquettes': '10³/µL',
    'Leucocytes': '10³/µL',
    'Température_corporelle': '°C',
    'Saturation_oxygène': '%',
    'Capacité_vitale': 'L',
    'Débit_expiratoire_peak': 'L/min'
}

def convert_to_serializable(obj):
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    return obj

def calculate_age(birthdate):
    today = datetime.today()
    age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
    return age

def denormalize_health_metrics(normalized_data, health_metrics):
    """
    Denormalize health metrics using the processor's health_scaler
    
    Args:
        normalized_data: DataFrame or Series with normalized health metric values
        health_metrics: List of health metric column names to denormalize
    
    Returns:
        DataFrame or Series with denormalized values
    """
    try:
        # Get the health metrics that are available in both the data and the target columns
        available_health_metrics = [col for col in health_metrics if col in normalized_data.columns]
        
        if not available_health_metrics:
            print("No health metrics found to denormalize")
            return normalized_data
        
        # Create a copy to avoid modifying original data
        denormalized_data = normalized_data.copy()
        
        # Extract the normalized values for health metrics
        if isinstance(normalized_data, pd.DataFrame):
            normalized_values = normalized_data[available_health_metrics].values
        else:
            # Handle Series case
            normalized_values = normalized_data[available_health_metrics].values.reshape(1, -1)
        
        # Check if we have the right number of features for the scaler
        expected_features = len(config.target_health_cols)
        actual_features = len(available_health_metrics)
        
        if actual_features != expected_features:
            # Create a full feature array with zeros for missing features
            full_normalized_values = np.zeros((normalized_values.shape[0], expected_features))
            
            # Map available features to their correct positions
            for i, metric in enumerate(available_health_metrics):
                if metric in config.target_health_cols:
                    target_idx = config.target_health_cols.index(metric)
                    full_normalized_values[:, target_idx] = normalized_values[:, i]
            
            # Denormalize using the full feature array
            denormalized_full = processor.health_scaler.inverse_transform(full_normalized_values)
            
            # Extract only the values we need
            for i, metric in enumerate(available_health_metrics):
                if metric in config.target_health_cols:
                    target_idx = config.target_health_cols.index(metric)
                    if isinstance(denormalized_data, pd.DataFrame):
                        denormalized_data[metric] = denormalized_full[:, target_idx]
                    else:
                        denormalized_data[metric] = denormalized_full[0, target_idx]
        else:
            # Direct denormalization when we have all features
            denormalized_values = processor.health_scaler.inverse_transform(normalized_values)
            
            # Update the dataframe/series with denormalized values
            for i, metric in enumerate(available_health_metrics):
                if isinstance(denormalized_data, pd.DataFrame):
                    denormalized_data[metric] = denormalized_values[:, i]
                else:
                    denormalized_data[metric] = denormalized_values[0, i]
        
        print(f"Successfully denormalized {len(available_health_metrics)} health metrics")
        return denormalized_data
        
    except Exception as e:
        print(f"Error denormalizing health metrics: {e}")
        return normalized_data

def prepare_patient_input(nin):
    print(f"=== DEBUGGING PATIENT INPUT ===")
    print(f"NIN received: {nin}")
    print(f"NIN type: {type(nin)}")
    print(f"Available NIDs (first 5): {list(nin_to_idx.keys())[:5]}")
    
    if nin not in nin_to_idx:
        print(f"ERROR: NIN {nin} not found in nin_to_idx mapping")
        return None, None
        
    patient_temporal = temporal[temporal['NIN'] == nin].sort_values('Monthly_Date')
    print(f"Found {len(patient_temporal)} temporal records for NIN {nin}")
    print(f"Required seq_length: {config.seq_length}")
    
    if len(patient_temporal) < config.seq_length:
        print(f"ERROR: Insufficient data: {len(patient_temporal)} < {config.seq_length}")
        return None, None
    
    recent_data = patient_temporal.tail(config.seq_length)
    print(f"Recent data shape: {recent_data.shape}")
    print(f"Recent data columns: {recent_data.columns.tolist()}")
    
    merged_data = pd.merge(
        patients[['NIN'] + [col for col in patients.columns if col in config.feature_cols]],
        recent_data, on='NIN', how='inner'
    )
    print(f"Merged data shape: {merged_data.shape}")
    print(f"Feature columns: {config.feature_cols}")
    
    for col in config.feature_cols:
        if col not in merged_data.columns:
            merged_data[col] = 0
            print(f"Added missing column: {col}")
    
    seq_features = merged_data[config.feature_cols].values[-config.seq_length:]
    print(f"Sequence features shape: {seq_features.shape}")
    print(f"Sample features (first row): {seq_features[0] if len(seq_features) > 0 else 'None'}")
    
    patient_tensor = torch.tensor(seq_features, dtype=torch.float32).unsqueeze(0).to(device)
    patient_idx = nin_to_idx[nin]
    
    print(f"Patient tensor shape: {patient_tensor.shape}")
    print(f"Patient index: {patient_idx}")
    print(f"=== END DEBUGGING ===")
    
    return patient_tensor, patient_idx

def format_predictions(predictions, nin):
    print("=== FORMATTING PREDICTIONS ===")
    print(f"Raw predictions keys: {predictions.keys()}")
    
    # Get historical data for the patient
    patient_temporal = temporal[temporal['NIN'] == nin].sort_values('Monthly_Date').tail(6)
    
    health_metrics = []
    if 'health_predictions' in predictions:
        for metric_name, pred_values in predictions['health_predictions'].items():
            display_name = metric_name.replace('_', ' ').title()
            unit = HEALTH_METRIC_UNITS.get(metric_name, '')
            
            # Get historical values for this metric
            historical_data = []
            if metric_name in patient_temporal.columns:
                # Denormalize historical data for this specific metric
                historical_normalized = patient_temporal[[metric_name]].copy()
                print(f"Before denormalization - {metric_name}: {historical_normalized[metric_name].values[:3]}")
                
                # Denormalize the historical data
                historical_denormalized = denormalize_health_metrics(historical_normalized, [metric_name])
                print(f"After denormalization - {metric_name}: {historical_denormalized[metric_name].values[:3]}")
                
                for idx, row in patient_temporal.iterrows():
                    # Get the denormalized value for this row
                    denorm_row = historical_denormalized.loc[historical_denormalized.index == idx]
                    if not denorm_row.empty:
                        denorm_value = float(denorm_row[metric_name].iloc[0])
                    else:
                        denorm_value = 0
                    
                    historical_data.append({
                        'month': row['Monthly_Date'].strftime('%Y-%m'),
                        'value': denorm_value,
                        'type': 'actual',
                        'date': row['Monthly_Date'].isoformat()
                    })
            
            # Add prediction data (already denormalized from the model)
            prediction_data = []
            for i, value in enumerate(pred_values):
                # Create future dates starting from the last historical date
                last_date = patient_temporal['Monthly_Date'].iloc[-1] if not patient_temporal.empty else pd.Timestamp.now()
                future_date = last_date + pd.DateOffset(months=i+1)
                prediction_data.append({
                    'month': future_date.strftime('%Y-%m'),
                    'value': float(value),
                    'type': 'predicted',
                    'date': future_date.isoformat()
                })
            
            # Combine historical and prediction data
            all_data = historical_data + prediction_data
            
            health_metrics.append({
                'metricName': display_name,
                'originalName': metric_name,
                'unit': unit,
                'data': all_data,
                'currentValue': float(pred_values[0]) if pred_values else 0
            })
    
    disease_risks = []
    if 'disease_probabilities' in predictions:
        for disease_name, probability in predictions['disease_probabilities'].items():
            display_name = disease_name.replace('_', ' ').title()
            risk_level = 'High' if probability > 0.7 else 'Medium' if probability > 0.3 else 'Low'
            disease_risks.append({
                'name': display_name,
                'originalName': disease_name,
                'probability': float(probability),
                'riskLevel': risk_level,
                'predicted': predictions.get('disease_predictions', {}).get(disease_name, False)
            })
    
    print(f"Formatted {len(health_metrics)} health metrics")
    print(f"Formatted {len(disease_risks)} disease risks")
    print("=== END FORMATTING ===")
    
    return health_metrics, disease_risks

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        nin = data.get('nin')
        print(f"\n=== NEW PREDICTION REQUEST ===")
        print(f"Received NIN: {nin}")
        
        if not nin:
            return jsonify({'error': 'NIN is required'}), 400
        
        if nin not in nin_to_idx:
            print(f"Patient {nin} not found in database")
            return jsonify({'error': 'Patient not found'}), 404
        
        patient_tensor, patient_idx = prepare_patient_input(nin)
        if patient_tensor is None:
            return jsonify({'error': 'Insufficient data for prediction'}), 404
        
        print("=== CALLING PREDICTION SERVICE ===")
        print(f"Input tensor shape: {patient_tensor.shape}")
        print(f"Edge index shape: {edge_index.shape}")
        print(f"Node features shape: {node_features.shape}")
        print(f"Patient index: {patient_idx}")
        
        predictions = prediction_service.predict_future(
            patient_tensor, edge_index, node_features, patient_idx
        )
        
        print("=== PREDICTION RESULTS ===")
        print(f"Predictions type: {type(predictions)}")
        print(f"Predictions keys: {predictions.keys() if isinstance(predictions, dict) else 'Not a dict'}")
        
        if isinstance(predictions, dict):
            for key, value in predictions.items():
                print(f"{key}: {type(value)} - Length: {len(value) if hasattr(value, '__len__') else 'N/A'}")
                if hasattr(value, '__len__') and len(value) > 0:
                    print(f"  Sample: {value if isinstance(value, (int, float, str)) else list(value.keys()) if isinstance(value, dict) else 'Complex structure'}")
        
        patient_row = patients[patients['NIN'] == nin].iloc[0]
        
        # Fetch current diseases and lifestyle data from most recent temporal record
        patient_temporal = temporal[temporal['NIN'] == nin].sort_values('Monthly_Date', ascending=False)
        current_diseases = []
        lifestyle_data = {}
        if not patient_temporal.empty:
            latest_record = patient_temporal.iloc[0]
            disease_cols = [
                'Hypertension', 'Diabète_type_2', 'Obésité', 'Asthme',
                'Cancer_du_poumon', 'Cancer_du_sein', 'Cancer_de_la_prostate',
                'Maladie_cardiovasculaire', 'Dépression'
            ]
            current_diseases = [disease for disease in disease_cols if latest_record.get(disease, 0) == 1]
            print(f"Current diseases found: {current_diseases}")
            
            # Define lifestyle fields
            lifestyle_fields = [
                'Statut_tabagique', 'Cigarettes_par_jour', 'Années_de_tabagisme',
                'Consommation_alcool', 'Activité_physique', 'Heures_activité_hebdo',
                'Qualité_alimentation', 'Qualité_sommeil'
            ]
            # Extract lifestyle data
            lifestyle_data = {field: str(latest_record.get(field, 'N/A')) for field in lifestyle_fields}
        
        patient_details = {
            'Prénom': patient_row['FirstName'],
            'Nom': patient_row['LastName'],
            'NIN': patient_row['NIN'],
            'Date_naissance': patient_row['BirthDate'],
            'age': calculate_age(patient_row['BirthDate']),
            'Groupe_sanguin': patient_row['BloodGroup'],
            'Wilaya': patient_row['Wilaya'],
            'Sexe': patient_row['Sex'],
            'lifestyle': lifestyle_data  # Add lifestyle data
        }
        
        health_metrics, disease_risks = format_predictions(predictions,nin)
        
        response_data = {
            'patientDetails': patient_details,
            'currentDiseases': current_diseases,
            'healthMetrics': health_metrics,
            'diseaseRisks': disease_risks,
            'familyData': {},
            'predictionHorizon': predictions.get('prediction_horizon', config.pred_length)
        }
        
        print("=== FINAL RESPONSE ===")
        print(f"Health metrics length: {len(response_data['healthMetrics'])}")
        print(f"Disease risks length: {len(response_data['diseaseRisks'])}")
        print(f"Sample health metric: {response_data['healthMetrics'][0] if response_data['healthMetrics'] else 'None'}")
        print(f"Sample disease risk: {response_data['diseaseRisks'][0] if response_data['diseaseRisks'] else 'None'}")
        
        serializable_response = convert_to_serializable(response_data)
        return jsonify(serializable_response)
        
    except Exception as e:
        print(f"ERROR in predict endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/debug/patient/<nin>', methods=['GET'])
def debug_patient(nin):
    try:
        debug_info = {
            'nin_exists': nin in nin_to_idx,
            'patient_in_patients_csv': len(patients[patients['NIN'] == nin]) > 0,
            'temporal_records': len(temporal[temporal['NIN'] == nin]),
            'required_seq_length': config.seq_length,
            'feature_columns': config.feature_cols,
            'target_health_columns': config.target_health_cols,
            'target_disease_columns': config.target_disease_cols,
        }
        
        if nin in nin_to_idx:
            debug_info['patient_index'] = nin_to_idx[nin]
            
        if len(patients[patients['NIN'] == nin]) > 0:
            patient_data = patients[patients['NIN'] == nin].iloc[0].to_dict()
            debug_info['patient_data'] = convert_to_serializable(patient_data)
            
        patient_temporal = temporal[temporal['NIN'] == nin].sort_values('Monthly_Date')
        if not patient_temporal.empty:
            debug_info['temporal_data_sample'] = convert_to_serializable(
                patient_temporal.tail(3).to_dict('records')
            )
            
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)