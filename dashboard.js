// Dashboard JavaScript - Professional Analytics Dashboard

class OnionDashboard {
    constructor() {
        this.chart = null;
        this.refreshInterval = null;
        this.realTimeInterval = null;
        this.isMonitoring = false;
        
        this.init();
    }
    
    init() {
        this.initChart();
        this.bindEvents();
        this.startAutoRefresh();
        this.updateDateTime();
        this.setDefaultDates();
    }
    
    setDefaultDates() {
        // Set default date range to last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }
    
    initChart() {
        const ctx = document.getElementById('priceChart');
        if (!ctx) {
            console.error('Chart canvas not found');
            return;
        }
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Actual Price',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'LSTM Prediction',
                        data: [],
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: '#059669',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value === null || value === undefined) return null;
                                return context.dataset.label + ': Rp' + 
                                       new Intl.NumberFormat('id-ID').format(value);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            borderDash: [2, 2]
                        },
                        ticks: {
                            maxTicksLimit: 10,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Price (IDR)',
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            borderDash: [2, 2]
                        },
                        ticks: {
                            callback: function(value) {
                                return 'Rp' + new Intl.NumberFormat('id-ID', {
                                    notation: 'compact',
                                    maximumFractionDigits: 0
                                }).format(value);
                            },
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#ffffff'
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
        
        // Load initial chart data
        this.loadChartData();
    }
    
    async loadChartData() {
        try {
            this.showChartLoading(true);
            
            const province = document.getElementById('provinceFilter').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            const params = new URLSearchParams();
            if (province && province !== 'all') params.append('province', province);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const response = await fetch(`/api/chart_data?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.error('Chart data error:', data.error);
                this.showError('Failed to load chart data: ' + data.error);
                return;
            }
            
            // Update chart data
            this.chart.data.labels = data.labels || [];
            this.chart.data.datasets[0].data = data.actual || [];
            this.chart.data.datasets[1].data = data.predicted || [];
            
            this.chart.update('active');
            
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showError('Failed to load chart data. Please check your connection and try again.');
        } finally {
            this.showChartLoading(false);
        }
    }
    
    showChartLoading(show) {
        const chartContainer = document.querySelector('.chart-container');
        if (!chartContainer) return;
        
        if (show) {
            chartContainer.classList.add('loading');
        } else {
            chartContainer.classList.remove('loading');
        }
    }
    
    async updateFilters() {
        try {
            const province = document.getElementById('provinceFilter').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            const params = new URLSearchParams();
            if (province && province !== 'all') params.append('province', province);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            const response = await fetch(`/api/update_filters?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.error('Filter update error:', data.error);
                this.showError('Failed to update filters: ' + data.error);
                return;
            }
            
            // Update KPIs
            this.updateKPIs(data.kpis);
            
            // Update recent data table
            this.updateDataTable(data.recent_data);
            
            // Update alerts
            this.updateAlerts(data.alerts);
            
            // Reload chart data
            this.loadChartData();
            
            this.showSuccess('Filters updated successfully');
            
        } catch (error) {
            console.error('Error updating filters:', error);
            this.showError('Failed to update filters. Please try again.');
        }
    }
    
    updateKPIs(kpis) {
        if (!kpis) return;
        
        const kpiValues = document.querySelectorAll('.kpi-value');
        if (kpiValues.length >= 4) {
            kpiValues[0].textContent = kpis.total_records || 0;
            kpiValues[1].textContent = (kpis.price_volatility || 0) + '%';
            kpiValues[2].textContent = 'Rp' + new Intl.NumberFormat('id-ID').format(kpis.avg_price || 0);
            kpiValues[3].textContent = (kpis.prediction_accuracy || 0) + '%';
        }
    }
    
    updateDataTable(recentData) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        if (!recentData || recentData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No data available</td></tr>';
            return;
        }
        
        const rows = recentData.map(row => `
            <tr>
                <td>${row.Date || 'N/A'}</td>
                <td class="text-truncate" style="max-width: 120px;">${row.Provinsi || 'N/A'}</td>
                <td>Rp${row.Harga ? new Intl.NumberFormat('id-ID').format(row.Harga) : 'N/A'}</td>
                <td><span class="badge bg-success">Normal</span></td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = rows;
    }
    
    updateAlerts(alerts) {
        const alertsContainer = document.querySelector('.alerts-card .card-body');
        if (!alertsContainer) return;
        
        if (!alerts || alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-shield-alt text-success"></i>
                    <p>No recent alerts. System operating normally.</p>
                </div>
            `;
            return;
        }
        
