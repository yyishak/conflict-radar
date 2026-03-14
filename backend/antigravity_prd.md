# Antigravity PRD: Event-Driven AI & GTI Architecture

## 1. System Overview: The High-Level Flow
This diagram tracks the lifecycle of a geopolitical event from a raw "ping" to a visual "pulse" on the 3D globe.

```mermaid
graph TD
    subgraph Ingestion_Layer [Data Ingestion]
        A[OSINT Scrapers: Telegram/X/RSS] -->|Raw Text| B(Queue: RabbitMQ/Redis)
    end

    subgraph AI_Microservices [Intelligence Processing]
        B --> C{Deduplication Service}
        C -->|New Event| D[Classification Service: LLM]
        C -->|Duplicate| E[Discard/Update Weights]
        D -->|JSON Metadata| F[NER & Geo-Coding Service]
    end

    subgraph Scoring_Engine [GTI Algorithm]
        F --> G[Global Tension Index Calculator]
        G --> H[(Postgres + pgvector)]
    end

    subgraph Delivery_Layer [Real-Time Pulse]
        H --> I[WebSocket Server]
        I --> J[Frontend: Three.js/React]
    end
```

## 2. The GTI (Global Tension Index) Logic
The "Antigravity" scoring logic uses Time-Decay. A strike happening now is exponentially more relevant than a strike from 48 hours ago.

```mermaid
flowchart LR
    Start[Incoming Event Data] --> Weight[Assign Base Weight: Wb]
    Weight --> Category{Category?}
    
    Category -- Kinetic --> W1[Wb = 10.0]
    Category -- Tactical --> W2[Wb = 6.5]
    Category -- Political --> W3[Wb = 2.0]

    W1 & W2 & W3 --> Decay[Apply Exponential Decay: λ]
    Decay --> Sum[Sum All Active Events]
    Sum --> Index[Final GTI Score]

    subgraph Formula_Logic [Logic: S = Σ W * e^-λt]
        direction TB
        L1[λ = Decay Constant]
        L2[t = Time since event]
    end
```

## 3. Microservice Deep-Dive: The AI Agent
This defines how the "Vibe" is extracted from messy human language into structured data.

```mermaid
sequenceDiagram
    participant S as Scraper
    participant AI as LLM Classifier (GPT-4o-mini/Llama3)
    participant DB as Vector DB
    participant API as Frontend API

    S->>AI: Send Raw Snippet: "Explosion reported in Erbil..."
    AI->>AI: Extract Entities (Location, Actor, Asset)
    AI->>AI: Assign Sentiment & Kinetic Score
    AI->>DB: Query Similar Vectors (Last 1hr)
    alt Is Unique
        DB-->>AI: No matches found
        AI->>DB: Store Event & Update GTI
        AI->>API: Push WebSocket: {status: "escalating", loc: [lat, lng]}
    else Is Duplicate
        DB-->>AI: Match Found (95% similarity)
        AI->>DB: Increment "Report Count" (Verification Weight)
    end
```

## 4. Technical Specs for "Vibe Coding"
To get this running quickly, focus on these three interfaces:

| Microservice | Language/Framework | Critical Tech |
|---|---|---|
| Ingestor | Python (FastAPI) | Playwright for scraping, Pydantic for schemas. |
| The Brain | Python | LangChain or Instructor for structured JSON output. |
| GTI Engine | Node.js / Go | Redis for the real-time counter (fast increments). |
| Visualizer | React | react-three-fiber + Globe.gl for the 3D map. |
