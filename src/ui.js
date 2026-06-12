import { STATE } from './game.js';

let els = {};
let vibrationEnabled = true;
let destroyedModalTimer = null;

export function initUI() {
  els = {
    rpmValue: document.getElementById('rpm-value'),
    rpmGhostValue: document.getElementById('rpm-value-ghost'),
    tapsValue: document.getElementById('taps-value'),
    bestValue: document.getElementById('best-value'),
    coinValue: document.getElementById('coin-value'),
    coinsEarned: document.getElementById('coins-earned'),
    speedBar: document.getElementById('speed-bar-fill'),
    speedBarContainer: document.getElementById('speed-bar'),
    startPrompt: document.getElementById('start-prompt'),
    dangerBanner: document.getElementById('danger-banner'),
    gameOverModal: document.getElementById('game-over-modal'),
    finalScore: document.getElementById('final-score'),
    newBestBadge: document.getElementById('new-best-badge'),
    retryBtn: document.getElementById('retry-btn'),
    homeBtn: document.getElementById('home-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    soundToggle: document.getElementById('sound-toggle'),
    vibrationToggle: document.getElementById('vibration-toggle'),
    upgradePanelBtn: document.getElementById('upgrade-panel-btn'),
    garagePanelBtn: document.getElementById('garage-panel-btn'),
    upgradePanel: document.getElementById('upgrade-panel'),
    garagePanel: document.getElementById('garage-panel'),
    fanShop: document.getElementById('fan-shop'),
    themeShop: document.getElementById('theme-shop'),
    tapArea: document.getElementById('tap-area'),
    rpmLabel: document.getElementById('rpm-label'),
    tapsLabel: document.getElementById('taps-label'),

    // Home screen UI
    homeScreen: document.getElementById('home-screen'),
    playBtnLarge: document.getElementById('play-btn-large'),
    profileUsername: document.getElementById('profile-username'),
    usernameInput: document.getElementById('username-input'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    profileSelect: document.getElementById('profile-select'),
    statsDestroyed: document.getElementById('stats-destroyed'),
    statsTaps: document.getElementById('stats-taps'),
    statsBestRPM: document.getElementById('stats-best-rpm'),
    statsCollection: document.getElementById('stats-collection'),
    historyListContainer: document.getElementById('history-list-container'),

    // Upgrades specs panel
    upgradeActiveFanName: document.getElementById('upgrade-active-fan-name'),
    specSpeedVal: document.getElementById('spec-speed-val'),
    specDurabilityVal: document.getElementById('spec-durability-val'),
  };

  _showHome();
}

export function showHomeOverlay() {
  els.homeScreen?.classList.add('visible');
  hidePanels();
}

export function hideHomeOverlay() {
  els.homeScreen?.classList.remove('visible');
}

export function updateUI(data) {
  if (!els.rpmValue) return;

  const { state, rpm, taps, bestScore, speedPct, coins, activeUser, profiles, stats, history } = data;
  const rpmText = rpm.toLocaleString();

  els.rpmValue.textContent = rpmText;
  if (els.rpmGhostValue) els.rpmGhostValue.textContent = rpmText;
  els.tapsValue.textContent = taps.toLocaleString();
  els.bestValue.textContent = bestScore.toLocaleString();
  if (els.coinValue) els.coinValue.textContent = coins.toLocaleString();

  const barPct = Math.round(speedPct * 100);
  els.speedBar.style.width = `${barPct}%`;

  if (speedPct < 0.6) {
    els.speedBar.className = 'speed-bar-fill normal';
  } else if (speedPct < 0.85) {
    els.speedBar.className = 'speed-bar-fill warning';
  } else {
    els.speedBar.className = 'speed-bar-fill danger';
  }

  // Update upgrades active fan info
  if (els.upgradeActiveFanName) {
    els.upgradeActiveFanName.textContent = data.fan.name.toUpperCase();
    if (els.specSpeedVal) els.specSpeedVal.textContent = `${(data.fan.speedBase * (1 + data.upgrades.speed * 0.15)).toFixed(1)}x`;
    if (els.specDurabilityVal) els.specDurabilityVal.textContent = `${(data.fan.durabilityBase * (1 + data.upgrades.durability * 0.15)).toFixed(1)}x`;
  }

  _updateUpgradeCards(data);
  _renderShop(data);
  _updateProfileData(data);

  switch (state) {
    case STATE.LOBBY:
      _showHome();
      break;
    case STATE.IDLE:
      _showIdle();
      break;
    case STATE.PLAYING:
      _showPlaying();
      break;
    case STATE.DANGER:
      _showDanger();
      break;
    case STATE.DESTROYED:
      _showDestroyed(data);
      break;
    default:
      break;
  }
}

export function showTapRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'tap-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.appendChild(ripple);

  if (vibrationEnabled && navigator.vibrate) {
    navigator.vibrate(15);
  }

  setTimeout(() => ripple.remove(), 600);
}

export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'game-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 20);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 220);
  }, 1500);
}

