"""SocketIO event handlers for real-time simulation streaming."""

import msgpack

_sim = None
_socketio = None
_client_viewports = {}  # sid -> {x, y, w, h}


def init_socket_events(socketio, sim_runner):
    global _sim, _socketio
    _sim = sim_runner
    _socketio = socketio

    @socketio.on("connect")
    def handle_connect():
        from flask import request
        _client_viewports[request.sid] = {"x": 0, "y": 0, "w": 100, "h": 100}

    @socketio.on("disconnect")
    def handle_disconnect():
        from flask import request
        _client_viewports.pop(request.sid, None)

    @socketio.on("viewport")
    def handle_viewport(data):
        from flask import request
        _client_viewports[request.sid] = {
            "x": data.get("x", 0),
            "y": data.get("y", 0),
            "w": data.get("w", 100),
            "h": data.get("h", 100),
        }

    # Set up tick callback on simulation runner
    sim_runner.on_tick = _broadcast_tick


def _broadcast_tick(world):
    """Called after each simulation tick — send state to all connected clients."""
    if not _socketio or not _client_viewports:
        return

    for sid, vp in list(_client_viewports.items()):
        state = _sim.get_state_for_viewport(vp["x"], vp["y"], vp["w"], vp["h"])
        if state:
            try:
                data = msgpack.packb(state, use_bin_type=True)
                _socketio.emit("tick", data, room=sid)
            except Exception:
                pass
