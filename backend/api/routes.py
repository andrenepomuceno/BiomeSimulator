"""REST API routes for simulation control, map editing, and entity management."""

from flask import Blueprint, request, jsonify
import msgpack
import numpy as np

api = Blueprint("api", __name__)

# These will be set by app.py after creating the simulation runner
_sim = None


def init_routes(sim_runner):
    global _sim
    _sim = sim_runner


# --- Map ---

@api.route("/api/map/generate", methods=["POST"])
def generate_map():
    """Generate a new terrain map. Accepts optional config overrides."""
    params = request.get_json(silent=True) or {}

    # Apply overrides
    for key in ("map_width", "map_height", "sea_level", "island_count",
                "island_size_factor", "seed"):
        if key in params:
            _sim.config[key] = params[key]

    seed = _sim.generate_world()

    # Return terrain as msgpack binary
    terrain_bytes = _sim.world.terrain.tobytes()
    water_prox_bytes = _sim.world.water_proximity.tobytes()
    plant_types_bytes = _sim.world.plant_grid["type"].tobytes()
    plant_stages_bytes = _sim.world.plant_grid["stage"].tobytes()

    data = msgpack.packb({
        "width": _sim.world.width,
        "height": _sim.world.height,
        "terrain": terrain_bytes,
        "water_proximity": water_prox_bytes,
        "plant_types": plant_types_bytes,
        "plant_stages": plant_stages_bytes,
        "seed": seed,
    })

    return data, 200, {"Content-Type": "application/x-msgpack"}


@api.route("/api/map/terrain", methods=["GET"])
def get_terrain():
    """Get current terrain as msgpack binary."""
    if _sim.world is None:
        return jsonify({"error": "No world generated"}), 400

    terrain_bytes = _sim.world.terrain.tobytes()
    water_prox_bytes = _sim.world.water_proximity.tobytes()

    data = msgpack.packb({
        "width": _sim.world.width,
        "height": _sim.world.height,
        "terrain": terrain_bytes,
        "water_proximity": water_prox_bytes,
    })

    return data, 200, {"Content-Type": "application/x-msgpack"}


@api.route("/api/map/edit", methods=["POST"])
def edit_terrain():
    """Edit terrain tiles. Body: {changes: [{x, y, terrain}, ...]}."""
    data = request.get_json()
    if not data or "changes" not in data:
        return jsonify({"error": "Missing 'changes' array"}), 400

    _sim.edit_terrain(data["changes"])
    return jsonify({"ok": True})


# --- Simulation control ---

@api.route("/api/sim/start", methods=["POST"])
def start_sim():
    _sim.start()
    return jsonify({"ok": True, "paused": _sim.paused})


@api.route("/api/sim/pause", methods=["POST"])
def pause_sim():
    _sim.pause()
    return jsonify({"ok": True, "paused": True})


@api.route("/api/sim/resume", methods=["POST"])
def resume_sim():
    _sim.resume()
    return jsonify({"ok": True, "paused": False})


@api.route("/api/sim/step", methods=["POST"])
def step_sim():
    _sim.step()
    return jsonify({"ok": True})


@api.route("/api/sim/reset", methods=["POST"])
def reset_sim():
    _sim.stop()
    params = request.get_json(silent=True) or {}
    for key in ("map_width", "map_height", "sea_level", "island_count",
                "island_size_factor", "seed", "initial_herbivore_count",
                "initial_carnivore_count", "initial_plant_density"):
        if key in params:
            _sim.config[key] = params[key]

    seed = _sim.generate_world()
    terrain_bytes = _sim.world.terrain.tobytes()
    water_prox_bytes = _sim.world.water_proximity.tobytes()
    plant_types_bytes = _sim.world.plant_grid["type"].tobytes()
    plant_stages_bytes = _sim.world.plant_grid["stage"].tobytes()

    data = msgpack.packb({
        "width": _sim.world.width,
        "height": _sim.world.height,
        "terrain": terrain_bytes,
        "water_proximity": water_prox_bytes,
        "plant_types": plant_types_bytes,
        "plant_stages": plant_stages_bytes,
        "seed": seed,
    })

    return data, 200, {"Content-Type": "application/x-msgpack"}


@api.route("/api/sim/speed", methods=["POST"])
def set_speed():
    data = request.get_json()
    tps = data.get("tps", 10)
    _sim.set_speed(tps)
    return jsonify({"ok": True, "tps": _sim.tps})


@api.route("/api/sim/status", methods=["GET"])
def sim_status():
    state = _sim.get_full_state()
    if state is None:
        return jsonify({"running": False, "paused": True, "world": None})
    return jsonify({
        "running": _sim._running,
        "paused": _sim.paused,
        "tps": _sim.tps,
        **state,
    })


# --- Entities ---

@api.route("/api/entity/place", methods=["POST"])
def place_entity():
    data = request.get_json()
    result = _sim.place_entity(data["type"], data["x"], data["y"])
    if result:
        return jsonify(result)
    return jsonify({"error": "Failed to place entity"}), 400


@api.route("/api/entity/<int:entity_id>", methods=["DELETE"])
def remove_entity(entity_id):
    if _sim.remove_entity(entity_id):
        return jsonify({"ok": True})
    return jsonify({"error": "Entity not found"}), 404


@api.route("/api/entity/<int:entity_id>", methods=["GET"])
def get_entity(entity_id):
    if _sim.world is None:
        return jsonify({"error": "No world"}), 400
    for a in _sim.world.animals:
        if a.id == entity_id:
            return jsonify(a.to_dict())
    return jsonify({"error": "Entity not found"}), 404


# --- Stats ---

@api.route("/api/stats", methods=["GET"])
def get_stats():
    if _sim.world is None:
        return jsonify({"error": "No world"}), 400
    return jsonify({
        "current": _sim.world.get_stats(),
        "history": _sim.world.stats_history[-200:],
    })


@api.route("/api/tile/<int:x>/<int:y>", methods=["GET"])
def get_tile(x, y):
    """Get info about a specific tile."""
    if _sim.world is None:
        return jsonify({"error": "No world"}), 400
    w = _sim.world
    if not (0 <= x < w.width and 0 <= y < w.height):
        return jsonify({"error": "Out of bounds"}), 400

    from engine.world import TERRAIN_NAMES
    pg = w.plant_grid[y, x]
    plant_type_names = {0: "none", 1: "grass", 2: "bush", 3: "tree"}
    stage_names = {0: "none", 1: "seed", 2: "sprout", 3: "mature", 4: "fruiting", 5: "dead"}

    return jsonify({
        "x": x,
        "y": y,
        "terrain": TERRAIN_NAMES.get(int(w.terrain[y, x]), "unknown"),
        "terrain_id": int(w.terrain[y, x]),
        "water_proximity": int(w.water_proximity[y, x]),
        "plant": {
            "type": plant_type_names.get(int(pg["type"]), "unknown"),
            "stage": stage_names.get(int(pg["stage"]), "unknown"),
            "age": int(pg["age"]),
            "fruit": bool(pg["fruit"]),
        },
    })