export function flashScreen() {
  const flash = document.getElementById('screen-flash');
  if (!flash) return;

  flash.classList.add('active');

  if (vibrationEnabled && navigator.vibrate) {
    navigator.vibrate([90, 40, 180]);
  }

  setTimeout(() => flash.classList.remove('active'), 300);
}

export function getRetryBtn() { return els.retryBtn; }
export function getHomeBtn() { return els.homeBtn; }
export function getSettingsBtn() { return els.settingsBtn; }
export function getSoundToggle() { return els.soundToggle; }
export function getVibrationToggle() { return els.vibrationToggle; }
export function getUpgradePanelBtn() { return els.upgradePanelBtn; }
export function getGaragePanelBtn() { return els.garagePanelBtn; }
export function getTapArea() { return els.tapArea; }

// Home Screen Elements
export function getPlayBtnLarge() { return els.playBtnLarge; }
export function getLoginSubmitBtn() { return els.loginSubmitBtn; }
export function getUsernameInput() { return els.usernameInput; }
export function getProfileSelect() { return els.profileSelect; }

export function getUpgradeButtons() {
  return Array.from(document.querySelectorAll('[data-upgrade]'));
}

export function getFanButtons() {
  return Array.from(document.querySelectorAll('[data-fan-id]'));
}

export function getThemeButtons() {
  return Array.from(document.querySelectorAll('[data-theme-id]'));
}

export function getClosePanelButtons() {
  return Array.from(document.querySelectorAll('[data-close-panel]'));
}

export function setVibrationEnabled(v) { vibrationEnabled = v; }
export function getVibrationEnabled() { return vibrationEnabled; }

export function toggleSettingsPanel() {
  hidePanels();
  els.settingsPanel?.classList.toggle('visible');
}

export function toggleUpgradePanel() {
  els.settingsPanel?.classList.remove('visible');
  els.garagePanel?.classList.remove('visible');
  els.upgradePanel?.classList.toggle('visible');
}

export function toggleGaragePanel() {
  els.settingsPanel?.classList.remove('visible');
  els.upgradePanel?.classList.remove('visible');
  els.garagePanel?.classList.toggle('visible');
}

export function hidePanels() {
  els.settingsPanel?.classList.remove('visible');
  els.upgradePanel?.classList.remove('visible');
  els.garagePanel?.classList.remove('visible');
}

export function hideSettingsPanel() {
  els.settingsPanel?.classList.remove('visible');
}

export function hidePanelById(id) {
  document.getElementById(id)?.classList.remove('visible');
}

export function updateSoundIcon(muted) {
  if (els.soundToggle) els.soundToggle.textContent = muted ? 'OFF' : 'ON';
}

