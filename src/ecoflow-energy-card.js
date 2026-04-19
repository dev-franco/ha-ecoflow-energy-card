/**
 * EcoFlow Energy Card for Home Assistant
 *
 * A custom Lovelace card that replicates the EcoFlow energy flow visualization,
 * showing solar generation, battery status, grid input, and home consumption
 * with animated energy flow lines.
 */

const CARD_VERSION = "1.0.0";

console.info(
  `%c ECOFLOW-ENERGY-CARD %c v${CARD_VERSION} `,
  "color: white; background: #e45e25; font-weight: bold; padding: 2px 4px;",
  "color: #e45e25; background: white; font-weight: bold; padding: 2px 4px;"
);

class EcoflowEnergyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  static get properties() {
    return {
      _config: {},
      _hass: {},
    };
  }

  setConfig(config) {
    if (!config.solar_power) {
      throw new Error("Please define solar_power entity");
    }
    this._config = {
      title: config.title || "",
      solar_power: config.solar_power,
      grid_power: config.grid_power || "",
      battery_power: config.battery_power || "",
      battery_soc: config.battery_soc || "",
      home_consumption: config.home_consumption || "",
      // Labels (defaults to German like EcoFlow, but configurable)
      grid_label: config.grid_label || "Stromnetz",
      solar_label: config.solar_label || "Solar",
      home_label: config.home_label || "Hausnetz",
      battery_label: config.battery_label || "Aufladung",
      battery_charging_label: config.battery_charging_label || "Aufladung",
      battery_discharging_label: config.battery_discharging_label || "Entladung",
      battery_idle_label: config.battery_idle_label || "Standby",
      // Units
      power_unit: config.power_unit || "kW",
      // Colors
      solar_color: config.solar_color || "#f5c542",
      grid_color: config.grid_color || "#a0a0a0",
      battery_color: config.battery_color || "#4fc3f7",
      home_color: config.home_color || "#66bb6a",
      // Options
      animate: config.animate !== false,
      show_house: config.show_house !== false,
      // Power values can be in W — auto-convert to kW
      auto_scale: config.auto_scale !== false,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _getEntityValue(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return 0;
    const state = this._hass.states[entityId];
    const val = parseFloat(state.state);
    if (isNaN(val)) return 0;
    return val;
  }

  _getEntityUnit(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return "";
    const state = this._hass.states[entityId];
    return state.attributes.unit_of_measurement || "";
  }

  _formatPower(value, entityId) {
    const unit = this._getEntityUnit(entityId);
    if (this._config.auto_scale) {
      // If source unit is W, convert to kW
      if (unit === "W") {
        value = value / 1000;
      }
    }
    // Show absolute value for display, sign is handled by flow direction
    const absVal = Math.abs(value);
    if (absVal >= 10) {
      return absVal.toFixed(1);
    }
    return absVal.toFixed(2);
  }

  _getRawPower(entityId) {
    let value = this._getEntityValue(entityId);
    const unit = this._getEntityUnit(entityId);
    if (this._config.auto_scale && unit === "W") {
      value = value / 1000;
    }
    return value;
  }

  _render() {
    if (!this._config || !this._hass) return;

    const solarPower = this._getRawPower(this._config.solar_power);
    const gridPower = this._getRawPower(this._config.grid_power);
    const batteryPower = this._getRawPower(this._config.battery_power);
    const homePower = this._getRawPower(this._config.home_consumption);
    const batterySoc = this._getEntityValue(this._config.battery_soc);

    // Determine flow directions
    // Grid: positive = importing from grid, negative = exporting to grid
    // Battery: positive = charging, negative = discharging
    // Solar: always positive (generation)
    // Home: always positive (consumption)

    const gridFlowing = Math.abs(gridPower) > 0.01;
    const solarFlowing = Math.abs(solarPower) > 0.01;
    const batteryFlowing = Math.abs(batteryPower) > 0.01;
    const homeFlowing = Math.abs(homePower) > 0.01;

    const gridImporting = gridPower > 0;
    const batteryCharging = batteryPower > 0;

    // Battery label
    let batteryLabel = this._config.battery_idle_label;
    if (batteryFlowing) {
      batteryLabel = batteryCharging
        ? this._config.battery_charging_label
        : this._config.battery_discharging_label;
    }

    const unit = this._config.power_unit;
    const animate = this._config.animate;

    // Battery icon fill based on SOC
    const batteryFillHeight = (batterySoc / 100) * 28;
    const batteryFillY = 36 - batteryFillHeight;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          background: #1a1a2e;
          color: #ffffff;
          padding: 16px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }
        .card-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 12px;
          color: #ccc;
        }
        .energy-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          min-height: 280px;
        }
        .energy-svg {
          width: 100%;
          height: 100%;
        }

        /* Power value labels */
        .power-value {
          font-size: 16px;
          font-weight: 700;
          fill: #ffffff;
        }
        .power-label {
          font-size: 11px;
          font-weight: 400;
          fill: #999999;
        }
        .power-unit {
          font-size: 12px;
          font-weight: 400;
          fill: #cccccc;
        }
        .battery-soc {
          font-size: 12px;
          font-weight: 600;
        }
        .battery-status {
          font-size: 11px;
          fill: #999999;
        }

        /* Flow line animations */
        @keyframes flowForward {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes flowReverse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 20; }
        }
        .flow-line {
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .flow-line-bg {
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          opacity: 0.15;
        }
        .flow-line-animated {
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 6 14;
        }
        .flow-forward {
          animation: flowForward 1s linear infinite;
        }
        .flow-reverse {
          animation: flowReverse 1s linear infinite;
        }

        /* Dot animations */
        @keyframes moveDot {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        .flow-dot {
          r: 3;
          offset-distance: 0%;
          animation: moveDot 2s linear infinite;
        }

        /* House illustration */
        .house-body {
          fill: #d4a373;
          opacity: 0.9;
        }
        .house-roof {
          fill: #8b4513;
          opacity: 0.9;
        }
        .house-window {
          fill: #ffd700;
          opacity: 0.6;
        }
        .house-door {
          fill: #654321;
          opacity: 0.9;
        }
        .solar-panel {
          fill: #cc3300;
          opacity: 0.85;
          stroke: #333;
          stroke-width: 0.5;
        }

        /* Icons */
        .icon-circle {
          stroke-width: 2;
          fill: none;
          opacity: 0.3;
        }
      </style>
      <ha-card>
        ${this._config.title ? `<div class="card-title">${this._config.title}</div>` : ""}
        <div class="energy-container">
          <svg class="energy-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Glow filters -->
              <filter id="glow-solar" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feFlood flood-color="${this._config.solar_color}" flood-opacity="0.4"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-grid" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feFlood flood-color="${this._config.grid_color}" flood-opacity="0.4"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-battery" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feFlood flood-color="${this._config.battery_color}" flood-opacity="0.4"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-home" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feFlood flood-color="${this._config.home_color}" flood-opacity="0.4"/>
                <feComposite in2="blur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <!-- Flow paths -->
              <path id="flow-grid" d="M 70,55 C 70,120 140,120 170,150" />
              <path id="flow-solar" d="M 200,55 L 200,130" />
              <path id="flow-home" d="M 330,55 C 330,120 260,120 230,150" />
              <path id="flow-battery" d="M 200,200 L 200,248" />
            </defs>

            <!-- =============== HOUSE ILLUSTRATION =============== -->
            ${this._config.show_house ? `
            <g transform="translate(200, 165)" class="house-group">
              <!-- House body -->
              <rect x="-45" y="-10" width="90" height="55" rx="2" class="house-body" />

              <!-- Door -->
              <rect x="-8" y="15" width="16" height="30" rx="1" class="house-door" />
              <circle cx="-3" cy="32" r="1.5" fill="#aaa" />

              <!-- Windows -->
              <rect x="-35" y="2" width="16" height="14" rx="1" class="house-window" />
              <rect x="19" y="2" width="16" height="14" rx="1" class="house-window" />
              <line x1="-35" y1="9" x2="-19" y2="9" stroke="#b8860b" stroke-width="0.5" />
              <line x1="-27" y1="2" x2="-27" y2="16" stroke="#b8860b" stroke-width="0.5" />
              <line x1="19" y1="9" x2="35" y2="9" stroke="#b8860b" stroke-width="0.5" />
              <line x1="27" y1="2" x2="27" y2="16" stroke="#b8860b" stroke-width="0.5" />

              <!-- Roof -->
              <polygon points="-55,-10 0,-48 55,-10" class="house-roof" />

              <!-- Solar panels on roof -->
              <g transform="translate(-2, -34) rotate(-24)">
                <rect x="0" y="0" width="14" height="10" rx="1" class="solar-panel" />
                <rect x="16" y="0" width="14" height="10" rx="1" class="solar-panel" />
                <rect x="0" y="12" width="14" height="10" rx="1" class="solar-panel" />
                <rect x="16" y="12" width="14" height="10" rx="1" class="solar-panel" />
                <!-- Panel grid lines -->
                <line x1="7" y1="0" x2="7" y2="10" stroke="#222" stroke-width="0.3"/>
                <line x1="0" y1="5" x2="14" y2="5" stroke="#222" stroke-width="0.3"/>
                <line x1="23" y1="0" x2="23" y2="10" stroke="#222" stroke-width="0.3"/>
                <line x1="16" y1="5" x2="30" y2="5" stroke="#222" stroke-width="0.3"/>
                <line x1="7" y1="12" x2="7" y2="22" stroke="#222" stroke-width="0.3"/>
                <line x1="0" y1="17" x2="14" y2="17" stroke="#222" stroke-width="0.3"/>
                <line x1="23" y1="12" x2="23" y2="22" stroke="#222" stroke-width="0.3"/>
                <line x1="16" y1="17" x2="30" y2="17" stroke="#222" stroke-width="0.3"/>
              </g>
            </g>
            ` : ""}

            <!-- =============== FLOW LINES =============== -->

            <!-- Grid flow line -->
            <use href="#flow-grid" class="flow-line-bg" stroke="${this._config.grid_color}" />
            ${gridFlowing && animate ? `
              <use href="#flow-grid" class="flow-line-animated ${gridImporting ? "flow-forward" : "flow-reverse"}"
                   stroke="${this._config.grid_color}" filter="url(#glow-grid)" />
            ` : ""}

            <!-- Solar flow line -->
            <use href="#flow-solar" class="flow-line-bg" stroke="${this._config.solar_color}" />
            ${solarFlowing && animate ? `
              <use href="#flow-solar" class="flow-line-animated flow-forward"
                   stroke="${this._config.solar_color}" filter="url(#glow-solar)" />
            ` : ""}

            <!-- Home flow line -->
            <use href="#flow-home" class="flow-line-bg" stroke="${this._config.home_color}" />
            ${homeFlowing && animate ? `
              <use href="#flow-home" class="flow-line-animated flow-forward"
                   stroke="${this._config.home_color}" filter="url(#glow-home)" />
            ` : ""}

            <!-- Battery flow line -->
            <use href="#flow-battery" class="flow-line-bg" stroke="${this._config.battery_color}" />
            ${batteryFlowing && animate ? `
              <use href="#flow-battery" class="flow-line-animated ${batteryCharging ? "flow-forward" : "flow-reverse"}"
                   stroke="${this._config.battery_color}" filter="url(#glow-battery)" />
            ` : ""}

            <!-- =============== GRID NODE (top-left) =============== -->
            <g transform="translate(70, 30)">
              <!-- Grid icon: power tower -->
              <svg x="-12" y="-18" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L8 8h8L12 2z" fill="${this._config.grid_color}" opacity="0.8"/>
                <path d="M10 8v14M14 8v14" stroke="${this._config.grid_color}" stroke-width="1.5" opacity="0.8"/>
                <path d="M7 14h10M8 18h8" stroke="${this._config.grid_color}" stroke-width="1" opacity="0.6"/>
              </svg>
              <text x="0" y="18" text-anchor="middle" class="power-value">
                ${this._formatPower(gridPower, this._config.grid_power)} <tspan class="power-unit">${unit}</tspan>
              </text>
              <text x="0" y="32" text-anchor="middle" class="power-label">${this._config.grid_label}</text>
            </g>

            <!-- =============== SOLAR NODE (top-center) =============== -->
            <g transform="translate(200, 30)">
              <!-- Sun icon -->
              <svg x="-12" y="-18" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" fill="${this._config.solar_color}" opacity="0.9"/>
                <g stroke="${this._config.solar_color}" stroke-width="1.5" opacity="0.7">
                  <line x1="12" y1="1" x2="12" y2="4"/>
                  <line x1="12" y1="20" x2="12" y2="23"/>
                  <line x1="1" y1="12" x2="4" y2="12"/>
                  <line x1="20" y1="12" x2="23" y2="12"/>
                  <line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/>
                  <line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/>
                  <line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/>
                  <line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>
                </g>
              </svg>
              <text x="0" y="18" text-anchor="middle" class="power-value">
                ${this._formatPower(solarPower, this._config.solar_power)} <tspan class="power-unit">${unit}</tspan>
              </text>
              <text x="0" y="32" text-anchor="middle" class="power-label">${this._config.solar_label}</text>
            </g>

            <!-- =============== HOME NODE (top-right) =============== -->
            <g transform="translate(330, 30)">
              <!-- Home/plug icon -->
              <svg x="-12" y="-18" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 12L12 3l9 9" stroke="${this._config.home_color}" stroke-width="1.5" fill="none" opacity="0.8"/>
                <rect x="7" y="12" width="10" height="9" rx="1" fill="${this._config.home_color}" opacity="0.6"/>
                <rect x="10" y="15" width="4" height="6" fill="#1a1a2e"/>
              </svg>
              <text x="0" y="18" text-anchor="middle" class="power-value">
                ${this._formatPower(homePower, this._config.home_consumption)} <tspan class="power-unit">${unit}</tspan>
              </text>
              <text x="0" y="32" text-anchor="middle" class="power-label">${this._config.home_label}</text>
            </g>

            <!-- =============== BATTERY NODE (bottom-center) =============== -->
            <g transform="translate(200, 260)">
              <!-- Battery icon -->
              <svg x="-20" y="-12" width="40" height="40" viewBox="0 0 50 50" fill="none">
                <!-- Battery outline -->
                <rect x="5" y="8" width="40" height="34" rx="3" stroke="${this._config.battery_color}" stroke-width="2" fill="none" opacity="0.6"/>
                <!-- Battery terminal -->
                <rect x="18" y="3" width="14" height="6" rx="2" fill="${this._config.battery_color}" opacity="0.5"/>
                <!-- Battery fill -->
                <rect x="8" y="${batteryFillY + 8}" width="34" height="${batteryFillHeight}" rx="1"
                      fill="${this._config.battery_color}" opacity="0.5"/>
                <!-- SOC text inside battery -->
                <text x="25" y="30" text-anchor="middle" font-size="12" font-weight="bold"
                      fill="${this._config.battery_color}" class="battery-soc">${Math.round(batterySoc)}%</text>
              </svg>
              <text x="0" y="32" text-anchor="middle" class="power-value">
                ${this._formatPower(batteryPower, this._config.battery_power)} <tspan class="power-unit">${unit}</tspan>
              </text>
              <text x="30" y="32" text-anchor="start" class="battery-soc" fill="${this._config.battery_color}">
                ${batteryCharging ? "↑" : batteryFlowing ? "↓" : ""} ${Math.round(batterySoc)}%
              </text>
              <text x="0" y="46" text-anchor="middle" class="battery-status">${batteryLabel}</text>
            </g>
          </svg>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 5;
  }

  static getConfigElement() {
    return document.createElement("ecoflow-energy-card-editor");
  }

  static getStubConfig() {
    return {
      solar_power: "",
      grid_power: "",
      battery_power: "",
      battery_soc: "",
      home_consumption: "",
    };
  }
}

