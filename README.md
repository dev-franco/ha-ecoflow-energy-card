# EcoFlow Energy Card

A custom Home Assistant Lovelace card that replicates the EcoFlow energy flow visualization UI. Shows solar generation, battery status, grid input, and home consumption with animated energy flow lines.

![EcoFlow Energy Card Preview](docs/preview.png)

## Features

- House illustration with solar panels
- Animated energy flow lines between components
- Auto-detects flow direction (charging/discharging, import/export)
- Auto-scales W to kW
- Configurable labels (defaults to German like EcoFlow)
- Configurable colors
- Visual card editor in HA UI
- HACS compatible

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click the three dots in the top-right corner and select **Custom repositories**
3. Add this repository URL and select **Lovelace** as the category
4. Click **Install**
5. Refresh your browser (hard refresh: Ctrl+Shift+R)

### Manual Installation

1. Download `ecoflow-energy-card.js` from the [latest release](../../releases/latest) (or from the `dist/` folder)
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
title: "Energy Flow"
solar_power: sensor.ecoflow_solar_power
grid_power: sensor.ecoflow_grid_power
battery_power: sensor.ecoflow_battery_power
battery_soc: sensor.ecoflow_battery_soc
home_consumption: sensor.ecoflow_home_consumption
# Labels (customize to your language)
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
battery_color: "#4fc3f7"
home_color: "#66bb6a"
# Options
animate: true
show_house: true
auto_scale: true
```

### Entity Configuration Notes

| Option | Required | Description |
|---|---|---|
| `solar_power` | Yes | Solar generation power sensor |
| `grid_power` | No | Grid power sensor (positive = importing, negative = exporting) |
| `battery_power` | No | Battery power sensor (positive = charging, negative = discharging) |
| `battery_soc` | No | Battery state of charge (0-100%) |
| `home_consumption` | No | Total home power consumption sensor |

### Auto-scaling

By default, the card detects if your sensors report in **W** and automatically converts to **kW**. Set `auto_scale: false` to disable this.

## Development

```bash
git clone https://github.com/your-username/ha-ecoflow-energy-card.git
cd ha-ecoflow-energy-card
# Edit src/ecoflow-energy-card.js
npm run build
```

## License

MIT
