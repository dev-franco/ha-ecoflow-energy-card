# EcoFlow Energy Card

A custom Home Assistant Lovelace card inspired by the EcoFlow energy flow visualization. Shows solar generation, battery status, grid input, and home consumption with animated photon energy flow effects.

## Features

- 3D house illustration with solar panels as backdrop
- Animated photon/comet energy flow effects (bright tip with fading trail)
- Dual-line system: pointer lines for labels + energy flow lines tracing the inverter hub
- Auto-detects flow direction (charging/discharging, import/export)
- Auto-scales W to kW
- Configurable labels and colors
- Visual card editor in HA UI
- Self-contained: house image is embedded (no extra files to copy)
- HACS compatible

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click the three dots in the top-right corner and select **Custom repositories**
3. Add this repository URL and select **Dashboard** as the category
4. Click **Install**
5. Refresh your browser (hard refresh: Ctrl+Shift+R)

### Manual Installation

1. Download `ecoflow-energy-card.js` from the `dist/` folder
2. Copy it to your Home Assistant `config/www/` directory
3. Add the resource in your HA dashboard:
   - Go to **Settings** > **Dashboards** > three-dot menu > **Resources**
   - Add `/local/ecoflow-energy-card.js` as a **JavaScript Module**
4. Refresh your browser

## Configuration

### Minimal Configuration

```yaml
type: custom:ecoflow-energy-card
solar_power: sensor.ecoflow_solar_power
```

### Full Configuration

```yaml
type: custom:ecoflow-energy-card
solar_power: sensor.ecoflow_solar_power
grid_power: sensor.ecoflow_grid_power
battery_power: sensor.ecoflow_battery_power
battery_soc: sensor.ecoflow_battery_soc
home_consumption: sensor.ecoflow_home_consumption
# Custom background (optional — embedded image used by default)
# background_image: /local/my-custom-house.png
# Labels
grid_label: "Grid"
solar_label: "Solar"
home_label: "Home"
battery_charging_label: "Charging"
battery_discharging_label: "Discharging"
battery_idle_label: "Idle"
# Power unit displayed
power_unit: "kW"
# Colors
solar_color: "#f5c542"
grid_color: "#a0a0a0"
battery_color: "#66bb6a"
home_color: "#4fc3f7"
# Options
animate: true
auto_scale: true
```

### Entities

| Option | Required | Description |
|---|---|---|
| `solar_power` | **Yes** | Solar generation power sensor |
| `grid_power` | No | Grid power (positive = importing, negative = exporting) |
| `battery_power` | No | Battery power (positive = charging, negative = discharging) |
| `battery_soc` | No | Battery state of charge (0-100%) |
| `home_consumption` | No | Total home power consumption |

### Sign Conventions

- **Grid**: positive value = importing from grid, negative = exporting to grid
- **Battery**: positive value = charging, negative = discharging

### Auto-scaling

The card detects if your sensors report in **W** and automatically converts to **kW** for display. Set `auto_scale: false` to disable this.

### Custom Background Image

The card includes an embedded house illustration by default. To use your own image, place it in your HA `www/` folder and set:

```yaml
background_image: /local/my-house.png
```

Note: the energy flow line coordinates are tuned for the default image. A custom image may require adjusting the flow paths in the card source.

## License

MIT
