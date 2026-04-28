/* ════════════════════════════════════════════════════════
   WEATHER.JS — Météo en temps réel via Open-Meteo
   Pas de clé API nécessaire
   ════════════════════════════════════════════════════════ */

import { get, set } from './storage.js';

const CITIES = {
  tampon:   { name: 'Le Tampon',    lat: -21.2781, lon: 55.5162 },
  saintpaul:{ name: 'Saint-Paul',   lat: -20.9959, lon: 55.2733 },
  saintdenis:{ name:'Saint-Denis',  lat: -20.8823, lon: 55.4504 },
  saintpierre:{ name:'Saint-Pierre',lat: -21.3395, lon: 55.4781 },
};

/* Correspondance code météo → emoji + description */
const WMO = {
  0:  ['☀️',  'Ciel dégagé'],
  1:  ['🌤️', 'Peu nuageux'],
  2:  ['⛅',  'Partiellement nuageux'],
  3:  ['☁️',  'Couvert'],
  45: ['🌫️', 'Brouillard'],
  48: ['🌫️', 'Givre'],
  51: ['🌦️', 'Bruine légère'],
  53: ['🌦️', 'Bruine modérée'],
  55: ['🌧️', 'Bruine dense'],
  61: ['🌧️', 'Pluie légère'],
  63: ['🌧️', 'Pluie modérée'],
  65: ['🌧️', 'Pluie forte'],
  71: ['🌨️', 'Neige légère'],
  80: ['🌦️', 'Averses légères'],
  81: ['🌧️', 'Averses modérées'],
  82: ['⛈️',  'Averses violentes'],
  95: ['⛈️',  'Orage'],
  99: ['⛈️',  'Orage avec grêle'],
};

function getWMO(code) {
  return WMO[code] ?? ['🌡️', 'Météo'];
}

/* ── Rendu de la carte météo ── */
function renderWeather(city, data) {
  const article = document.querySelector('#weather-card');
  if (!article) return;

  const current = data.current;
  const [icon, desc] = getWMO(current.weather_code);
  const tempRes = Math.round(current.apparent_temperature);
  const temp    = Math.round(current.temperature_2m);
  const humid   = current.relative_humidity_2m;
  const wind    = Math.round(current.wind_speed_10m);
  const uv      = Math.round(data.daily?.uv_index_max?.[0] ?? 0);

  article.innerHTML = `
    <div class="card-header">
      <span class="card-title">Météo</span>
      <select class="weather-city-select" id="weather-city-select">
        ${Object.entries(CITIES).map(([k, c]) =>
          `<option value="${k}" ${k === city ? 'selected' : ''}>${c.name}</option>`
        ).join('')}
      </select>
    </div>
    <div class="weather-main">
      <span class="weather-icon">${icon}</span>
      <span class="weather-temp mono">${temp}°</span>
    </div>
    <p class="weather-desc">${desc}</p>
    <div class="weather-stats">
      <div class="weather-stat">
        <span class="ws-label">Ressenti</span>
        <span class="ws-val mono">${tempRes}°</span>
      </div>
      <div class="weather-stat">
        <span class="ws-label">Humidité</span>
        <span class="ws-val mono">${humid}%</span>
      </div>
      <div class="weather-stat">
        <span class="ws-label">Vent</span>
        <span class="ws-val mono">${wind} km/h</span>
      </div>
      <div class="weather-stat">
        <span class="ws-label">UV</span>
        <span class="ws-val mono">${uv}</span>
      </div>
    </div>
  `;

  /* Écouteur changement de ville */
  document.getElementById('weather-city-select').onchange = e => {
    set('weather_city', e.target.value);
    loadWeather(e.target.value);
  };
}

function renderError(city) {
  const article = document.querySelector('#weather-card');
  if (!article) return;
  article.innerHTML = `
    <div class="card-header">
      <span class="card-title">Météo</span>
      <select class="weather-city-select" id="weather-city-select">
        ${Object.entries(CITIES).map(([k, c]) =>
          `<option value="${k}" ${k === city ? 'selected' : ''}>${c.name}</option>`
        ).join('')}
      </select>
    </div>
    <p style="color:var(--muted);text-align:center;padding:1rem 0">Impossible de charger la météo</p>
  `;
  document.getElementById('weather-city-select').onchange = e => {
    set('weather_city', e.target.value);
    loadWeather(e.target.value);
  };
}

async function loadWeather(cityKey) {
  const city = CITIES[cityKey] || CITIES.tampon;
  const url = `https://api.open-meteo.com/v1/forecast?`
    + `latitude=${city.lat}&longitude=${city.lon}`
    + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`
    + `&daily=uv_index_max&timezone=Indian%2FReunion&forecast_days=1`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    renderWeather(cityKey, data);
  } catch {
    renderError(cityKey);
  }
}

export function initWeather() {
  const city = get('weather_city', 'tampon');
  loadWeather(city);
}
