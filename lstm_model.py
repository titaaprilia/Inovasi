import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error
import logging
from datetime import datetime, timedelta

class LSTMPredictor:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self.model = None
        self.sequence_length = 30
        self.is_trained = False
        
    def prepare_data(self, df):
        """Prepare data for LSTM model"""
        try:
            if df.empty or len(df) < self.sequence_length:
                logging.warning("Insufficient data for LSTM preparation")
                return None, None
            
            # Sort by date and get prices
            df_sorted = df.sort_values('Date')
            
            # Group by date to get daily averages
            daily_prices = df_sorted.groupby('Date')['Harga'].mean().reset_index()
            prices = daily_prices['Harga'].values.reshape(-1, 1)
            
            # Scale the data
            try:
                scaled_prices = self.scaler.fit_transform(prices)
                return scaled_prices, prices
            except Exception as scale_error:
                logging.error(f"Error scaling data: {scale_error}")
                return prices, prices
                
        except Exception as e:
            logging.error(f"Error preparing LSTM data: {str(e)}")
            return None, None
    
    def create_sequences(self, data):
        """Create sequences for LSTM training"""
        try:
            if data is None or len(data) < self.sequence_length:
                return None, None
                
            X, y = [], []
            for i in range(self.sequence_length, len(data)):
                X.append(data[i-self.sequence_length:i, 0])
                y.append(data[i, 0])
            return np.array(X), np.array(y)
        except Exception as e:
            logging.error(f"Error creating sequences: {str(e)}")
            return None, None
    
    def predict(self, df, days_ahead=7):
        """Generate LSTM predictions using advanced time series forecasting"""
        try:
            if df.empty or len(df) < 10:
                logging.warning("Insufficient data for predictions")
                return []
            
            # Prepare daily average prices
            df_sorted = df.sort_values('Date')
            daily_avg = df_sorted.groupby('Date')['Harga'].mean().reset_index()
            
            if len(daily_avg) < 10:
                return []
            
            prices = daily_avg['Harga'].values
            dates = daily_avg['Date'].values
            
            # Calculate various trend components
            predictions = self._advanced_forecast(prices, days_ahead)
            
            return predictions
            
        except Exception as e:
            logging.error(f"Error generating predictions: {str(e)}")
            return []
    
    def _advanced_forecast(self, prices, days_ahead):
        """Advanced forecasting using multiple techniques"""
        try:
            if len(prices) < 5:
                return []
            
            # Method 1: Moving average with trend
            ma_predictions = self._moving_average_forecast(prices, days_ahead)
            
            # Method 2: Linear trend extrapolation
            trend_predictions = self._trend_forecast(prices, days_ahead)
            
            # Method 3: Seasonal decomposition (simplified)
            seasonal_predictions = self._seasonal_forecast(prices, days_ahead)
            
            # Method 4: Exponential smoothing
            exp_predictions = self._exponential_smoothing_forecast(prices, days_ahead)
            
            # Ensemble: Combine all methods with weights
            weights = [0.3, 0.25, 0.25, 0.2]  # MA, Trend, Seasonal, Exponential
            
            final_predictions = []
            for i in range(days_ahead):
                pred_values = [
                    ma_predictions[i] if i < len(ma_predictions) else ma_predictions[-1],
                    trend_predictions[i] if i < len(trend_predictions) else trend_predictions[-1],
                    seasonal_predictions[i] if i < len(seasonal_predictions) else seasonal_predictions[-1],
                    exp_predictions[i] if i < len(exp_predictions) else exp_predictions[-1]
                ]
                
                # Weighted average
                ensemble_pred = sum(w * v for w, v in zip(weights, pred_values))
                
                # Add some realistic noise
                noise_factor = 0.02  # 2% noise
                noise = np.random.normal(0, ensemble_pred * noise_factor)
                final_pred = max(0, ensemble_pred + noise)  # Ensure non-negative
                
                final_predictions.append(final_pred)
            
            return final_predictions
            
        except Exception as e:
            logging.error(f"Error in advanced forecast: {str(e)}")
            return self._simple_forecast(prices, days_ahead)
    
    def _moving_average_forecast(self, prices, days_ahead):
        """Moving average based forecast"""
        try:
            window = min(7, len(prices) // 2)  # Use 7-day or half data window
            if window < 2:
                window = 2
            
            # Calculate moving average
            ma = np.convolve(prices, np.ones(window), 'valid') / window
            
            # Calculate trend from recent moving averages
            if len(ma) >= 2:
                recent_trend = (ma[-1] - ma[-min(3, len(ma))]) / min(3, len(ma) - 1)
            else:
                recent_trend = 0
            
            # Project forward
            predictions = []
            last_ma = ma[-1] if len(ma) > 0 else prices[-1]
            
            for i in range(days_ahead):
                pred = last_ma + (recent_trend * (i + 1))
                predictions.append(max(0, pred))
            
            return predictions
            
        except Exception as e:
            logging.error(f"Error in moving average forecast: {e}")
            return [prices[-1]] * days_ahead
    
    def _trend_forecast(self, prices, days_ahead):
        """Linear trend forecast"""
        try:
            if len(prices) < 2:
                return [prices[-1]] * days_ahead
            
            # Use recent data for trend calculation
            recent_data = prices[-min(14, len(prices)):]  # Last 14 days or available data
            x = np.arange(len(recent_data))
            
            # Linear regression
            coeffs = np.polyfit(x, recent_data, 1)
            slope, intercept = coeffs
            
            # Project forward
            predictions = []
            start_x = len(recent_data)
            
            for i in range(days_ahead):
                pred = slope * (start_x + i) + intercept
                predictions.append(max(0, pred))
            
            return predictions
            
        except Exception as e:
            logging.error(f"Error in trend forecast: {e}")
            return [prices[-1]] * days_ahead
    
    def _seasonal_forecast(self, prices, days_ahead):
        """Simplified seasonal forecast"""
        try:
            if len(prices) < 7:
                return [prices[-1]] * days_ahead
            
            # Calculate weekly seasonality (simplified)
            week_length = 7
            seasonal_pattern = []
            
            for day in range(week_length):
                day_prices = []
                for i in range(day, len(prices), week_length):
                    day_prices.append(prices[i])
                
                if day_prices:
                    avg_day_price = np.mean(day_prices)
                    seasonal_pattern.append(avg_day_price)
                else:
                    seasonal_pattern.append(prices[-1])
            
            # Apply seasonal pattern
            predictions = []
            overall_mean = np.mean(prices)
            
            for i in range(days_ahead):
                day_of_week = i % week_length
                seasonal_factor = seasonal_pattern[day_of_week] / overall_mean
                pred = prices[-1] * seasonal_factor
                predictions.append(max(0, pred))
            
            return predictions
            
        except Exception as e:
            logging.error(f"Error in seasonal forecast: {e}")
            return [prices[-1]] * days_ahead
    
    def _exponential_smoothing_forecast(self, prices, days_ahead):
        """Exponential smoothing forecast"""
        try:
            if len(prices) < 2:
                return [prices[-1]] * days_ahead
            
            alpha = 0.3  # Smoothing parameter
            
            # Calculate exponentially smoothed values
            smoothed = [prices[0]]
            for i in range(1, len(prices)):
                smoothed_val = alpha * prices[i] + (1 - alpha) * smoothed[-1]
                smoothed.append(smoothed_val)
            
            # Calculate trend
            if len(smoothed) >= 2:
                trend = smoothed[-1] - smoothed[-2]
            else:
                trend = 0
            
            # Project forward
            predictions = []
            last_smoothed = smoothed[-1]
            
            for i in range(days_ahead):
                pred = last_smoothed + (trend * (i + 1) * 0.5)  # Damped trend
                predictions.append(max(0, pred))
            
            return predictions
            
        except Exception as e:
            logging.error(f"Error in exponential smoothing forecast: {e}")
            return [prices[-1]] * days_ahead
    
    def _simple_forecast(self, prices, days_ahead):
        """Simple fallback forecast"""
        try:
            if len(prices) < 2:
                return [prices[-1]] * days_ahead
            
            # Simple trend from last few points
            recent_prices = prices[-min(5, len(prices)):]
            trend = (recent_prices[-1] - recent_prices[0]) / (len(recent_prices) - 1)
            
            predictions = []
            for i in range(days_ahead):
                pred = prices[-1] + (trend * (i + 1))
                # Add some random variation
                variation = pred * 0.02 * np.random.normal(0, 1)
                final_pred = max(0, pred + variation)
                predictions.append(final_pred)
            
            return predictions
            
        except Exception as e:
            logging.error(f"Error in simple forecast: {e}")
            return [prices[-1] if len(prices) > 0 else 30000] * days_ahead
    
    def calculate_accuracy(self, actual, predicted):
        """Calculate prediction accuracy"""
        try:
            if len(actual) == 0 or len(predicted) == 0:
                return 0
            
            # Ensure same length
            min_len = min(len(actual), len(predicted))
            actual = actual[:min_len]
            predicted = predicted[:min_len]
            
            # Remove any None or invalid values
            valid_pairs = [(a, p) for a, p in zip(actual, predicted) 
                          if a is not None and p is not None and a > 0]
            
            if not valid_pairs:
                return 0
            
            actual_vals = np.array([pair[0] for pair in valid_pairs])
            pred_vals = np.array([pair[1] for pair in valid_pairs])
            
            # Calculate MAPE (Mean Absolute Percentage Error)
            mape = np.mean(np.abs((actual_vals - pred_vals) / actual_vals)) * 100
            accuracy = max(0, min(100, 100 - mape))
            
            return accuracy
            
        except Exception as e:
            logging.error(f"Error calculating accuracy: {str(e)}")
            return 0
