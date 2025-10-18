# Adding and Modifying Dashboards - SOP

## Overview

This guide provides procedures for creating, modifying, and backing up Grafana dashboards in ark-telemetry. Dashboards provide visual monitoring of host metrics, application performance, and container resources.

**Reference Documentation:**
- Dashboards: `/docs/projects/ark-telemetry/system/dashboards.md`
- Configuration: `/docs/projects/ark-telemetry/system/configuration.md`

## Prerequisites

- [ ] Grafana running at http://localhost:3333
- [ ] Prometheus data source configured
- [ ] Basic understanding of PromQL
- [ ] Familiarity with Grafana UI

## Procedure: Creating a New Dashboard

### Step 1: Plan Dashboard Content

**Define dashboard purpose and panels:**

1. **Dashboard Name**: Descriptive title (e.g., "Ark Round Metrics", "Wallet Health")
2. **Target Audience**: Who will use it? (operators, developers, QA)
3. **Key Metrics**: List 3-7 most important metrics to visualize
4. **Panel Types**: Choose visualization types (time series, gauge, stat, table)
5. **Update Frequency**: Determine appropriate time range and refresh interval

**Example Dashboard Plan:**

```
Dashboard: Ark Round Performance
Target: Operators monitoring round execution
Metrics:
  - Round completion time (time series)
  - Rounds per hour (stat)
  - Failed rounds (time series)
  - Participants per round (histogram)
  - Round size in bytes (gauge)
```

### Step 2: Create Dashboard in Grafana UI

**Navigate to Grafana:**

```bash
open http://localhost:3333
```

**Create new dashboard:**

1. Click "+" icon in left sidebar
2. Select "Dashboard"
3. Click "Add visualization"
4. Select "Prometheus" as data source

### Step 3: Add Panels

**For each panel:**

1. **Configure Query:**
   - Enter PromQL expression in query field
   - Use "Code" mode for complex queries
   - Click "Run queries" to preview data

2. **Choose Visualization:**
   - Time Series: Trends over time
   - Gauge: Current value with thresholds
   - Stat: Single value display
   - Table: Tabular data display
   - Pie Chart: Distribution visualization

3. **Configure Panel Settings:**
   - Title: Clear, descriptive name
   - Description: Explain what metric shows and why it matters
   - Unit: Select appropriate unit (bytes, percent, seconds, etc.)
   - Decimals: Set precision (usually 2)
   - Legend: Configure legend format and placement

4. **Set Thresholds (optional):**
   - Green: Normal range
   - Yellow: Warning threshold
   - Red: Critical threshold

5. **Click "Apply" to save panel**

**Example Panel Configuration:**

```
Panel: Round Completion Time
Query: histogram_quantile(0.95, rate(ark_round_duration_seconds_bucket[5m]))
Visualization: Time Series
Unit: seconds (s)
Decimals: 2
Description: "95th percentile round completion time. Values >30s may indicate performance issues."
Thresholds:
  - Green: 0-10s
  - Yellow: 10-30s
  - Red: >30s
```

### Step 4: Organize Dashboard Layout

**Arrange panels for optimal readability:**

1. **Grid Layout**: Drag panels to position
2. **Resize**: Drag bottom-right corner
3. **Standard Sizes**:
   - Full width: 24 units
   - Half width: 12 units
   - Third width: 8 units
   - Quarter width: 6 units
4. **Height**: Typically 8-12 units per panel

**Best Practices:**
- Place most critical metrics at top
- Group related metrics together
- Use consistent panel heights in each row
- Leave no gaps (fills entire 24-unit width)

### Step 5: Configure Dashboard Settings

**Click gear icon (Dashboard settings):**

1. **General:**
   - Name: Set dashboard title
   - Description: Brief overview of dashboard purpose
   - Tags: Add tags for categorization (e.g., "ark", "performance", "custom")
   - Timezone: "Browser" (default) or specific timezone

2. **Time Options:**
   - Default time range: "Last 6 hours" (typical)
   - Auto-refresh: "30s" or "1m" for operational dashboards
   - Hide time picker: Usually leave enabled

3. **Variables (optional):**
   - Add variables for filtering (e.g., by instance, job, namespace)
   - Use in queries: `$variable_name`

### Step 6: Save Dashboard

1. Click "Save dashboard" icon (top-right)
2. Enter commit message (optional but recommended)
3. Click "Save"

**Dashboard is now persisted in grafana_data volume**

## Procedure: Modifying Existing Dashboard

### Option A: Edit Provisioned Dashboard (Read-Only)

**Provisioned dashboards** (from `/dashboards/` directory) are read-only in Grafana UI.

**To modify:**

1. **Create a Copy:**
   - Open provisioned dashboard
   - Click "Save dashboard" → "Save as..."
   - Give new name (e.g., "Host Metrics - Custom")
   - Edit the copy

2. **Or Edit Source File:**
   - Locate JSON file in `${ARK_TELEMETRY_REPO}/dashboards/`
   - Edit JSON directly (advanced)
   - Restart Grafana: `docker restart grafana`

### Option B: Edit Custom Dashboard

**For dashboards created in UI:**

1. Navigate to dashboard
2. Click panel title → "Edit"
3. Modify query, visualization, or settings
4. Click "Apply"
5. Click "Save dashboard"

