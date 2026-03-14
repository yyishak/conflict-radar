import asyncio
import websockets

async def test_ws():
    uri = "ws://localhost:4000"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            while True:
                message = await websocket.recv()
                print(f"Received: {message}")
    except Exception as e:
        print(f"Connection failed: {e}")

asyncio.run(test_ws())
