#!/bin/sh
set -e

LAYOUT_FILE="/usr/share/nginx/html/default-layout.json"

echo "========================================"
echo " Seating App - Startup"
echo "========================================"

if [ -f "$LAYOUT_FILE" ]; then
    echo "[default-layout] File found: $LAYOUT_FILE"

    # Validate JSON syntax
    if ! jq empty "$LAYOUT_FILE" 2>/dev/null; then
        echo "[default-layout] ERROR: File is not valid JSON!"
        echo "[default-layout] The app will fall back to built-in defaults."
    else
        echo "[default-layout] Valid JSON: yes"

        # Extract stats
        ZONES=$(jq '.zones | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        TOTAL_DESKS=$(jq '[.zones[]? | .rows * .cols] | add // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        EMPLOYEES=$(jq '.employees | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        DEPARTMENTS=$(jq '[.employees[]?.department] | unique | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        DEPT_COLORS=$(jq '.departmentColors | keys | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        ASSIGNMENTS=$(jq '[.seating | to_entries[]? | select(.value != null)] | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        PINNED=$(jq '.pinnedDesks | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        UNAVAILABLE=$(jq '.unavailableDesks | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")
        DESK_NAMES=$(jq '.deskNames | length // 0' "$LAYOUT_FILE" 2>/dev/null || echo "0")

        echo "[default-layout] Stats:"
        echo "[default-layout]   Zones:              $ZONES"
        echo "[default-layout]   Total desks:         $TOTAL_DESKS"
        echo "[default-layout]   Employees:           $EMPLOYEES"
        echo "[default-layout]   Departments:         $DEPARTMENTS"
        echo "[default-layout]   Dept colors defined: $DEPT_COLORS"
        echo "[default-layout]   Seated assignments:  $ASSIGNMENTS"
        echo "[default-layout]   Pinned desks:        $PINNED"
        echo "[default-layout]   Unavailable desks:   $UNAVAILABLE"
        echo "[default-layout]   Custom desk names:   $DESK_NAMES"

        # List zone names
        ZONE_NAMES=$(jq -r '.zones[]?.name // empty' "$LAYOUT_FILE" 2>/dev/null)
        if [ -n "$ZONE_NAMES" ]; then
            echo "[default-layout]   Zone names:"
            echo "$ZONE_NAMES" | while IFS= read -r name; do
                echo "[default-layout]     - $name"
            done
        fi

        # Warn about potential issues
        if [ "$ZONES" = "0" ]; then
            echo "[default-layout] WARNING: No zones defined. Layout will use built-in zone defaults."
        fi
        if [ "$EMPLOYEES" = "0" ]; then
            echo "[default-layout] WARNING: No employees defined. People list will use built-in defaults."
        fi
    fi
else
    echo "[default-layout] No default-layout.json found."
    echo "[default-layout] The app will use built-in defaults for new visitors."
    echo "[default-layout] To set a custom default, mount a JSON file at:"
    echo "[default-layout]   $LAYOUT_FILE"
    echo "[default-layout] Example docker-compose volume:"
    echo "[default-layout]   volumes:"
    echo "[default-layout]     - ./default-layout.json:/usr/share/nginx/html/default-layout.json:ro"
fi

echo "========================================"
echo " Starting nginx..."
echo "========================================"

exec nginx -g "daemon off;"