export function updateVibrationIcon(enabled) {
  if (els.vibrationToggle) els.vibrationToggle.textContent = enabled ? 'ON' : 'OFF';
}

function _showHome() {
  els.homeScreen?.classList.add('visible');
  els.startPrompt?.classList.remove('visible');
  els.dangerBanner?.classList.remove('visible');
  els.gameOverModal?.classList.remove('visible');
  els.speedBarContainer?.classList.remove('visible');
  els.rpmLabel?.classList.remove('visible');
  els.tapsLabel?.classList.remove('visible');
  document.body.classList.remove('danger-mode', 'destroyed-mode');
}

function _showIdle() {
  clearTimeout(destroyedModalTimer);
  destroyedModalTimer = null;
  els.homeScreen?.classList.remove('visible');
  els.startPrompt?.classList.add('visible');
  els.dangerBanner?.classList.remove('visible');
  els.gameOverModal?.classList.remove('visible');
  els.speedBarContainer?.classList.remove('visible');
  els.rpmLabel?.classList.remove('visible');
  els.tapsLabel?.classList.remove('visible');
  document.body.classList.remove('danger-mode', 'destroyed-mode');
}

function _showPlaying() {
  clearTimeout(destroyedModalTimer);
  destroyedModalTimer = null;
  els.homeScreen?.classList.remove('visible');
  els.startPrompt?.classList.remove('visible');
  els.dangerBanner?.classList.remove('visible');
  els.gameOverModal?.classList.remove('visible');
  els.speedBarContainer?.classList.add('visible');
  els.rpmLabel?.classList.add('visible');
  els.tapsLabel?.classList.add('visible');
  document.body.classList.remove('danger-mode', 'destroyed-mode');
}

function _showDanger() {
  clearTimeout(destroyedModalTimer);
  destroyedModalTimer = null;
  els.homeScreen?.classList.remove('visible');
  els.startPrompt?.classList.remove('visible');
  els.dangerBanner?.classList.add('visible');
  els.gameOverModal?.classList.remove('visible');
  els.speedBarContainer?.classList.add('visible');
  els.rpmLabel?.classList.add('visible');
  els.tapsLabel?.classList.add('visible');
  document.body.classList.add('danger-mode');
  document.body.classList.remove('destroyed-mode');
}

function _showDestroyed(data) {
  els.homeScreen?.classList.remove('visible');
  els.startPrompt?.classList.remove('visible');
  els.dangerBanner?.classList.remove('visible');
  els.speedBarContainer?.classList.remove('visible');
  document.body.classList.remove('danger-mode');
  document.body.classList.add('destroyed-mode');

  if (destroyedModalTimer) return;

  destroyedModalTimer = setTimeout(() => {
    if (els.finalScore) els.finalScore.textContent = data.taps.toLocaleString();
    if (els.coinsEarned) els.coinsEarned.textContent = data.runCoins.toLocaleString();
    if (els.newBestBadge) els.newBestBadge.classList.toggle('visible', data.taps >= data.bestScore);
    els.gameOverModal?.classList.add('visible');
  }, 650);
}

function _updateUpgradeCards(data) {
  ['speed', 'durability'].forEach((type) => {
    const info = document.getElementById(`upgrade-${type}-info`);
    const meta = data.upgradeMeta?.[type];
    if (!info || !meta) return;

    const level = data.upgrades[type] || 0;
    const maxed = level >= meta.max;
    info.textContent = maxed ? `LV ${level} MAX` : `LV ${level} - ${data.upgradeCosts[type]}C`;
  });
}

