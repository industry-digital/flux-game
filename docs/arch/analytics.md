# Flux World Analytics - Grafana + ClickHouse Project

## Project Overview
This is a spatial-temporal analytics system for the Flux virtual world game. We're building real-time monitoring dashboards for:
- Atmospheric conditions (temperature, pressure, humidity, precipitation) across virtual world locations
- Resource distribution and depletion patterns
- Player movement and ecosystem interactions
- WorldEvent stream analytics

## Strategic Rationale: From Black Box to Observable World

### The Complexity Challenge

Flux implements sophisticated simulation systems that create emergent gameplay:

**World Generation Complexity:**
- 14.5km × 9km worlds with Golden Ratio ecosystem bleeding (φ ≈ 1.618)
- Continuous river flow patterns with diagonal intersection optimization
- Six ecosystem types with natural transition zones (38.2% pure, 61.8% bleeding)
- Gaussian dithering for realistic biome boundaries

**Weather System Complexity:**
- Anti-equilibrium atmospheric physics preventing convergence to boring stable states
- Biologically-informed easing functions (thermal mass, pressure momentum, moisture nucleation)
- Seasonal cycling with 42 proven mathematical properties
- Real-time weather evolution affecting all other game systems

**Resource System Complexity:**
- Ecosystem-specific resource generation tied to weather patterns
- Dynamic regeneration cycles preventing permanent depletion
- Weather-dependent availability creating scarcity and abundance cycles

### The Operational Problem

**Without analytics, you're flying a Formula 1 car with no dashboard.**

These sophisticated systems create operational challenges:

1. **Invisible Failures**: Complex interactions can break in subtle ways that only become apparent when players complain
2. **Performance Mysteries**: Weather calculations across thousands of places, resource generation, and ecosystem interactions can create performance bottlenecks
3. **Balance Blindness**: No way to validate that mathematical models (Golden Ratio bleeding, anti-equilibrium weather) create good gameplay
4. **Development Friction**: Every system change requires manual testing across multiple ecosystems and weather conditions

### The Analytics Solution

**Transform your complex world from a black box into an observable, measurable system:**

#### 🔍 **Real-Time World Intelligence**
- **Weather Front Visualization**: Watch your anti-equilibrium weather systems create natural atmospheric dynamics
- **Resource Flow Monitoring**: Ensure regeneration cycles maintain sustainable gameplay across all ecosystems
- **Ecosystem Balance Tracking**: Verify Golden Ratio bleeding creates intended natural transitions

#### ⚡ **Proactive Problem Prevention**
- **Early Warning Systems**: Detect resource depletion, weather anomalies, or ecosystem imbalances before players notice
- **Performance Monitoring**: Track computation costs of complex weather/resource calculations
- **System Health Validation**: Prove your anti-equilibrium weather never reaches boring stable states

#### 🎮 **Data-Driven Game Balance**
- **Validate Design Assumptions**: Are your generated river paths creating good player flow?
- **Ecosystem Analysis**: Which biomes are players avoiding? Are some too resource-poor?
- **A/B Testing at Scale**: Test weather parameter changes across all 5 ecosystem types simultaneously

#### 🔧 **Development Acceleration**
- **Immediate Feedback**: See effects of system changes within seconds via real-time dashboards
- **Historical Validation**: Prove your mathematical models work at scale over time
- **Strategic Decision Making**: Base content placement and balance decisions on real behavior data

### Business Impact

**Operational Confidence:**
- Your sophisticated simulation systems work correctly at scale
- Complex mathematical models (Golden Ratio, anti-equilibrium) prove their worth
- Performance problems caught before they impact players

**Development Velocity:**
- Immediate feedback on system changes reduces testing overhead
- Data-driven decisions replace guesswork in balance adjustments
- Proactive problem detection prevents firefighting

**Player Experience:**
- Sustained engagement through verified anti-equilibrium systems
- Balanced resource availability across all ecosystem types
- Smooth performance from monitored complex calculations

**Strategic Value:**
- Demonstrate ROI of sophisticated simulation systems to stakeholders
- Enable confident iteration on complex mathematical models
- Transform complex systems from development risk into competitive advantage

## Core Architecture
- **World Server**: Game server that generates and batches WorldEvents → sends to ClickHouse
- **ClickHouse**: Time-series database receiving WorldEvent batches from World Server
- **Grafana**: Visualization dashboards consuming ClickHouse data
- **Docker Compose**: Containerized deployment for ClickHouse + Grafana only

## Data Flow

**From Complex Simulation to Operational Intelligence:**

```
Sophisticated World Systems:
┌─────────────────────────────────────────────────────────────────┐
│ Golden Ratio Ecosystem Bleeding + Anti-Equilibrium Weather +   │
│ Weather-Driven Resources + River Flow Connectivity             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Complex interactions require visibility
                      ▼
Analytics Pipeline:
World Server → WorldEvent batches → ClickHouse → Grafana Dashboards
                      │                    │              │
               • Weather events      • Materialized    • Real-time
               • Resource events       views             monitoring
               • Spatial data         • Fast queries    • Alerting
```

