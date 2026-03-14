import json
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import pika
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Antigravity Ingestor", version="1.0.0")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_QUEUE = "raw_events"

# Pydantic schema for raw incoming data
class RawEventPing(BaseModel):
    source: str = Field(..., description="Source of the event, e.g., Telegram, X, RSS")
    text: str = Field(..., description="The raw text content of the ping")
    url: Optional[str] = Field(None, description="Optional link to original source")

def publish_to_rabbitmq(event_data: dict):
    """Publish a validated raw event to the RabbitMQ queue."""
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
        
        channel.basic_publish(
            exchange='',
            routing_key=RABBITMQ_QUEUE,
            body=json.dumps(event_data),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            )
        )
        logger.info(f"Published event to {RABBITMQ_QUEUE}: {event_data['text'][:50]}...")
        connection.close()
    except Exception as e:
        logger.error(f"Failed to publish to RabbitMQ: {str(e)}")
        # In a real system, you'd want retries or a dead letter queue here.

@app.post("/ingest")
async def ingest_event(event: RawEventPing, background_tasks: BackgroundTasks):
    """
    Ingest a raw OSINT ping and shove it onto the queue.
    """
    logger.info(f"Received ping from {event.source}")
    
    # Push to background so we don't block the API response waiting for Network I/O
    background_tasks.add_task(publish_to_rabbitmq, event.model_dump())
    
    return {"status": "accepted", "message": "Event queued for processing."}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
