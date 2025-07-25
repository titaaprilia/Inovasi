import os
import logging
from flask import Flask, render_template, request, jsonify
from data_processor import DataProcessor
from lstm_model import LSTMPredictor
import pandas as pd
from datetime import datetime, timedelta
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

# Initialize data processor and LSTM model
data_processor = DataProcessor()
lstm_predictor = LSTMPredictor()

@app.route('/')
def dashboard():
    """Main dashboard route"""
    try:
        # Load and process data
        df = data_processor.load_data()
        
        # Get red onion data specifically
        red_onion_data = data_processor.filter_red_onion_data(df)
        
        # Calculate KPIs
        kpis = data_processor.calculate_kpis(red_onion_data)
        
        # Get provinces list for filter
        provinces = data_processor.get_provinces(red_onion_data)
        
        # Get recent data for table
        recent_data = data_processor.get_recent_data(red_onion_data, limit=10)
        
        # Get price alerts
        alerts = data_processor.get_price_alerts(red_onion_data)
        
        # Get system status
        system_status = data_processor.get_system_status(red_onion_data)
        
        return render_template('dashboard.html',
                             kpis=kpis,
                             provinces=provinces,
                             recent_data=recent_data,
                             alerts=alerts,
                             system_status=system_status)
    
    except Exception as e:
        logging.error(f"Error loading dashboard: {str(e)}")
        return render_template('dashboard.html',
                             kpis={},
                             provinces=[],
                             recent_data=[],
                             alerts=[],
                             system_status={},
                             error="Unable to load data. Please check if the CSV file exists and contains valid data.")

@app.route('/api/chart_data')
def get_chart_data():
    """API endpoint for chart data"""
    try:
        province = request.args.get('province', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Load and filter data
        df = data_processor.load_data()
        red_onion_data = data_processor.filter_red_onion_data(df)
        
        # Apply filters
        filtered_data = data_processor.apply_filters(red_onion_data, province, start_date, end_date)
        
        # Generate LSTM predictions
        predictions = lstm_predictor.predict(filtered_data)
        
        # Prepare chart data
        chart_data = data_processor.prepare_chart_data(filtered_data, predictions)
        
        return jsonify(chart_data)
        
    except Exception as e:
        logging.error(f"Error getting chart data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_filters')
def update_filters():
    """API endpoint for updating dashboard with filters"""
    try:
        province = request.args.get('province', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Load and filter data
        df = data_processor.load_data()
        red_onion_data = data_processor.filter_red_onion_data(df)
        filtered_data = data_processor.apply_filters(red_onion_data, province, start_date, end_date)
        
        # Recalculate KPIs
        kpis = data_processor.calculate_kpis(filtered_data)
        
        # Get recent data
        recent_data = data_processor.get_recent_data(filtered_data, limit=10)
        
        # Get alerts
        alerts = data_processor.get_price_alerts(filtered_data)
        
        return jsonify({
            'kpis': kpis,
            'recent_data': recent_data,
            'alerts': alerts
        })
        
    except Exception as e:
        logging.error(f"Error updating filters: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
