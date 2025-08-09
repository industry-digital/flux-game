# Local LLM Strategy for World Texture Enhancement

## Executive Summary

This document outlines a technical strategy for integrating cost-efficient local Large Language Models (LLMs) into the World Texture Service. By leveraging Apple Silicon's unified memory architecture and Neural Engine capabilities, the system can enhance environmental descriptions with contextual AI-generated content while maintaining deterministic fallbacks and performance guarantees.

Decision: Qwen2.5-7B-Instruct (quantized Q4_K_M) is the standard local model for production World Texture batches. All examples, defaults, and operational guidance assume Qwen2.5-7B unless explicitly stated otherwise.

## Technical Requirements

### Performance Constraints

**Batch Processing Context**: The World Texture Service operates as a background batch process with no real-time user interaction requirements. This eliminates the microsecond latency constraints that apply to the main World Server pipeline.

**Realistic Performance Calculations (M4 Mac Mini, 64GB RAM)**:

- **Dispatch overhead (per boundary crossing)**: <1ms (i.e. passing messages to and from the GPU)
- **Single description**: 3 seconds (180 tokens ÷ 60 tokens/sec)
- **Parallel processing**: 4 concurrent streams (thermal/memory optimal); optional scalability to 8 concurrent streams for higher-activity world regions
- **Effective rate**: 0.75 seconds per description (3s ÷ 4 streams)

**World Scale Performance**:
- **1,500 Places (full world)**: 1,125 seconds = 18.75 minutes
- **Typical batch (10% enhanced)**: 150 places = 135 seconds = 2.25 minutes
- **High-activity batch (200 places)**: 165 seconds = 2.75 minutes

**Throughput Requirements**:
- **Individual descriptions**: 20-100 enhanced descriptions per batch cycle
- **Batch frequency**: Every 30 seconds to 5 minutes based on world activity
- **Concurrent processing**: Multiple locations processed in parallel batches

### Hardware Target Platform

**Apple Silicon Optimization**:
- **Primary target**: M1/M2/M3/M4 Mac series with 32GB+ unified memory
- **Neural Engine**: 15.8-35.8 TOPS for transformer inference acceleration
- **Metal Performance Shaders**: GPU acceleration for matrix operations
- **Unified memory**: Zero-copy model weight access across processing units

**Memory Requirements (M4 Mac Mini, 64GB RAM)**:
- **Qwen2.5-7B model**: 4.8GB (Q4_K_M quantization)
- **Inference working memory**: 8GB (4 concurrent streams × 2GB each)
- **KV cache**: 2GB (key-value cache for context)
- **World simulation state**: 16GB (full world state in unified memory)
- **Texture context buffer**: 4GB (Place contexts and generated content)
- **Available headroom**: 29.2GB (comfortable operational margin)

## Model Selection Strategy

### Single Model Approach: Qwen2.5-7B-Instruct

**Operational Simplicity**: Standardizing on a single model eliminates complexity in model management, prompt engineering, and deployment while providing comprehensive multilingual capabilities.

**Qwen2.5-7B-Instruct Performance Profile**:
- **Throughput**: 60 tokens/second on M4 Mac Mini (64GB RAM)
- **Description generation**: 2.5 seconds per 150-token description
- **Multilingual support**: Native support for 119 languages and dialects
- **Memory footprint**: 4.8GB quantized (Q4_K_M) + 8GB working memory
- **Context length**: 2048 tokens (sufficient for Place context)

**M4 Mac Mini Performance Characteristics**:
```typescript
const performanceProfile = {
  tokensPerSecond: 60,              // Conservative estimate
  descriptionsPerMinute: 24,        // Single stream
  concurrentStreams: 4,             // Thermal/memory optimal
  effectiveDescriptionsPerMinute: 96, // Parallel processing

  // World texture batch processing
  batchOf4Places: 2.5,             // seconds (parallel)
  batchOf100Places: 125,           // seconds (~2 minutes)
  fullWorld1500Places: 937.5       // seconds (~15.6 minutes)
};
```

**Quantization Strategy**:
- **Q4_K_M**: Optimal balance (4.8GB) - recommended for production
- **Q5_K_M**: Higher quality (5.9GB) - for quality-critical scenarios
- **Q8_0**: Maximum quality (7.8GB) - for offline processing

## Technical Integration Architecture

### MLX Framework Integration