**The more sophisticated your simulation, the more critical analytics becomes for operational confidence.**

## Key Data Structures

### Place Entity
```typescript
type Place = {
  id: PlaceURN;
  coordinates: [number, number];  // Cartesian coordinates
  ecosystem: EcosystemURN;        // e.g., 'flux:eco:forest:temperate'
  weather: Weather;               // Current atmospheric conditions
  resources: ResourceNodes;       // Resource availability
};

type Weather = {
  temperature: number;    // Celsius
  pressure: number;       // hPa
  humidity: number;       // 0-100%
  precipitation: number;  // mm/hour
  ppfd: number;          // Photosynthetic flux
  clouds: number;        // 0-100%
  ts: number;            // Unix timestamp
};
```

### WorldEvent Stream (From World Server)
```typescript
type WorldEvent = {
  id: string;
  trace: string;
  ts: number;
  type: EventType;       // e.g., 'place:weather:changed', 'actor:moved'
  location: PlaceURN;
  actor?: ActorURN;
  payload: EventPayload; // Type-specific data
};

// World Server sends batches like:
type WorldEventBatch = WorldEvent[];
```

## Database Architecture

### Single Table + Materialized Views Design
- **Primary table**: `world_event` stores all WorldEvent types with full JSON payloads
- **Materialized views**: Auto-extract common query patterns using JSONExtract* at insert time
- **Query performance**: JSONExtract* cost paid once during insert, queries hit pre-computed columns
- **Data preservation**: Complete event history preserved for future analytics needs
- **Spatial enrichment**: Coordinates added during batch ingestion from World Server
- **Best of both worlds**: Fast queries + complete flexibility + simple integration

### Schema Pattern
```sql
-- One table to rule them all
CREATE TABLE world_event (
    id String,
    trace String,
    ts DateTime64(3),
    type String,
    location String, -- PlaceURN
    actor Nullable(String), -- ActorURN
    payload String, -- Full JSON payload preserved
    coordinates_x Nullable(Float64),
    coordinates_y Nullable(Float64),
    ecosystem Nullable(String),
    created_at DateTime64(3) DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (type, location, ts);

-- Materialized views extract specific data automatically at insert time
CREATE MATERIALIZED VIEW weather_event_mv AS
SELECT
    id, trace, ts, location, coordinates_x, coordinates_y, ecosystem,
    JSONExtractFloat(payload, 'to', 'temperature') as temperature,
    JSONExtractFloat(payload, 'to', 'pressure') as pressure,
    JSONExtractFloat(payload, 'to', 'humidity') as humidity,
    JSONExtractFloat(payload, 'to', 'precipitation') as precipitation,
    JSONExtractFloat(payload, 'to', 'ppfd') as ppfd,
    JSONExtractFloat(payload, 'to', 'clouds') as clouds,
    JSONExtractString(payload, 'narrative') as weather_narrative
FROM world_event
WHERE type = 'place:weather:changed';

CREATE MATERIALIZED VIEW resource_event_mv AS
SELECT
    id, trace, ts, location, actor, coordinates_x, coordinates_y, ecosystem,
    JSONExtractString(payload, 'resource', 'type') as resource_type,
    JSONExtractString(payload, 'resource', 'id') as resource_id,
    JSONExtractString(payload, 'action') as action,
    JSONExtractFloat(payload, 'quantity', 'before') as quantity_before,
    JSONExtractFloat(payload, 'quantity', 'after') as quantity_after
FROM world_event
WHERE type IN ('resource:depleted', 'resource:regenerated', 'resource:discovered');
```

### World Server Integration
- Send raw WorldEvent batches to single `world_event` table
- Enrich with spatial data (coordinates, ecosystem) during transformation
- Materialized views handle real-time data extraction automatically using JSONExtract*
- Complete JSON payload preservation for complete flexibility
- Error handling that doesn't block game logic

## Visualization Requirements

### Operational Monitoring Dashboards

#### **System Health Validation**
- Temperature heatmaps using coordinates from weather_event_mv → Verify anti-equilibrium weather across ecosystems
- Resource distribution by type and location from resource_event_mv → Monitor regeneration sustainability
- Atmospheric pressure systems from weather_event_mv → Validate pressure momentum prevents equilibrium
- Precipitation patterns from weather_event_mv → Confirm moisture nucleation effects working
- Ecosystem boundaries from world_event → Verify Golden Ratio bleeding maintains natural transitions

