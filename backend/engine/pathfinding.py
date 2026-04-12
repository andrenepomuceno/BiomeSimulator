"""Pathfinding — bounded A* on the terrain grid."""

import heapq


def a_star(start_x, start_y, goal_x, goal_y, world, max_dist=50):
    """A* pathfinding from (start_x, start_y) to (goal_x, goal_y).

    Returns a list of (x, y) waypoints, or empty list if no path found.
    Limited to max_dist expansion radius to keep it fast.
    """
    if start_x == goal_x and start_y == goal_y:
        return []

    # Quick check: goal must be walkable (or water-adjacent for drinking)
    if not world.is_walkable(goal_x, goal_y):
        # If goal is water, find nearest walkable tile adjacent to it
        found = False
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = goal_x + dx, goal_y + dy
                if world.is_walkable(nx, ny):
                    goal_x, goal_y = nx, ny
                    found = True
                    break
            if found:
                break
        if not found:
            return []

    open_set = []
    heapq.heappush(open_set, (0, start_x, start_y))
    came_from = {}
    g_score = {(start_x, start_y): 0}
    visited = set()

    while open_set:
        _, cx, cy = heapq.heappop(open_set)

        if (cx, cy) in visited:
            continue
        visited.add((cx, cy))

        if cx == goal_x and cy == goal_y:
            # Reconstruct path
            path = []
            current = (goal_x, goal_y)
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.reverse()
            return path

        # Check expansion limit
        if abs(cx - start_x) + abs(cy - start_y) > max_dist:
            continue

        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if (nx, ny) in visited:
                continue
            if not world.is_walkable(nx, ny):
                continue

            ng = g_score[(cx, cy)] + 1
            if ng < g_score.get((nx, ny), float("inf")):
                g_score[(nx, ny)] = ng
                came_from[(nx, ny)] = (cx, cy)
                h = abs(nx - goal_x) + abs(ny - goal_y)
                heapq.heappush(open_set, (ng + h, nx, ny))

    return []  # No path found