**Framework Selection**: MLX (Apple's Metal-accelerated ML framework) provides optimal Apple Silicon integration:

```typescript
import { MLXModel, MLXTokenizer } from '@mlx-community/mlx-js';

class MLXTextureGenerator {
  private model: MLXModel;
  private tokenizer: MLXTokenizer;
  private unifiedMemoryBuffer: SharedArrayBuffer;

  constructor(modelPath: string) {
    // Load model with unified memory optimization
    this.model = MLXModel.load(modelPath, {
      useUnifiedMemory: true,
      enableNeuralEngine: true,
      metalOptimizations: true
    });
  }

  async generateDescription(context: PlaceContext): Promise<string> {
    const prompt = this.constructPrompt(context);
    const tokens = await this.tokenizer.encode(prompt);

    // Direct Neural Engine inference
    const output = await this.model.generate(tokens, {
      maxTokens: 150,
      temperature: 0.7,
      seed: this.determinisiticSeed(context)
    });

    return this.tokenizer.decode(output);
  }
}
```

### "Meeting on the Other Side" Integration

**Parallel Dispatch Pattern**: Integrate LLM processing into the World Texture Service batch pipeline using the proven GPU dispatch approach:

```typescript
class WorldTextureDispatchStage {
  async processBatch(places: PlaceContext[]): Promise<EnhancedDescriptions> {
    // Phase 1: Dispatch LLM work (0.1ms)
    const llmPromises = this.dispatchLLMGeneration(places);

    // Phase 2: Generate template fallbacks (2ms)
    const templateDescriptions = this.generateTemplateDescriptions(places);

    // Phase 3: "Meet on the other side" - resolve LLM results (50-200ms)
    const llmDescriptions = await this.resolveLLMGeneration(llmPromises);

    // Phase 4: Merge enhanced content with fallbacks (0.5ms)
    return this.mergeDescriptions(llmDescriptions, templateDescriptions);
  }

  private async dispatchLLMGeneration(places: PlaceContext[]): Promise<Map<string, Promise<string>>> {
    const promises = new Map<string, Promise<string>>();

    for (const place of places) {
      if (this.shouldEnhanceWithLLM(place)) {
        promises.set(place.urn, this.llmGenerator.generateDescription(place));
      }
    }

    return promises;
  }
}
```

### Unified Memory Context Sharing

**Zero-Copy Simulation Data Access**: Leverage unified memory to eliminate marshaling overhead:

```typescript
class UnifiedWorldTextureContext {
  private static readonly MEMORY_LAYOUT = {
    SIMULATION_STATE: { offset: 0, size: 16 * 1024 * 1024 },     // Weather, resources, events
    PLACE_CONTEXTS: { offset: 16 * 1024 * 1024, size: 8 * 1024 * 1024 },   // Place data
    LLM_PROMPTS: { offset: 24 * 1024 * 1024, size: 4 * 1024 * 1024 },      // Generated prompts
    GENERATED_TEXT: { offset: 28 * 1024 * 1024, size: 4 * 1024 * 1024 },   // LLM outputs
  };

  private sharedBuffer: SharedArrayBuffer;

  constructor() {
    this.sharedBuffer = new SharedArrayBuffer(32 * 1024 * 1024);
  }

  // Direct memory access for LLM context
  getSimulationStateView(): DataView {
    return new DataView(
      this.sharedBuffer,
      this.MEMORY_LAYOUT.SIMULATION_STATE.offset,
      this.MEMORY_LAYOUT.SIMULATION_STATE.size
    );
  }
}
```

## Prompt Engineering Strategy

### Context-Aware Prompt Construction

**Structured Context Injection**: Convert simulation state into focused LLM prompts:

```typescript
class WorldTexturePromptEngine {
  constructPrompt(context: PlaceContext): string {
    const baseDescription = context.place.description.base;
    const weatherState = this.summarizeWeather(context.weather);
    const resourceState = this.summarizeResources(context.resources);
    const recentEvents = this.summarizeEvents(context.events);

    return `
Enhance this location description with current conditions:

Base: ${baseDescription}

Current conditions:
- Weather: ${weatherState}
- Resources: ${resourceState}
- Recent events: ${recentEvents}

Generate 2-3 sentences that naturally integrate these conditions into the scene. Focus on atmospheric details and environmental storytelling. Maintain the existing tone and style.

Enhanced description:`;
  }

  private summarizeWeather(weather: WeatherState): string {
    return `${weather.temperature}°C, ${weather.conditions}, ${weather.windSpeed}mph winds`;
  }

  private summarizeResources(resources: ResourceState): string {
    const abundant = resources.filter(r => r.abundance > 0.7).map(r => r.type);
    const scarce = resources.filter(r => r.abundance < 0.3).map(r => r.type);

    return `abundant: ${abundant.join(', ')}, scarce: ${scarce.join(', ')}`;
  }
}
```

### Event Significance Integration

**Tiered Enhancement Strategy**: Apply LLM enhancement based on event significance layers:

```typescript
enum TextureEnhancementLevel {
  TEMPLATE_ONLY = 'template',      // Immediate events, high frequency
  LIGHT_LLM = 'light',            // Short-term events, small models
  FULL_LLM = 'full',              // Medium/long-term events, quality models
  PREMIUM_LLM = 'premium'         // Permanent events, largest models
}

class SignificanceBasedDispatcher {
  determineEnhancementLevel(context: PlaceContext): TextureEnhancementLevel {
    const maxEventSignificance = Math.max(...context.events.map(e => e.significance));

    if (maxEventSignificance >= 0.8) return TextureEnhancementLevel.PREMIUM_LLM;
    if (maxEventSignificance >= 0.6) return TextureEnhancementLevel.FULL_LLM;
    if (maxEventSignificance >= 0.3) return TextureEnhancementLevel.LIGHT_LLM;
    return TextureEnhancementLevel.TEMPLATE_ONLY;
  }
}
```

## Deterministic Operation Requirements

### Seeded Generation

**Deterministic LLM Inference**: Ensure reproducible outputs for testing and consistency:

```typescript
class DeterministicLLMGenerator {
  private generateSeed(context: PlaceContext): number {
    // Generate deterministic seed from place state hash
    const stateHash = this.hashPlaceState(context);
    return parseInt(stateHash.substring(0, 8), 16);
  }

  private hashPlaceState(context: PlaceContext): string {
    const stateString = JSON.stringify({
      place: context.place.urn,
      weather: context.weather,
      resources: context.resources.map(r => ({ type: r.type, abundance: Math.floor(r.abundance * 100) })),
      events: context.events.map(e => ({ type: e.type, significance: Math.floor(e.significance * 100) }))
    });

    return createHash('sha256').update(stateString).digest('hex');
  }

  async generateWithSeed(context: PlaceContext): Promise<string> {
    const seed = this.generateSeed(context);

    return await this.model.generate(prompt, {
      temperature: 0.7,
      seed: seed,  // Deterministic generation
      maxTokens: 150
    });
  }
}
```

### Fallback Guarantee

**Template System Integration**: Ensure system reliability through deterministic fallbacks:

```typescript
class ReliableTextureGenerator {
  async generateDescription(context: PlaceContext): Promise<string> {
    try {
      // Attempt LLM enhancement with timeout
      const llmResult = await Promise.race([
        this.llmGenerator.generateDescription(context),
        this.timeoutPromise(2000) // 2 second timeout
      ]);

      if (llmResult && this.validateOutput(llmResult)) {
        return this.combineWithTemplate(context, llmResult);
      }
    } catch (error) {
      this.logLLMError(error);
    }

    // Always fall back to deterministic template generation
    return this.templateGenerator.generateDescription(context);
  }

  private validateOutput(text: string): boolean {
    return text.length > 20 &&
           text.length < 500 &&
           !this.containsInappropriateContent(text);
  }
}
```

## Performance Optimization

### Model Loading Strategy

**Memory-Mapped Model Management**: Optimize model loading for batch processing:

```typescript
class OptimizedModelManager {
  private modelCache: Map<string, MLXModel> = new Map();
  private memoryPool: SharedArrayBuffer;

  async loadModel(modelId: string): Promise<MLXModel> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId)!;
    }

    const model = await MLXModel.load(`models/${modelId}`, {
      useMemoryMapping: true,        // Memory-map model weights
      enableMetalOptimization: true, // Use Metal shaders
      unifiedMemoryMode: true,       // Apple Silicon unified memory
      quantization: 'Q4_K_M'         // Balanced quality/speed
    });

    this.modelCache.set(modelId, model);
    return model;
  }
}
```

### Batch Processing Optimization

**Parallel Inference**: Process multiple descriptions concurrently:

```typescript
class BatchLLMProcessor {
  async processBatch(contexts: PlaceContext[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Process in parallel with concurrency limit
    const concurrency = 4; // Optimal for Apple Silicon thermal management
    const chunks = this.chunkArray(contexts, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (context) => {
        const description = await this.generateDescription(context);
        return [context.place.urn, description] as [string, string];
      });

      const chunkResults = await Promise.all(promises);
      chunkResults.forEach(([urn, description]) => results.set(urn, description));
    }

    return results;
  }
}
```

## Deployment and Operations

### Model Management

**Quantized Model Distribution**: Optimize storage and loading:

```bash
# Model preparation pipeline
models/
└── qwen-2.5-7b-instruct-q4-k-m.gguf   # Standard production model (~4.6–4.8GB)
```

**Environment Configuration**:

```typescript
interface LLMConfiguration {
  enabled: boolean;
  modelPath: string;
  maxConcurrency: number;
  timeoutMs: number;
  fallbackThreshold: number;
  enhancementRules: {
    immediateEvents: boolean;     // false - use templates only
    shortTermEvents: boolean;     // true - use fast models
    mediumTermEvents: boolean;    // true - use quality models
    longTermEvents: boolean;      // true - use premium models
  };
}

const getLLMConfiguration = (): LLMConfiguration => ({
  enabled: process.env.FLUX_LLM_ENABLED === 'true',
  modelPath: process.env.FLUX_LLM_MODEL_PATH || 'models/qwen-2.5-7b-instruct-q4-k-m.gguf',
  maxConcurrency: parseInt(process.env.FLUX_LLM_CONCURRENCY || '4'),
  timeoutMs: parseInt(process.env.FLUX_LLM_TIMEOUT || '2000'),
  fallbackThreshold: parseFloat(process.env.FLUX_LLM_FALLBACK_THRESHOLD || '0.1'),
  enhancementRules: {
    immediateEvents: false,
    shortTermEvents: process.env.FLUX_LLM_SHORT_TERM === 'true',
    mediumTermEvents: process.env.FLUX_LLM_MEDIUM_TERM !== 'false',
    longTermEvents: process.env.FLUX_LLM_LONG_TERM !== 'false'
  }
});
```

### Monitoring and Metrics

**Performance Tracking**: Monitor LLM integration effectiveness:

```typescript
class LLMPerformanceMonitor {
  private metrics = {
    generationLatency: new RunningAverage(),
    fallbackRate: new RunningAverage(),
    enhancementQuality: new RunningAverage(),
    memoryUtilization: new RunningAverage(),
    throughput: new RunningAverage()
  };

  recordGeneration(
    latency: number,
    successful: boolean,
    qualityScore?: number
  ): void {
    this.metrics.generationLatency.add(latency);
    this.metrics.fallbackRate.add(successful ? 0 : 1);

    if (qualityScore !== undefined) {
      this.metrics.enhancementQuality.add(qualityScore);
    }
  }

  getReport(): LLMPerformanceReport {
    return {
      averageLatency: this.metrics.generationLatency.average(),
      fallbackPercentage: this.metrics.fallbackRate.average() * 100,
      averageQuality: this.metrics.enhancementQuality.average(),
      recommendedOptimizations: this.generateRecommendations()
    };
  }
}
```

## Cost-Benefit Analysis

### Performance Impact Assessment

**Enhanced Description Quality**:
- **Baseline**: Template-generated environmental descriptions (3M+ renders/sec, deterministic)
- **Enhanced**: LLM-augmented descriptions (50-200ms generation, contextual)
- **Hybrid approach**: Template performance + LLM enhancement where valuable

**Resource Utilization**:
- **Model memory**: 4-8GB unified memory allocation
- **Inference overhead**: 1-4GB working memory during generation
- **Processing time**: Background batch processing eliminates user-facing latency
- **Thermal management**: Batch processing allows thermal recovery between cycles

### Implementation Cost Analysis

**Development Investment**:
- **MLX integration**: Moderate complexity, well-documented framework
- **Prompt engineering**: Iterative refinement for optimal outputs
- **Fallback systems**: Reuse existing template infrastructure
- **Monitoring**: Standard metrics collection with LLM-specific additions

**Operational Costs**:
- **Hardware requirements**: Standard Apple Silicon development hardware
- **Model storage**: 5-20GB local model files
- **Bandwidth**: Zero ongoing costs (local inference)
- **Maintenance**: Model updates as better quantized versions become available

## Conclusion

Local LLM integration into the World Texture Service represents a technically feasible approach to enhancing environmental storytelling without compromising system performance or reliability. The batch processing context eliminates real-time latency constraints, while Apple Silicon's unified memory architecture and Neural Engine provide optimal execution characteristics for transformer inference.

The "meeting on the other side" dispatch pattern enables LLM enhancement to operate as a parallel capability rather than a sequential bottleneck, maintaining the system's performance guarantees while adding contextual richness to environmental descriptions.

The strategy prioritizes reliability through deterministic fallbacks, cost efficiency through local inference, and performance optimization through Apple Silicon-specific frameworks and memory management approaches.

Implementation can proceed incrementally, starting with basic LLM integration for medium-term events and expanding to comprehensive enhancement as operational experience accumulates.
