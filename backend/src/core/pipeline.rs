use axum::http::Request;
use crate::core::anomaly::SystemResult;
use async_trait::async_trait;

/// Trạm xử lý trong pipeline
#[async_trait]
pub trait PipelineStation<B>: Send + Sync {
    async fn process(&self, req: &mut Request<B>) -> SystemResult<()>;
}

/// Bộ xử lý pipeline
pub struct RequestPipeline<B> {
    stations: Vec<Box<dyn PipelineStation<B>>>,
}

impl<B> RequestPipeline<B> {
    pub fn new() -> Self {
        Self { stations: Vec::new() }
    }

    pub fn add_station(&mut self, station: impl PipelineStation<B> + 'static) {
        self.stations.push(Box::new(station));
    }

    pub async fn execute(&self, req: &mut Request<B>) -> SystemResult<()> {
        for station in &self.stations {
            station.process(req).await?;
        }
        Ok(())
    }
}

impl<B> Default for RequestPipeline<B> {
    fn default() -> Self {
        Self::new()
    }
}
