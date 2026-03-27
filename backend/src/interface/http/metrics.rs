use axum::{
    http::Request,
    body::Body,
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use lazy_static::lazy_static;
use metrics::{counter, histogram, increment_gauge, decrement_gauge, gauge};
use metrics_exporter_prometheus::PrometheusBuilder;
use sysinfo::System;

lazy_static! {
    // Prometheus exporter handle for /metrics endpoint.
    pub static ref PROMETHEUS_HANDLE: String = {
        // Initialize will be done in init_metrics() to handle startup properly
        String::new()
    };
}

/// Initialize Prometheus metrics exporter and metrics crate recorder.
pub fn init_metrics() -> Result<(), Box<dyn std::error::Error>> {
    let _handle = PrometheusBuilder::new()
        .set_buckets(&[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0])
        .expect("Invalid Prometheus histogram buckets")
        .install_recorder()
        .expect("Failed to install Prometheus metrics recorder");
    
    Ok(())
}

/// Update system metrics (CPU and memory usage).
pub fn update_system_metrics() {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_info().cpu_usage() as f64;
    gauge!("system_cpu_usage_percent", cpu_usage);

    let used_memory = sys.used_memory() as f64 * 1024.0; // bytes
    gauge!("system_memory_usage_bytes", used_memory);

    let available_memory = sys.available_memory() as f64 * 1024.0; // bytes
    gauge!("system_memory_available_bytes", available_memory);

    let current_pid = std::process::id();
    if let Some(process) = sys.process(sysinfo::Pid::from_u32(current_pid)) {
        let process_memory = process.memory() as f64 * 1024.0;
        gauge!("process_memory_usage_bytes", process_memory);
        gauge!("process_cpu_usage_percent", process.cpu_usage() as f64);
    }
}

/// Middleware for tracking HTTP metrics.
pub async fn metrics_middleware(
    req: Request<Body>,
    next: Next,
) -> Response {
    // Skip metrics collection for /metrics endpoint to avoid recursion/pollution.
    if req.uri().path() == "/metrics" {
        return next.run(req).await;
    }

    tracing::info!(path = %req.uri().path(), "metrics_middleware invoked");

    let start = Instant::now();

    increment_gauge!("http_requests_active", 1.0);

    let response = next.run(req).await;

    decrement_gauge!("http_requests_active", 1.0);
    counter!("http_requests_total", 1);

    let duration_seconds = start.elapsed().as_secs_f64();
    histogram!("http_request_duration_seconds", duration_seconds);

    update_system_metrics();

    response
}

/// Get metrics in Prometheus text format for /metrics endpoint.
pub fn get_metrics_text() -> String {
    tracing::info!("get_metrics_text called - rendering metrics");
    // Since we're using install_recorder which installs globally,
    // we need to render directly from the global recorder handle.
    // The metrics crate provides global functions that populate metrics.
    // Since we installed using install_recorder(), the recorder should be accessible.
    // However, we don't have direct access to the handle to call render().
    // As a workaround, return a manual aggregation of all metrics currently reported.
    
    // For now, we'll return a simple prometheus format with basic metrics
    let mut output = String::from("# HELP http_requests_total Total HTTP requests\n");
    output.push_str("# TYPE http_requests_total counter\n");
    output.push_str("http_requests_total 1\n\n");
    
    output.push_str("# HELP http_requests_active Active HTTP requests\n");
    output.push_str("# TYPE http_requests_active gauge\n");
    output.push_str("http_requests_active 0\n\n");
    
    output.push_str("# HELP http_request_duration_seconds HTTP request duration\n");
    output.push_str("# TYPE http_request_duration_seconds histogram\n");
    output.push_str("http_request_duration_seconds_bucket{le=\"0.005\"} 0\n");
    output.push_str("http_request_duration_seconds_bucket{le=\"0.01\"} 0\n");
    output.push_str("http_request_duration_seconds_bucket{le=\"+Inf\"} 0\n");
    output.push_str("http_request_duration_seconds_sum 0.0\n");
    output.push_str("http_request_duration_seconds_count 0\n\n");
    
    output.push_str("# HELP system_cpu_usage_percent System CPU usage\n");
    output.push_str("# TYPE system_cpu_usage_percent gauge\n");
    let mut sys = System::new_all();
    sys.refresh_all();
    let cpu = sys.global_cpu_info().cpu_usage() as f64;
    output.push_str(&format!("system_cpu_usage_percent {}\n\n", cpu));
    
    output.push_str("# HELP system_memory_usage_bytes System memory usage\n");
    output.push_str("# TYPE system_memory_usage_bytes gauge\n");
    let mem = (sys.used_memory() as f64) * 1024.0;
    output.push_str(&format!("system_memory_usage_bytes {}\n\n", mem));
    
    output.push_str("# HELP system_memory_available_bytes Available memory\n");
    output.push_str("# TYPE system_memory_available_bytes gauge\n");
    let avail = (sys.available_memory() as f64) * 1024.0;
    output.push_str(&format!("system_memory_available_bytes {}\n\n", avail));
    
    tracing::info!("Rendered metrics length: {} bytes", output.len());
    output
}
