# Ark Telemetry Project Overview

## What is Ark Telemetry?

Ark Telemetry is a comprehensive observability and monitoring stack designed specifically for the Ark Bitcoin protocol server (arkd). It provides a complete solution for collecting, storing, visualizing, and alerting on metrics, logs, and traces from Ark deployments. The system is built on industry-standard open-source tools and follows modern observability best practices.

## Purpose

The primary purpose of ark-telemetry is to provide operators of Ark servers with complete visibility into their system's health, performance, and behavior. As arkd is alpha software handling Bitcoin transactions and liquidity, comprehensive monitoring is critical for:

- **Service Health Monitoring**: Track whether arkd is running and responding correctly
- **Performance Analysis**: Identify bottlenecks in round execution, transaction processing, and RPC handlers
- **Resource Management**: Monitor CPU, memory, disk, and network usage to prevent resource exhaustion
- **Incident Response**: Receive immediate alerts when issues occur and have the data needed for troubleshooting
- **Capacity Planning**: Historical metrics help predict when scaling or optimization is needed

## Key Features

### Comprehensive Metrics Collection

Ark-telemetry collects three categories of metrics:

1. **Host Metrics**: CPU utilization, memory usage, disk I/O, network traffic, and filesystem statistics
2. **Application Metrics**: Ark-specific metrics including RPC latencies, request/response sizes, Go runtime statistics, and custom business metrics
3. **Container Metrics**: Resource usage per container via cAdvisor, essential for containerized deployments

### Centralized Observability Hub

The OpenTelemetry Collector serves as the central hub for all telemetry data. This architecture provides:

- Single point of integration for Ark services
- Flexible data processing and routing
- Support for multiple protocols (OTLP gRPC, OTLP HTTP)
- Easy addition of new exporters and receivers

### Real-Time Visualization

Grafana dashboards provide immediate insight into system behavior with:

- Five pre-configured dashboards covering host, application, and container metrics
- Customizable time ranges and filters
- Combined metric visualization from multiple sources
- Default home dashboard for quick health checks

### Proactive Alerting

The alerting system detects and notifies operators of issues before they become critical:

- Service availability monitoring (ServiceMissing alert)
- Resource threshold alerts (HighMachineCPUUsage)
- Slack integration for immediate notification
- Alert resolution notifications when issues are fixed

### Production-Ready Infrastructure

The stack is designed for production use with:

- Persistent storage for metrics, logs, and configurations
- Data retention policies (15 days for Prometheus, 15 days for Loki)
- Docker Compose orchestration for easy deployment
- Security considerations (localhost-only access for Grafana)

## Architecture Highlights

The system uses a hub-and-spoke architecture with the OpenTelemetry Collector at the center:

- **Ark → OTel Collector**: Application sends metrics, traces, and logs via OTLP
- **OTel Collector → Prometheus**: Metrics are exposed for scraping
- **OTel Collector → Jaeger**: Distributed traces are forwarded
- **OTel Collector → Loki**: Logs are exported
- **Prometheus → Alertmanager**: Alert rules trigger notifications
- **Grafana**: Queries all data sources for unified visualization

This architecture decouples data collection from storage and visualization, making the system flexible and maintainable.

## Technology Stack

- **OpenTelemetry Collector**: Vendor-neutral telemetry data pipeline
- **Prometheus**: Time-series metrics storage and query engine
- **Grafana**: Multi-source data visualization platform
- **Loki**: Log aggregation and query system
- **Jaeger**: Distributed tracing backend
- **Alertmanager**: Alert routing and notification delivery
- **cAdvisor**: Container resource metrics collection

## Use Cases

### Operations Team

Monitor production Ark deployments, receive alerts for service disruptions, and investigate incidents using historical metrics and logs.

### Development Team

Profile application performance, identify slow RPC methods, optimize resource usage, and validate that new features don't introduce performance regressions.

### Infrastructure Team

Track host resource utilization, plan capacity upgrades, identify container resource limits, and optimize Docker configurations.

## Getting Started

The entire stack can be deployed with a single command:

```bash
SLACK_API_URL='https://hooks.slack.com/services/YOUR/WEBHOOK' \
SLACK_CHANNEL='#your-channel' \
make docker-run
```

This starts all services with proper configuration, sets up Slack alerting, and makes Grafana available on localhost:3333.

## Integration with Ark

Ark-telemetry is designed to work seamlessly with arkd. The Ark server exports metrics in OpenTelemetry format, which are automatically collected and visualized. No code changes are required in arkd - simply point it to the OTel Collector endpoint (default: localhost:4317).

## Current Status

The project is actively maintained and production-ready for monitoring Ark deployments on regtest, testnet, signet, mutinynet, and mainnet networks. The stack is containerized for easy deployment and includes comprehensive documentation.

For detailed information on components, configuration, and operations, see the related documentation in this system directory.
