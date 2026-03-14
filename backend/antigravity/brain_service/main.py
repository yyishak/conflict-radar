import os
import json
import uuid
import time
import logging
import random
import pika
import psycopg2
import redis
from pgvector.psycopg2 import register_vector
import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_USER = os.getenv("POSTGRES_USER", "antigravity")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
PG_DB = os.getenv("POSTGRES_DB", "antigravity_db")

def setup_db():
    conn = psycopg2.connect(host=PG_HOST, user=PG_USER, password=PG_PASSWORD, database=PG_DB)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    register_vector(conn)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY,
            content TEXT,
            category VARCHAR(50),
            actor VARCHAR(100),
            location VARCHAR(100),
            latitude FLOAT,
            longitude FLOAT,
            base_weight FLOAT,
            embedding vector(1536),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cur.close()
    return conn

def get_redis():
    return redis.Redis(host=REDIS_HOST, port=6379, db=0, decode_responses=True)

def mock_llm_classify(text: str):
    """Mocks an LLM classifying the raw text."""
    text_lower = text.lower()
    
    # Simple keyword heuristic for categories
    if "explosion" in text_lower or "strike" in text_lower or "kinetic" in text_lower:
        category = "Kinetic"
        base_weight = 10.0
    elif "troops" in text_lower or "movement" in text_lower or "tactical" in text_lower:
        category = "Tactical"
        base_weight = 6.5
    else:
        category = "Political"
        base_weight = 2.0
        
    # Mock Location (normally extracted via NER/GeoCoding)
    # Erbil: 36.19, 44.01
    # Global random: just for visualizer
    lat = 36.19 + (random.random() - 0.5) * 10
    lng = 44.01 + (random.random() - 0.5) * 10
    
    return {
        "category": category,
        "base_weight": base_weight,
        "actor": "Unknown Actor",
        "location": "Regional Area",
        "latitude": lat,
        "longitude": lng,
    }

def mock_embedding(text: str):
    """Mock 1536-dimensional embedding generation (e.g. text-embedding-ada-002)."""
    # Deterministic generation for duplicate matching simulation.
    seed = sum(ord(c) for c in text[:10])
    rng = random.Random(seed)
    return [rng.random() for _ in range(1536)]

def process_message(ch, method, properties, body, db_conn, redis_client):
    try:
        raw_event = json.loads(body)
        text = raw_event.get("text", "")
        logger.info(f"Processing event: {text[:50]}...")
        
        # 1. Generate Embedding
        embedding = mock_embedding(text)
        
        # 2. Check Deduplication
        cur = db_conn.cursor()
        # Cosine distance < 0.05 implies > 95% similarity
        cur.execute("""
            SELECT id, content, 1 - (embedding <=> %s::vector) AS similarity 
            FROM events 
            WHERE 1 - (embedding <=> %s::vector) > 0.95
            LIMIT 1;
        """, (embedding, embedding))
        
        match = cur.fetchone()
        
        if match:
            logger.info(f"Duplicate found (Similarity > 95%): {match[0]}. Discarding/Updating weight.")
            # We could tell Redis to increment the multiplier here for the existing ID.
        else:
            logger.info("New event, classifying...")
            
            # 3. Classify with "LLM"
            metrics = mock_llm_classify(text)
            
            # 4. Store in Vector DB
            event_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO events (id, content, category, actor, location, latitude, longitude, base_weight, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (event_id, text, metrics["category"], metrics["actor"], metrics["location"], 
                  metrics["latitude"], metrics["longitude"], metrics["base_weight"], embedding))
            
            # 5. Push to GTI Engine (via Redis Pub/Sub)
            payload = {
                "id": event_id,
                "text": text,
                "category": metrics["category"],
                "base_weight": metrics["base_weight"],
                "latitude": metrics["latitude"],
                "longitude": metrics["longitude"],
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
            redis_client.publish('scored_events', json.dumps(payload))
            logger.info(f"Published scored event {event_id} to GTI Engine.")
            
        cur.close()
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        # In production, NACK or push to dead letter.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_consumer():
    time.sleep(5) # wait for rabbitmq/postgres to boot
    db_conn = setup_db()
    redis_client = get_redis()
    
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue="raw_events", durable=True)
    
    logger.info("Brain Service ready, waiting for raw_events...")
    
    def callback(ch, method, properties, body):
        process_message(ch, method, properties, body, db_conn, redis_client)

    channel.basic_consume(queue="raw_events", on_message_callback=callback)
    channel.start_consuming()

if __name__ == "__main__":
    start_consumer()
