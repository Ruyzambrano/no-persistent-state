"""
Subscribe to a RIS Live stream and output every message to stdout.

IMPORTANT: this example requires 'websocket-client' for Python 2 or 3.

If you use the 'websockets' package instead (Python 3 only) you will need to change the code because it has a somewhat different API.
"""
import json
from websocket import WebSocket

def get_stream() -> WebSocket:
    ws = WebSocket(None, None, None)
    ws.connect("wss://ris-live.ripe.net/v1/ws/?client=py-example-1")
    params = {
        "moreSpecific": True,
        "host": "rrc21",
        "socketOptions": {
            "includeRaw": True
        }
    }
    ws.send(json.dumps({
            "type": "ris_subscribe",
            "data": params
    }))
    return ws

def print_stream(ws: WebSocket):
    for data in ws:
        parsed = json.loads(data)
        print(parsed["type"], parsed["data"])

if __name__ == "__main__":
    stream = get_stream()
    print_stream(stream)