function _updateProfileData(data) {
  if (els.profileUsername) els.profileUsername.textContent = data.activeUser;
  if (els.statsDestroyed) els.statsDestroyed.textContent = data.stats.fansDestroyed;
  if (els.statsTaps) els.statsTaps.textContent = data.stats.totalTaps.toLocaleString();
  if (els.statsBestRPM) els.statsBestRPM.textContent = data.bestRPM.toLocaleString();
  
  if (els.statsCollection) {
    const totalItems = data.fans.length + data.themes.length;
    const ownedItems = data.ownedFans.length + data.ownedThemes.length;
    els.statsCollection.textContent = `${Math.round((ownedItems / totalItems) * 100)}%`;
  }

  // Populate profiles select dropdown
  if (els.profileSelect) {
    const profilesKey = data.profiles.join(',');
    if (els.profileSelect.dataset.lastProfiles !== profilesKey) {
      els.profileSelect.innerHTML = data.profiles.map(username => 
        `<option value="${username}" ${username === data.activeUser ? 'selected' : ''}>${username}</option>`
      ).join('');
      els.profileSelect.dataset.lastProfiles = profilesKey;
    } else {
      els.profileSelect.value = data.activeUser;
    }
  }

  // Populate history logs
  if (els.historyListContainer) {
    if (data.history.length === 0) {
      els.historyListContainer.innerHTML = `<div class="no-history">No runs recorded yet. Spin now!</div>`;
    } else {
      els.historyListContainer.innerHTML = data.history.map(run => {
        const fanObj = data.fans.find(f => f.id === run.fanId) || { name: 'Unknown' };
        const timeStr = new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `
          <div class="history-item">
            <div class="history-left">
              <span class="history-fan-name">${fanObj.name}</span>
              <span class="history-rpm-info">Max RPM: ${run.maxRPM.toLocaleString()} @ ${timeStr}</span>
            </div>
            <div class="history-right">
              <span class="history-score">${run.taps} Taps</span>
              <span class="history-coins">+${run.coinsEarned}C</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function _renderShop(data) {
  if (els.fanShop && !els.fanShop.dataset.renderedKey?.includes(data.selectedFan + data.coins)) {
    els.fanShop.innerHTML = data.fans.map((fan) => _shopButton({
      id: fan.id,
      type: 'fan',
      name: fan.name,
      price: fan.price,
      owned: data.ownedFans.includes(fan.id),
      selected: data.selectedFan === fan.id,
      color: fan.metal,
      blades: fan.blades,
      speed: fan.speedBase,
      durability: fan.durabilityBase,
    })).join('');
    els.fanShop.dataset.renderedKey = `${data.selectedFan}-${data.coins}-${data.ownedFans.join(',')}`;
  }

  if (els.themeShop && !els.themeShop.dataset.renderedKey?.includes(data.selectedTheme + data.coins)) {
    els.themeShop.innerHTML = data.themes.map((theme) => _shopButton({
      id: theme.id,
      type: 'theme',
      name: theme.name,
      price: theme.price,
      owned: data.ownedThemes.includes(theme.id),
      selected: data.selectedTheme === theme.id,
      color: theme.wall,
    })).join('');
    els.themeShop.dataset.renderedKey = `${data.selectedTheme}-${data.coins}-${data.ownedThemes.join(',')}`;
  }
}

function _shopButton({ id, type, name, price, owned, selected, color, blades, speed, durability }) {
  const attr = type === 'fan' ? 'data-fan-id' : 'data-theme-id';
  const action = selected ? 'EQUIPPED' : owned ? 'EQUIP' : `${price}C`;
  
  let statsHtml = '';
  if (type === 'fan') {
    statsHtml = `
      <div class="shop-card-stats">
        <span>Blades: <strong>${blades}</strong></span>
        <span>Speed: <strong>${speed.toFixed(1)}x</strong></span>
        <span>Durability: <strong>${durability.toFixed(1)}x</strong></span>
      </div>
    `;
  }

  return `
    <button class="shop-card ${selected ? 'selected' : ''}" ${attr}="${id}">
      <span class="shop-swatch" style="background:${color}"></span>
      <strong>${name}</strong>
      <div class="shop-card-details">
        ${statsHtml}
        <em>${action}</em>
      </div>
    </button>
  `;
}
