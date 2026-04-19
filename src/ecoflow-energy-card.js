/**
 * EcoFlow Energy Card for Home Assistant
 *
 * A custom Lovelace card replicating the EcoFlow energy flow visualization.
 * Uses a house illustration as backdrop with animated energy flow overlay.
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
      // Image path — default assumes same directory as the card JS
      background_image: config.background_image || "/local/ecoflow-energy-card/house.png",
      // Labels
      grid_label: config.grid_label || "Grid",
      solar_label: config.solar_label || "Solar",
      home_label: config.home_label || "Home",
      battery_charging_label: config.battery_charging_label || "Charging",
      battery_discharging_label: config.battery_discharging_label || "Discharging",
      battery_idle_label: config.battery_idle_label || "Standby",
      power_unit: config.power_unit || "kW",
      // Colors
      solar_color: config.solar_color || "#f5c542",
      grid_color: config.grid_color || "#a0a0a0",
      battery_color: config.battery_color || "#66bb6a",
      home_color: config.home_color || "#4fc3f7",
      // Options
      animate: config.animate !== false,
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
    const val = parseFloat(this._hass.states[entityId].state);
    return isNaN(val) ? 0 : val;
  }

  _getEntityUnit(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return "";
    return this._hass.states[entityId].attributes.unit_of_measurement || "";
  }

  _formatPower(value, entityId) {
    const unit = this._getEntityUnit(entityId);
    if (this._config.auto_scale && unit === "W") value = value / 1000;
    const absVal = Math.abs(value);
    return absVal >= 10 ? absVal.toFixed(1) : absVal.toFixed(2);
  }

  _getRawPower(entityId) {
    let value = this._getEntityValue(entityId);
    if (this._config.auto_scale && this._getEntityUnit(entityId) === "W") value = value / 1000;
    return value;
  }

  _photon(pathId, color, direction, duration, pathLength) {
    const reverse = direction === 'rev';

    // Layered comet: all layers share the same LEADING edge (the bright tip).
    // Longer layers extend further BEHIND = the fading trail.
    const layers = [
      { len: Math.round(pathLength * 0.50), opacity: 0.06, width: 3 },
      { len: Math.round(pathLength * 0.35), opacity: 0.12, width: 3 },
      { len: Math.round(pathLength * 0.20), opacity: 0.25, width: 2.5 },
      { len: Math.round(pathLength * 0.10), opacity: 0.55, width: 2.5 },
      { len: Math.max(Math.round(pathLength * 0.04), 2), opacity: 1.0, width: 2, glow: true },
    ];

    const maxLen = layers[0].len;
    const gap = pathLength * 2 + maxLen;

    // Forward: align LEADING edges (end of dash = tip at front of motion)
    //   offset per layer so -offset + dashLen is the same for all
    // Reverse: align TRAILING edges (start of dash = tip at front of motion)
    //   same offset for all layers
    return layers.map(l => {
      let from, to;
      if (reverse) {
        // Trailing edges aligned: same offset for all, bright tip at start of dash
        // Sweep from end of path to start
        from = -(pathLength + maxLen);
        to = maxLen;
      } else {
        // Leading edges aligned: per-layer offset
        from = l.len + maxLen;
        to = l.len - pathLength - maxLen;
      }

      return `
      <use href="#${pathId}" fill="none" stroke="${color}" stroke-width="${l.width}"
           stroke-linecap="round" stroke-linejoin="round" opacity="${l.opacity}"
           stroke-dasharray="${l.len} ${gap}"${l.glow ? ' filter="url(#glow)"' : ''}>
        <animate attributeName="stroke-dashoffset" from="${from}" to="${to}"
                 dur="${duration}s" repeatCount="indefinite"/>
      </use>`;
    }).join('');
  }

  _render() {
    if (!this._config || !this._hass) return;

    const solarPower = this._getRawPower(this._config.solar_power);
    const gridPower = this._getRawPower(this._config.grid_power);
    const batteryPower = this._getRawPower(this._config.battery_power);
    const homePower = this._getRawPower(this._config.home_consumption);
    const batterySoc = this._getEntityValue(this._config.battery_soc);

    const gridFlowing = Math.abs(gridPower) > 0.01;
    const solarFlowing = Math.abs(solarPower) > 0.01;
    const batteryFlowing = Math.abs(batteryPower) > 0.01;
    const homeFlowing = Math.abs(homePower) > 0.01;
    const gridImporting = gridPower > 0;
    const batteryCharging = batteryPower > 0;

    let batteryLabel = this._config.battery_idle_label;
    if (batteryFlowing) {
      batteryLabel = batteryCharging
        ? this._config.battery_charging_label
        : this._config.battery_discharging_label;
    }

    const unit = this._config.power_unit;
    const animate = this._config.animate;
    const bgImage = this._config.background_image;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: #2d2d2d;
          color: #fff;
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
        }
        .top-labels {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px 8px;
        }
        .top-label {
          text-align: center;
        }
        .top-label .val {
          font-size: 17px;
          font-weight: 700;
          color: #fff;
        }
        .top-label .val-unit {
          font-size: 12px;
          font-weight: 400;
          color: #ccc;
        }
        .top-label .lbl {
          font-size: 11px;
          color: #888;
          margin-top: 2px;
        }
        .energy-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1209 / 864;
        }
        .bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        /* Data labels — clean floating text, no backgrounds */
        .val { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 700; fill: #fff; }
        .val-unit { font-size: 12px; font-weight: 400; fill: #ccc; }
        .lbl { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 400; fill: #888; }
        .batt-soc { font-size: 13px; font-weight: 700; }

        /* Thin pointer lines — just indicate which element a label refers to */
        .pointer {
          fill: none; stroke: rgba(255,255,255,0.25); stroke-width: 1; stroke-linecap: round;
        }

        /* Energy flow wire (static background) */
        .energy-bg {
          fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: 0.15;
        }
      </style>
      <ha-card>
        <div class="top-labels">
          <div class="top-label">
            <div><span class="val">${this._formatPower(gridPower, this._config.grid_power)}</span> <span class="val-unit">${unit}</span></div>
            <div class="lbl">${this._config.grid_label}</div>
          </div>
          <div class="top-label">
            <div><span class="val">${this._formatPower(solarPower, this._config.solar_power)}</span> <span class="val-unit">${unit}</span></div>
            <div class="lbl">${this._config.solar_label}</div>
          </div>
          <div class="top-label">
            <div><span class="val">${this._formatPower(homePower, this._config.home_consumption)}</span> <span class="val-unit">${unit}</span></div>
            <div class="lbl">${this._config.home_label}</div>
          </div>
        </div>
        <div class="energy-wrap">
          <img class="bg-img" src="${bgImage}" alt="House" />
          <svg class="overlay" viewBox="0 0 484 346" preserveAspectRatio="xMidYMid slice">
            <defs>
              <!--
                Pointer lines: thin, static — just point from labels to elements
                Coordinates mapped to house.png (484x346 viewBox):
                  Solar panels center: ~(230, 80)
                  Green window (Home): ~(345, 95)
                  Left wall (Grid):    ~(110, 160)
              -->
              <!-- Pointer lines from coordinate picker -->
              <path id="ptr-grid"  d="M 75,0 L 75,160"/>
              <path id="ptr-solar" d="M 240,0 L 240,80"/>
              <path id="ptr-home"  d="M 395,0 L 395,95"/>

              <!-- Energy flow paths from coordinate picker -->
              <path id="ef-solar-inv"   d="M 225,162 L 238,192 L 238,225"/>
              <path id="ef-grid-inv"    d="M 238,225 L 209,232 L 212,308 L 134,332 L 12,266"/>
              <path id="ef-inv-battery" d="M 238,225 L 240,261"/>
              <path id="ef-inv-home"    d="M 238,225 L 354,206"/>
            </defs>

            <!-- ====== LAYER 1: POINTER LINES (thin, static) ====== -->
            <use href="#ptr-grid"  class="pointer"/>
            <use href="#ptr-solar" class="pointer"/>
            <use href="#ptr-home"  class="pointer"/>

            <!-- ====== LAYER 2: ENERGY FLOW (static wires + animated pulses) ====== -->

            <!-- Static wire backgrounds -->
            <use href="#ef-solar-inv" class="energy-bg" stroke="${this._config.solar_color}"/>
            <use href="#ef-grid-inv" class="energy-bg" stroke="${this._config.grid_color}"/>
            <use href="#ef-inv-battery" class="energy-bg" stroke="${this._config.battery_color}"/>
            <use href="#ef-inv-home" class="energy-bg" stroke="${this._config.home_color}"/>

            <!-- Glow filter for pulse dots -->
            <defs>
              <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <!-- Solar → Inverter photon (path ~70px) -->
            ${solarFlowing && animate ? this._photon('ef-solar-inv', this._config.solar_color, 'fwd', 1.8, 70) : ''}

            <!-- Grid → Inverter photon (path ~326px) -->
            ${gridFlowing && animate ? this._photon('ef-grid-inv', this._config.grid_color, gridImporting ? 'rev' : 'fwd', 3, 326) : ''}

            <!-- Inverter → Battery photon (path ~36px) -->
            ${batteryFlowing && animate ? this._photon('ef-inv-battery', this._config.battery_color, batteryCharging ? 'fwd' : 'rev', 1.2, 36) : ''}

            <!-- Inverter → Home photon (path ~120px) -->
            ${homeFlowing && animate ? this._photon('ef-inv-home', this._config.home_color, 'fwd', 1.5, 120) : ''}

            <!-- ====== BATTERY LABEL ====== -->
            <text x="370" y="260" text-anchor="start" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              <tspan font-size="17" font-weight="700" fill="#fff">${this._formatPower(batteryPower, this._config.battery_power)}</tspan>
              <tspan font-size="12" fill="#ccc"> ${unit}</tspan>
              <tspan font-size="13" font-weight="700" fill="${this._config.battery_color}"> ${batteryCharging ? '↑' : batteryFlowing ? '↓' : ''} ${Math.round(batterySoc)}%</tspan>
            </text>
            <text x="370" y="276" text-anchor="start" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#888">${batteryLabel}</text>

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

  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }

  _render() {
    if (!this._hass) return;
    this.shadowRoot.innerHTML = `
      <style>
        .row { margin-bottom: 12px; }
        .row label { display: block; font-weight: 500; margin-bottom: 4px; font-size: 14px; color: var(--primary-text-color); }
        .row input { width: 100%; padding: 8px; border: 1px solid var(--divider-color, #ccc); border-radius: 4px; background: var(--card-background-color, #fff); color: var(--primary-text-color); font-size: 14px; box-sizing: border-box; }
        .section { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: var(--primary-text-color); }
        .section:first-child { margin-top: 0; }
      </style>
      <div>
        <div class="section">Entities</div>
        ${this._field("solar_power", "Solar Power", "Required")}
        ${this._field("grid_power", "Grid Power", "Optional")}
        ${this._field("battery_power", "Battery Power", "Optional")}
        ${this._field("battery_soc", "Battery SOC", "Optional")}
        ${this._field("home_consumption", "Home Consumption", "Optional")}
        <div class="section">Settings</div>
        ${this._textField("background_image", "Background Image", "/local/ecoflow-energy-card/house.png")}
        <div class="section">Labels</div>
        ${this._textField("grid_label", "Grid Label", "Stromnetz")}
        ${this._textField("solar_label", "Solar Label", "Solar")}
        ${this._textField("home_label", "Home Label", "Hausnetz")}
        ${this._textField("battery_charging_label", "Charging Label", "Aufladung")}
        ${this._textField("battery_discharging_label", "Discharging Label", "Entladung")}
      </div>`;
    this.shadowRoot.querySelectorAll("input").forEach(i =>
      i.addEventListener("change", e => this._changed(e.target.dataset.f, e.target.value))
    );
  }

  _field(f, l, h) {
    return `<div class="row"><label>${l} (${h})</label><input data-f="${f}" value="${this._config[f] || ''}" placeholder="sensor.ecoflow_..."/></div>`;
  }
  _textField(f, l, p) {
    return `<div class="row"><label>${l}</label><input data-f="${f}" value="${this._config[f] || ''}" placeholder="${p}"/></div>`;
  }
  _changed(f, v) {
    const c = { ...this._config };
    v === "" ? delete c[f] : (c[f] = v);
    this._config = c;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
  }
}

customElements.define("ecoflow-energy-card", EcoflowEnergyCard);
customElements.define("ecoflow-energy-card-editor", EcoflowEnergyCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ecoflow-energy-card",
  name: "EcoFlow Energy Card",
  description: "Energy flow visualization inspired by EcoFlow's app UI",
  preview: true,
});