#### **Performance & Problem Detection**
- Weather system propagation patterns from weather_event_mv → Identify computation hotspots
- Resource depletion/regeneration cycles from resource_event_mv → Prevent permanent scarcity
- Event activity patterns from world_event → Monitor system load and responsiveness

#### **Development Intelligence**
- Real-time world monitoring (last 1 hour) → Immediate feedback on system changes
- Historical trend analysis (daily/weekly) → Validate mathematical models at scale
- Ecosystem health metrics → Ensure balanced gameplay across all biome types
- Resource availability alerts → Proactive problem prevention

### Strategic Value Demonstration

**Transform complex simulation systems into measurable competitive advantages:**
- Prove anti-equilibrium weather creates sustained player engagement
- Validate Golden Ratio ecosystem design through player behavior data
- Demonstrate resource balance across sophisticated weather-driven generation
- Show river flow connectivity translates to actual player movement patterns

## Technology Choices

### ClickHouse Setup
- Database: `clickhouse`
- User: `clickhouse`
- Password: `clickhouse`
- Images: `clickhouse/clickhouse-server:25.4-alpine`
- Optimized for high-frequency WorldEvent batch inserts

### Grafana Setup
- Image: `grafana/grafana:12.0.2-security-01-ubuntu`
- Plugin: `grafana-clickhouse-datasource`
- Port: `3010`
- Pre-configured with ClickHouse datasource

### World Server → ClickHouse Pipeline
- Single table ingestion: `world_event` receives all event types
- JSON payload preservation for complete flexibility
- Spatial data enrichment during batch processing
- Materialized views auto-process data for common queries using JSONExtract*
- Error handling that doesn't block game logic

## Code Patterns

### Single Table + Materialized Views
- One primary table for all WorldEvents with JSON payloads
- Materialized views for type-specific data extraction using JSONExtract*
- Primary key indexing on `(type, location, ts)` for fast filtering
- JSONExtract functions run at insert time, queries hit pre-computed columns
- Spatial coordinates enriched during World Server batch processing

### World Server Batch Processing
```typescript
interface WorldEventForClickHouse {
  id: string;
  trace: string;
  ts: string; // ISO timestamp
  type: string;
  location: string; // PlaceURN
  actor: string | null;
  payload: string; // JSON.stringify(event.payload)
  coordinates_x: number | null;
  coordinates_y: number | null;
  ecosystem: string | null;
}

class WorldEventBatchSender {
  async sendEventBatch(events: WorldEvent[]): Promise<void> {
    const transformedEvents = events.map(event => ({
      ...event,
      ts: new Date(event.ts).toISOString(),
      payload: JSON.stringify(event.payload),
      // Enrich with spatial data from PlaceURN lookup
      coordinates_x: getCoordinatesX(event.location),
      coordinates_y: getCoordinatesY(event.location),
      ecosystem: getEcosystem(event.location)
    }));

    await this.clickhouse.insert({
      table: 'world_event',
      values: transformedEvents,
      format: 'JSONEachRow'
    });
  }
}
```

### Grafana Query Patterns
```sql
-- Temperature overlay (uses weather_event_mv - no JSON parsing at query time)
SELECT
  coordinates_x,
  coordinates_y,
  temperature,
  ts as time
FROM weather_event_mv
WHERE $__timeFilter(ts)
ORDER BY ts

-- Resource availability heatmap (uses resource_event_mv)
SELECT
  coordinates_x,
  coordinates_y,
  resource_type,
  avg(quantity_after) as avg_quantity
FROM resource_event_mv
WHERE $__timeFilter(ts)
GROUP BY coordinates_x, coordinates_y, resource_type

-- Event frequency by type (uses main table)
SELECT
  toStartOfHour(ts) as time,
  type,
  count() as event_count
FROM world_event
WHERE $__timeFilter(ts)
GROUP BY time, type
ORDER BY time

-- Weather analysis using materialized view (fast, no JSON parsing)
SELECT
  ts,
  location,
  temperature,
  pressure,
  humidity,
  weather_narrative
FROM weather_event_mv
WHERE $__timeFilter(ts)
  AND temperature > 25.0
ORDER BY ts DESC

-- Resource depletion monitoring using materialized view
SELECT
  location,
  resource_type,
  resource_id,
  quantity_before,
  quantity_after,
  (quantity_before - quantity_after) as quantity_change,
  ts
FROM resource_event_mv
WHERE $__timeFilter(ts)
  AND action = 'depleted'
  AND (quantity_before - quantity_after) > 10
ORDER BY quantity_change DESC

-- Raw event analysis with JSON access (when you need original payload)
SELECT
  ts,
  type,
  location,
  JSONExtractString(payload, 'narrative') as weather_narrative
FROM world_event
WHERE type = 'place:weather:changed'
  AND $__timeFilter(ts)
```

