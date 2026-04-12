"""Entity models — Animal with state machine, basic data classes."""

from enum import IntEnum
import random


class AnimalState(IntEnum):
    IDLE = 0
    WALKING = 1
    RUNNING = 2
    EATING = 3
    DRINKING = 4
    SLEEPING = 5
    ATTACKING = 6
    FLEEING = 7
    MATING = 8
    DEAD = 9


class Animal:
    """An individual animal in the simulation."""

    __slots__ = (
        "id", "x", "y", "species", "state",
        "energy", "hunger", "thirst", "age", "alive",
        "target_x", "target_y", "path", "path_index",
        "mate_cooldown", "attack_cooldown",
        "_config",
    )

    def __init__(self, eid, x, y, species, config):
        self.id = eid
        self.x = x
        self.y = y
        self.species = species  # "HERBIVORE" or "CARNIVORE"
        self.state = AnimalState.IDLE
        self._config = config

        self.energy = config["max_energy"] * 0.8
        self.hunger = random.uniform(10, 30)
        self.thirst = random.uniform(10, 30)
        self.age = 0
        self.alive = True

        self.target_x = None
        self.target_y = None
        self.path = []
        self.path_index = 0

        self.mate_cooldown = 0
        self.attack_cooldown = 0

    @property
    def speed(self):
        return self._config["speed"]

    @property
    def vision_range(self):
        return self._config["vision_range"]

    @property
    def max_energy(self):
        return self._config["max_energy"]

    @property
    def max_age(self):
        return self._config["max_age"]

    @property
    def mature_age(self):
        return self._config["mature_age"]

    def energy_cost(self, action_name):
        return self._config["energy_costs"].get(action_name, 0)

    def apply_energy_cost(self, action_name):
        cost = self.energy_cost(action_name)
        self.energy = max(0, min(self._config["max_energy"], self.energy - cost))

    def tick_needs(self):
        """Increase hunger and thirst each tick."""
        self.hunger = min(self._config["max_hunger"], self.hunger + self._config["hunger_rate"])
        self.thirst = min(self._config["max_thirst"], self.thirst + self._config["thirst_rate"])
        self.age += 1
        if self.mate_cooldown > 0:
            self.mate_cooldown -= 1
        if self.attack_cooldown > 0:
            self.attack_cooldown -= 1

    def to_dict(self):
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "species": self.species,
            "state": int(self.state),
            "energy": round(self.energy, 1),
            "hunger": round(self.hunger, 1),
            "thirst": round(self.thirst, 1),
            "age": self.age,
            "alive": self.alive,
        }
