# EcoFlow Energy Card

> **This is a work in progress.** This card was vibe-coded and is not optimized. It is merely an attempt to bring the quick glance-over experience from the EcoFlow app into Home Assistant. Expect rough edges, breaking changes, and things that don't quite work yet. Use at your own risk.

A custom Home Assistant Lovelace card inspired by the EcoFlow energy flow visualization UI — solar, battery, grid, and home consumption at a glance with animated energy flow effects.

## Installation

### HACS

1. **HACS** > three-dot menu > **Custom repositories**
2. Add `https://github.com/dev-franco/ha-ecoflow-energy-card` as **Dashboard**
3. Install and hard refresh your browser (Ctrl+Shift+R)

### Manual

1. Download `dist/ecoflow-energy-card.js` and add it to your HA `config/www/` folder
2. Add `/local/ecoflow-energy-card.js` as a **JavaScript Module** resource in your dashboard settings

## Usage

```yaml
type: custom:ecoflow-energy-card
solar_power: sensor.your_solar_power
grid_power: sensor.your_grid_power
battery_power: sensor.your_battery_power
battery_soc: sensor.your_battery_level
home_consumption: sensor.your_home_consumption
```

## License

MIT