// =============== VISUAL EDITOR ===============
class EcoflowEnergyCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass) return;

    this.shadowRoot.innerHTML = `
      <style>
        .editor-row {
          margin-bottom: 12px;
        }
        .editor-row label {
          display: block;
          font-weight: 500;
          margin-bottom: 4px;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        .editor-row input, .editor-row select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 14px;
          box-sizing: border-box;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin: 16px 0 8px 0;
          color: var(--primary-text-color);
        }
        .section-title:first-child {
          margin-top: 0;
        }
      </style>
      <div>
        <div class="section-title">Entities</div>
        ${this._renderEntityField("solar_power", "Solar Power", "Required")}
        ${this._renderEntityField("grid_power", "Grid Power", "Optional")}
        ${this._renderEntityField("battery_power", "Battery Power", "Optional")}
        ${this._renderEntityField("battery_soc", "Battery State of Charge", "Optional")}
        ${this._renderEntityField("home_consumption", "Home Consumption", "Optional")}

        <div class="section-title">Labels</div>
        ${this._renderTextField("grid_label", "Grid Label", "Stromnetz")}
        ${this._renderTextField("solar_label", "Solar Label", "Solar")}
        ${this._renderTextField("home_label", "Home Label", "Hausnetz")}
        ${this._renderTextField("battery_charging_label", "Battery Charging Label", "Aufladung")}
        ${this._renderTextField("battery_discharging_label", "Battery Discharging Label", "Entladung")}
        ${this._renderTextField("battery_idle_label", "Battery Idle Label", "Standby")}
      </div>
    `;

    // Attach event listeners
    this.shadowRoot.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", (e) => {
        this._valueChanged(e.target.dataset.field, e.target.value);
      });
    });
  }

  _renderEntityField(field, label, hint) {
    const value = this._config[field] || "";
    return `
      <div class="editor-row">
        <label>${label} (${hint})</label>
        <input type="text" data-field="${field}" value="${value}"
               placeholder="sensor.ecoflow_..." />
      </div>
    `;
  }

  _renderTextField(field, label, placeholder) {
    const value = this._config[field] || "";
    return `
      <div class="editor-row">
        <label>${label}</label>
        <input type="text" data-field="${field}" value="${value}"
               placeholder="${placeholder}" />
      </div>
    `;
  }

  _valueChanged(field, value) {
    if (!this._config || !this._hass) return;
    const newConfig = { ...this._config };
    if (value === "") {
      delete newConfig[field];
    } else {
      newConfig[field] = value;
    }
    this._config = newConfig;
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Register custom elements
customElements.define("ecoflow-energy-card", EcoflowEnergyCard);
customElements.define("ecoflow-energy-card-editor", EcoflowEnergyCardEditor);

// Register with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ecoflow-energy-card",
  name: "EcoFlow Energy Card",
  description: "Energy flow visualization inspired by EcoFlow's app UI",
  preview: true,
  documentationURL: "https://github.com/your-username/ha-ecoflow-energy-card",
});
