"""Flask application factory — EcoGame backend."""

import copy
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

from config import DEFAULT_CONFIG
from engine.simulation import SimulationRunner
from api.routes import api, init_routes
from api.socket_events import init_socket_events


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "ecogame-dev-key"
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="eventlet",
        max_http_buffer_size=10 * 1024 * 1024,  # 10MB for large terrain data
    )

    # Create simulation runner with a copy of default config
    config = copy.deepcopy(DEFAULT_CONFIG)
    sim = SimulationRunner(config)

    # Initialize routes and socket events
    init_routes(sim)
    init_socket_events(socketio, sim)

    app.register_blueprint(api)

    return app, socketio


if __name__ == "__main__":
    app, socketio = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