**Undo changes:**
- Click "Dashboard settings" → "Versions"
- Select previous version and click "Restore"

## Procedure: Backing Up Dashboards

### Method 1: Using Backup Script

**Configure environment:**

```bash
export GRAFANA_URL="http://localhost:3333"
export GRAFANA_API_KEY="your-api-key-here"
```

**Generate API key (if needed):**

1. Navigate to http://localhost:3333/org/apikeys
2. Click "Add API key"
3. Name: "Backup Script"
4. Role: "Viewer"
5. Click "Add"
6. Copy key and save securely

**Run backup script:**

```bash
cd ${ARK_TELEMETRY_REPO}
./scripts/backup_grafana.sh
```

**Output:**
```
Starting Grafana dashboard backup...
Using Grafana URL: http://localhost:3333
Exporting: Host Metrics
Exporting: Ark Go Metrics
Exporting: Cadvisor Exporter
Exporting: RPC Latency
Exporting: RPC Request Response Size
Backup completed successfully!
Backup location: grafana_backup
```

**Backup includes:**
- All dashboards as JSON files
- Provisioning configuration
- Data source configuration

### Method 2: Manual Export

**Export single dashboard:**

1. Open dashboard in Grafana
2. Click "Dashboard settings" (gear icon)
3. Click "JSON Model" in left sidebar
4. Copy entire JSON content
5. Save to file: `<dashboard-name>.json`

**Export from API:**

```bash
# List all dashboards
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3333/api/search?type=dash-db

# Export specific dashboard by UID
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3333/api/dashboards/uid/<dashboard-uid> \
  | jq '.dashboard' > backup.json
```

## Procedure: Importing Dashboards

### Method 1: Import from Grafana UI

1. Click "+" icon → "Import"
2. Choose import method:
   - **Upload JSON file**: Click "Upload JSON file" button
   - **Paste JSON**: Copy JSON and paste into text area
   - **Grafana.com Dashboard**: Enter dashboard ID (e.g., 1860)
3. Configure settings:
   - Name: Dashboard title
   - Folder: Select folder or leave default
   - UID: Auto-generated or custom
4. Select Prometheus data source
5. Click "Import"

### Method 2: Add to Provisioning

**Add dashboard to automatic provisioning:**

1. Copy JSON file to `${ARK_TELEMETRY_REPO}/dashboards/`
2. Ensure JSON structure is correct (dashboard model only, no wrapper)
3. Restart Grafana: `docker restart grafana`
4. Dashboard appears automatically

**Example JSON structure for provisioning:**

```json
{
  "annotations": { ... },
  "editable": true,
  "panels": [ ... ],
  "title": "Your Dashboard Name",
  "uid": "unique-id",
  "version": 1
}
```

## Checklist: Creating New Dashboard

- [ ] Dashboard purpose clearly defined
- [ ] Target metrics identified (3-7 key metrics)
- [ ] PromQL queries tested in Prometheus UI
- [ ] Appropriate visualization types selected
- [ ] Panel titles are descriptive and clear
- [ ] Panel descriptions explain metrics and context
- [ ] Units configured correctly (bytes, percent, ms, etc.)
- [ ] Thresholds set for gauges and stats
- [ ] Panels arranged logically (critical metrics at top)
- [ ] Grid layout fills full width (24 units)
- [ ] Dashboard settings configured (name, tags, time range)
- [ ] Dashboard saved with commit message
- [ ] Dashboard tested with auto-refresh enabled
- [ ] Backup created (JSON export or backup script)

## Common Dashboard Patterns

### Time Series with Multiple Metrics

```
Query 1: rate(ark_cpu_classes_user_cpu_seconds_total[5m]) * 100
Legend: User CPU (%)

Query 2: rate(ark_cpu_classes_gc_cpu_seconds_total[5m]) * 100
Legend: GC CPU (%)

Visualization: Time Series
Unit: Percent (0-100)
```

### Gauge with Thresholds

```
Query: (system_memory_usage_bytes{state="used"} /
        sum(system_memory_usage_bytes)) * 100

Visualization: Gauge
Unit: Percent (0-100)
Thresholds:
  - 0-70: Green
  - 70-85: Yellow
  - 85-100: Red
```

### Stat Panel (Single Value)

```
Query: ark_service_up

Visualization: Stat
Mappings:
  - 0 → "DOWN" (red)
  - 1 → "UP" (green)
```

## Troubleshooting

**No data displayed in panels:**
- Verify Prometheus data source is working: Dashboard Settings → Data Sources
- Check PromQL query syntax in Prometheus UI
- Verify time range includes available data
- Check if metric exists: http://localhost:9090/api/v1/label/__name__/values

**Dashboard changes not persisting:**
- Verify you clicked "Save dashboard" (not just "Apply")
- Check Grafana logs: `docker logs grafana`
- Ensure sufficient disk space for grafana_data volume

**Backup script fails:**
- Verify GRAFANA_URL is correct
- Verify GRAFANA_API_KEY is valid (check expiration)
- Check network connectivity: `curl http://localhost:3333/api/health`
- Ensure jq and curl are installed

**Dashboard import fails:**
- Verify JSON is valid (use jq to validate)
- Check for version compatibility issues
- Ensure data source exists with correct name
- Remove auto-generated "id" field from JSON (conflicts with existing dashboards)
