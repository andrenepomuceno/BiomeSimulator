"""Default configuration for the EcoGame simulation."""

DEFAULT_CONFIG = {
    # Map generation
    "map_width": 500,
    "map_height": 500,
    "sea_level": 0.38,
    "island_count": 5,
    "island_size_factor": 0.3,
    "seed": None,  # None = random

    # Simulation
    "ticks_per_second": 10,
    "ticks_per_day": 200,
    "day_fraction": 0.6,  # 60% daylight, 40% night

    # Flora
    "initial_plant_density": 0.15,  # fraction of eligible tiles
    "plant_types": {
        "GRASS": {"growth_rate": 1.0, "max_age": 300, "spread_chance": 0.02, "water_bonus": 1.5},
        "BUSH":  {"growth_rate": 0.5, "max_age": 800, "spread_chance": 0.01, "water_bonus": 1.3},
        "TREE":  {"growth_rate": 0.2, "max_age": 2000, "spread_chance": 0.005, "water_bonus": 1.2},
    },
    "plant_stage_thresholds": {
        # age thresholds to advance stage (multiplied by 1/growth_rate)
        "SEED": 0,
        "SPROUT": 20,
        "MATURE": 80,
        "FRUITING": 150,
    },
    "water_proximity_threshold": 10,  # tiles — plants within this range get water bonus

    # Fauna
    "initial_herbivore_count": 50,
    "initial_carnivore_count": 15,
    "animal_species": {
        "HERBIVORE": {
            "speed": 1,
            "vision_range": 8,
            "max_energy": 100,
            "max_hunger": 100,
            "max_thirst": 100,
            "max_age": 1500,
            "mature_age": 200,
            "attack_power": 2,
            "defense": 3,
            "energy_costs": {
                "IDLE": 0.1, "WALK": 0.5, "RUN": 1.5,
                "EAT": 0.3, "DRINK": 0.3, "SLEEP": -2.0,
                "ATTACK": 3.0, "MATE": 5.0, "FLEE": 1.5,
            },
            "hunger_rate": 0.3,
            "thirst_rate": 0.4,
        },
        "CARNIVORE": {
            "speed": 2,
            "vision_range": 12,
            "max_energy": 120,
            "max_hunger": 100,
            "max_thirst": 100,
            "max_age": 1200,
            "mature_age": 250,
            "attack_power": 8,
            "defense": 5,
            "energy_costs": {
                "IDLE": 0.15, "WALK": 0.6, "RUN": 2.0,
                "EAT": 0.3, "DRINK": 0.3, "SLEEP": -2.5,
                "ATTACK": 5.0, "MATE": 6.0, "FLEE": 2.0,
            },
            "hunger_rate": 0.5,
            "thirst_rate": 0.35,
        },
    },
}