### Batch Insert Optimization
- Use ClickHouse's JSONEachRow format for efficient batch processing
- Single table ingestion simplifies World Server integration
- Batch sizes of 100-1000 events for optimal performance
- Async processing to avoid blocking World Server game logic
- Retry logic for failed batches with exponential backoff
- Materialized views process JSONExtract* functions automatically at insert time

## File Structure
```
config/
  clickhouse/
    config.xml           # ClickHouse server config
    users.xml           # User permissions
  grafana/
    grafana.ini         # Grafana configuration
    provisioning/
      datasources/
        clickhouse.yml  # Auto-configure ClickHouse connection
      dashboards/
        world-monitoring.json
init/
  clickhouse/
    01-init-world-schema.sql     # Single world_event table + materialized views
    02-sample-data.sql           # Test WorldEvent data for development
docker-compose.yml      # ClickHouse + Grafana only
.env                   # Environment variables
README.md             # Setup and query examples
```

## Performance Considerations
- Single table design for all WorldEvents with type-based indexing
- High-frequency WorldEvent batch ingestion (thousands per minute)
- Sub-second spatial query response via materialized views (JSONExtract* at insert time)
- Efficient JSON payload storage with automatic data extraction
- Real-time materialized view updates for common query patterns
- Proper indexing on `(type, location, ts)` for fast filtering

## Development Workflow
1. Start ClickHouse + Grafana with Docker Compose
2. Create single `world_event` table + materialized views schema
3. Test with sample WorldEvent batch inserts via JSONEachRow format
4. Build Grafana dashboards using materialized views for spatial visualization
5. Optimize queries for real-time performance and spatial overlays
6. Configure World Server to send WorldEvent batches to single table

## World Server Requirements
The World Server needs to:
- Batch WorldEvents efficiently (time or count-based triggers)
- Transform events into ClickHouse format with spatial enrichment
- Send to single `world_event` table via HTTP batch inserts
- Preserve complete event payloads as JSON for flexibility
- Handle ClickHouse failures gracefully (queue/retry mechanisms)
- Log analytics errors without breaking core game logic

## Key Success Metrics

### Operational Excellence Indicators
- Handle 1000+ WeatherEvents and ResourceEvents per minute from World Server
- Sub-second query response for spatial overlays via materialized views
- Real-time dashboard updates (30s refresh) with pre-computed data
- Zero data loss from WeatherEvent and ResourceEvent batches
- Smooth time-series animation of weather and resource changes

### System Health Validation
- **Anti-Equilibrium Verification**: Prove weather systems never converge to boring stable states
- **Ecosystem Balance Monitoring**: Validate Golden Ratio bleeding maintains 38.2%/61.8% distribution
- **Resource Sustainability**: Ensure no ecosystem becomes permanently depleted
- **Performance Stability**: Weather and resource calculations complete within performance budgets

### Development Acceleration Metrics
- **Feedback Latency**: System changes visible in dashboards within 30 seconds
- **Testing Efficiency**: Validate changes across all 5 ecosystem types simultaneously
- **Problem Detection**: Issues identified via analytics before player reports
- **Balance Confidence**: Data-driven decisions replace guesswork in system adjustments

## Focus: Observable Virtual World

The primary goal is making your sophisticated virtual world **operationally visible** through real-time spatial visualizations and system health monitoring.

### From Complex Simulation to Operational Excellence

Your world implements cutting-edge simulation systems:
- **Golden Ratio ecosystem bleeding** creating natural biome transitions
- **Anti-equilibrium weather physics** maintaining perpetual atmospheric dynamics
- **Continuous river flow generation** producing organic world connectivity
- **Weather-driven resource cycles** linking atmospheric conditions to gameplay economy

**Analytics transforms these sophisticated systems from development complexity into operational advantage.**

### Real-World Operational Impact

**Before Analytics: Flying Blind**
- Complex weather interactions fail silently until players complain
- Resource balance issues discovered through player frustration
- Performance problems grow until they cause server instability
- Mathematical models (Golden Ratio, anti-equilibrium) unvalidated at scale

**After Analytics: Observable Systems**
- Weather front movements visualized in real-time across all ecosystem types
- Resource regeneration cycles monitored to prevent permanent depletion
- Performance bottlenecks detected before they impact player experience
- Mathematical elegance proven through measurable gameplay outcomes

### Strategic Value Demonstration

Each Place's coordinates become data points on interactive maps showing:
- **Atmospheric conditions** proving anti-equilibrium weather creates sustained engagement
- **Resource distribution** validating ecosystem-specific generation policies
- **Player activity patterns** confirming river-based connectivity creates good gameplay flow

**This isn't just monitoring—it's operational intelligence that transforms sophisticated simulation systems from development risk into measurable competitive advantage.**

Your world generation creates mathematically elegant worlds. Your weather system implements genuine atmospheric physics. **Analytics proves they create exceptional gameplay while ensuring they operate flawlessly at scale.**
