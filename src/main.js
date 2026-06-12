import './styles/style.css';
import { initScene, setFanSpeed, setDangerLevel, destroyFan, resetFan, updateScene, setVisualProfile, transitionCamera } from './three/scene.js';
import Game, { STATE } from './game.js';
import {
  initUI,
  updateUI,
  showTapRipple,
  flashScreen,
  getRetryBtn,
  getHomeBtn,
  getSettingsBtn,
  getSoundToggle,
  getVibrationToggle,
  getUpgradePanelBtn,
  getGaragePanelBtn,
  getTapArea,
  toggleSettingsPanel,
  toggleUpgradePanel,
  toggleGaragePanel,
  hideSettingsPanel,
  hidePanels,
  hidePanelById,
  updateSoundIcon,
  updateVibrationIcon,
  setVibrationEnabled,
  getVibrationEnabled,
  showToast,
  showHomeOverlay,
  hideHomeOverlay,
  getPlayBtnLarge,
  getLoginSubmitBtn,
  getUsernameInput,
  getProfileSelect,
} from './ui.js';
import {
  initAudio,
  ensureAudioContext,
  startFanSound,
  updateFanSound,
  stopFanSound,
  playTapSound,
  playWarningBeep,
  playDestroySound,
  playUpgradeSound,
  playSelectSound,
  toggleMute,
} from './audio/audio.js';

const game = new Game();
let lastWarningBeep = 0;
let destructionPlayed = false;
let lastInputAt = 0;
let lastVisualKey = '';
let lastState = '';

initScene();
initAudio();
initUI();

game.onChange((data) => {
  updateUI(data);
  setFanSpeed(data.rpm);
  setDangerLevel(data.speedPct);
  updateFanSound(data.rpm, data.maxRPM);

  if (data.state !== lastState) {
    transitionCamera(data.state);
    lastState = data.state;
  }

  const visualKey = `${data.selectedFan}-${data.selectedTheme}`;
  if (visualKey !== lastVisualKey) {
    setVisualProfile(data.fan, data.theme);
    lastVisualKey = visualKey;
  }

  if (data.isDanger && data.state !== STATE.DESTROYED) {
    const now = Date.now();
    if (now - lastWarningBeep > 430) {
      playWarningBeep();
      lastWarningBeep = now;
    }
  }

  if (data.state === STATE.DESTROYED && !destructionPlayed) {
    destructionPlayed = true;
    destroyFan();
    stopFanSound();
    playDestroySound();
    flashScreen();
  }
});

function animate(timestamp) {
  requestAnimationFrame(animate);
  game.tick(timestamp);
  updateScene();
}

requestAnimationFrame(animate);

function handleTap(e) {
  console.log('handleTap active target:', e.target, 'state:', game.state);

  if (game.state === STATE.LOBBY) return;

  if (e.target.closest('#ui-overlay button, #ui-overlay select, #ui-overlay input, #ui-overlay .side-panel, #ui-overlay .settings-panel, #ui-overlay .game-over-modal, #ui-overlay .home-screen')) {
    return;
  }

  e.preventDefault();
  const now = performance.now();
  if (now - lastInputAt < 80) return;
  lastInputAt = now;

  ensureAudioContext();

  if (game.state === STATE.IDLE) {
    startFanSound(game.selectedFan);
  }

  if (game.state === STATE.DESTROYED) return;

  const point = e.touches?.[0] || e;
  game.tap();
  playTapSound(game.taps, game.speedPct, game.selectedFan);
  showTapRipple(point.clientX, point.clientY);
  hideSettingsPanel();
}

const tapArea = getTapArea();
if (tapArea) {
  tapArea.addEventListener('touchstart', handleTap, { passive: false });
  tapArea.addEventListener('mousedown', handleTap);
  tapArea.addEventListener('click', handleTap);
}

window.addEventListener('pointerdown', handleTap, { passive: false, capture: true });

function resetGame() {
  destructionPlayed = false;
  game.reset();
  resetFan();
  stopFanSound();
  hidePanels();
}

getPlayBtnLarge()?.addEventListener('click', (e) => {
  e.stopPropagation();
  ensureAudioContext();
  playSelectSound();
  game.startGame();
  resetFan();
});

getLoginSubmitBtn()?.addEventListener('click', (e) => {
  e.stopPropagation();
  const input = getUsernameInput();
  if (input) {
    const username = input.value.trim();
    if (username) {
      const res = game.login(username);
      if (res.ok) {
        playUpgradeSound();
        showToast(`Profile created: ${res.username}`);
        input.value = '';
      } else {
        showToast(res.reason);
      }
    } else {
      showToast('Please type a username!');
    }
  }
});

getProfileSelect()?.addEventListener('change', (e) => {
  e.stopPropagation();
  const username = e.target.value;
  if (username) {
    const res = game.login(username);
    if (res.ok) {
      playSelectSound();
      showToast(`Switched profile: ${res.username}`);
    }
  }
});

getRetryBtn()?.addEventListener('click', (e) => {
  e.stopPropagation();
  playSelectSound();
  resetGame();
});

getHomeBtn()?.addEventListener('click', (e) => {
  e.stopPropagation();
  playSelectSound();
  destructionPlayed = false;
  resetFan();
  stopFanSound();
  hidePanels();
  game.enterLobby();
});

getSettingsBtn()?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSettingsPanel();
});

getUpgradePanelBtn()?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleUpgradePanel();
});

getGaragePanelBtn()?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleGaragePanel();
});

getSoundToggle()?.addEventListener('click', (e) => {
  e.stopPropagation();
  ensureAudioContext();
  const muted = toggleMute();
  updateSoundIcon(muted);
});

getVibrationToggle()?.addEventListener('click', (e) => {
  e.stopPropagation();
  const next = !getVibrationEnabled();
  setVibrationEnabled(next);
  updateVibrationIcon(next);
});

document.addEventListener('click', (e) => {
  const closePanel = e.target.closest?.('[data-close-panel]');
  if (closePanel) {
    e.stopPropagation();
    hidePanelById(closePanel.dataset.closePanel);
    return;
  }

  const upgrade = e.target.closest?.('[data-upgrade]');
  if (upgrade) {
    e.stopPropagation();
    const result = game.buyUpgrade(upgrade.dataset.upgrade);
    if (result.ok) {
      playUpgradeSound();
      showToast('Upgrade installed');
    } else {
      showToast(result.reason);
    }
    return;
  }

  const fan = e.target.closest?.('[data-fan-id]');
  if (fan) {
    e.stopPropagation();
    const result = game.buyFan(fan.dataset.fanId);
    if (result.ok) {
      playSelectSound();
      showToast('Fan equipped');
    } else {
      showToast(result.reason);
    }
    return;
  }

  const theme = e.target.closest?.('[data-theme-id]');
  if (theme) {
    e.stopPropagation();
    const result = game.buyTheme(theme.dataset.themeId);
    if (result.ok) {
      playSelectSound();
      showToast('Background equipped');
    } else {
      showToast(result.reason);
    }
  }
});

console.log('HIT THE FAN ready');