        const alertItems = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-icon">
                    <i class="fas fa-exclamation-triangle text-${alert.type === 'High' ? 'danger' : 'warning'}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-message">${alert.type} Confidence: ${alert.message}</div>
                    <div class="alert-details">Price: Rp${new Intl.NumberFormat('id-ID').format(alert.price)} • ${alert.date}</div>
                </div>
                <div class="alert-time">Recent</div>
            </div>
        `).join('');
        
        alertsContainer.innerHTML = alertItems;
    }
    
    bindEvents() {
        // Filter change events
        const provinceFilter = document.getElementById('provinceFilter');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (provinceFilter) {
            provinceFilter.addEventListener('change', () => {
                this.debounce(() => this.updateFilters(), 500)();
            });
        }
        
        if (startDate) {
            startDate.addEventListener('change', () => {
                this.debounce(() => this.updateFilters(), 500)();
            });
        }
        
        if (endDate) {
            endDate.addEventListener('change', () => {
                this.debounce(() => this.updateFilters(), 500)();
            });
        }
        
        // Monitoring controls
        const startBtn = document.getElementById('startMonitoring');
        const pauseBtn = document.getElementById('pauseDetection');
        const refreshBtn = document.getElementById('refreshChart');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.toggleMonitoring());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseMonitoring());
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadChartData());
        }
        
        // Time filter badges
        const timeFilters = document.querySelectorAll('.time-filter .badge');
        timeFilters.forEach(badge => {
            badge.addEventListener('click', (e) => this.handleTimeFilter(e));
        });
        
        // Sensitivity slider
        const sensitivitySlider = document.getElementById('sensitivity');
        if (sensitivitySlider) {
            sensitivitySlider.addEventListener('input', (e) => {
                this.updateSensitivityIndicator(e.target.value);
            });
            // Initialize indicator position
            this.updateSensitivityIndicator(sensitivitySlider.value);
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    handleTimeFilter(e) {
        // Remove active class from all badges
        document.querySelectorAll('.time-filter .badge').forEach(b => {
            b.classList.remove('bg-primary');
            b.classList.add('bg-outline-secondary');
        });
        
        // Add active class to clicked badge
        e.target.classList.remove('bg-outline-secondary');
        e.target.classList.add('bg-primary');
        
        // Set date filters based on selection
        const filterType = e.target.textContent.trim();
        const endDate = new Date();
        let startDate = new Date();
        
        switch(filterType) {
            case 'Last Hour':
                startDate.setHours(endDate.getHours() - 1);
                break;
            case 'Last 24h':
                startDate.setDate(endDate.getDate() - 1);
                break;
            default:
                return; // Custom - let user set dates manually
        }
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        
        this.updateFilters();
    }
    
    updateSensitivityIndicator(value) {
        const indicator = document.querySelector('.slider-indicator');
        if (indicator) {
            const percentage = ((value - 1) / 9) * 100;
            indicator.style.left = percentage + '%';
        }
    }
    
    toggleMonitoring() {
        const btn = document.getElementById('startMonitoring');
        if (!btn) return;
        
        this.isMonitoring = !this.isMonitoring;
        
        if (this.isMonitoring) {
            btn.innerHTML = '<i class="fas fa-stop"></i> Stop Monitoring';
            btn.classList.add('btn-warning');
            btn.classList.remove('btn-primary');
            this.startRealTimeUpdates();
            this.showSuccess('Real-time monitoring started');
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Start Real-time Monitoring';
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-primary');
            this.stopRealTimeUpdates();
            this.showSuccess('Real-time monitoring stopped');
        }
    }
    
    pauseMonitoring() {
        const btn = document.getElementById('pauseDetection');
        if (!btn) return;
        
        const isPaused = btn.textContent.includes('Resume');
        
        if (isPaused) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pause Detection';
            this.startAutoRefresh();
            this.showSuccess('Detection resumed');
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Resume Detection';
            this.stopAutoRefresh();
            this.showSuccess('Detection paused');
        }
    }
    
    startRealTimeUpdates() {
        // Simulate real-time updates
        this.realTimeInterval = setInterval(() => {
            this.loadChartData();
            this.updateFilters();
        }, 10000); // Update every 10 seconds
    }
    
    stopRealTimeUpdates() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }
    }
    
    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        this.refreshInterval = setInterval(() => {
            this.loadChartData();
        }, 60000); // Refresh every 60 seconds
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    updateDateTime() {
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('id-ID');
            // Update any time displays if needed
        }, 1000);
    }
    
    showError(message) {
        this.showNotification(message, 'danger', 5000);
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success', 3000);
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existingAlerts = document.querySelectorAll('.notification-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new notification
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed notification-alert`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        
        const iconMap = {
            'success': 'fas fa-check-circle',
            'danger': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };
        
        alertDiv.innerHTML = `
            <i class="${iconMap[type] || iconMap.info}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after duration
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new OnionDashboard();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add loading states to buttons with debouncing
    document.querySelectorAll('button:not(.btn-close)').forEach(btn => {
        let clickTimeout;
        btn.addEventListener('click', function() {
            if (!this.disabled && !this.classList.contains('no-loading')) {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                this.disabled = true;
                
                // Clear existing timeout
                if (clickTimeout) {
                    clearTimeout(clickTimeout);
                }
                
                // Reset button after delay
                clickTimeout = setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 1500);
            }
        });
    });
    
    // Handle mobile sidebar toggle
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'btn btn-outline-primary d-md-none position-fixed';
    sidebarToggle.style.cssText = 'top: 20px; left: 20px; z-index: 1001;';
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    sidebarToggle.addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('show');
    });
    
    if (window.innerWidth <= 768) {
        document.body.appendChild(sidebarToggle);
    }
});

// Handle window resize for chart responsiveness
window.addEventListener('resize', function() {
    if (window.dashboard && window.dashboard.chart) {
        window.dashboard.chart.resize();
    }
    
    // Handle mobile sidebar toggle button
    const toggleBtn = document.querySelector('button[style*="z-index: 1001"]');
    if (window.innerWidth <= 768) {
        if (!toggleBtn) {
            const sidebarToggle = document.createElement('button');
            sidebarToggle.className = 'btn btn-outline-primary d-md-none position-fixed';
            sidebarToggle.style.cssText = 'top: 20px; left: 20px; z-index: 1001;';
            sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
            
            sidebarToggle.addEventListener('click', function() {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.toggle('show');
            });
            
            document.body.appendChild(sidebarToggle);
        }
    } else if (toggleBtn) {
        toggleBtn.remove();
    }
});

// Export for global access
window.OnionDashboard = OnionDashboard;
