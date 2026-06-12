export const STATE = {
  LOBBY: 'LOBBY',
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  DANGER: 'DANGER',
  DESTROYED: 'DESTROYED',
};

export const FAN_SKINS = [
  { id: 'classic', name: 'Classic', price: 0, blades: 3, speedBase: 1.0, durabilityBase: 1.0, blade: '#2c1c14', motor: '#6a5540', metal: '#9b7a4c' },
  { id: 'carbon', name: 'Carbon', price: 180, blades: 4, speedBase: 1.3, durabilityBase: 1.6, blade: '#161a1d', motor: '#48515a', metal: '#a8b3bd' },
  { id: 'hazard', name: 'Hazard', price: 320, blades: 5, speedBase: 1.7, durabilityBase: 2.5, blade: '#2a2010', motor: '#8a2d1d', metal: '#f2b632' },
  { id: 'neon', name: 'Neon', price: 520, blades: 6, speedBase: 2.2, durabilityBase: 4.0, blade: '#13212a', motor: '#124e5d', metal: '#31d6ff' },
  { id: 'vortex', name: 'Vortex', price: 800, blades: 3, speedBase: 3.0, durabilityBase: 7.0, blade: '#0d2d1d', motor: '#0f5236', metal: '#00ff66' },
  { id: 'quantum', name: 'Quantum', price: 1500, blades: 8, speedBase: 4.2, durabilityBase: 12.0, blade: '#1f132a', motor: '#4e125d', metal: '#bf31ff' },
];

export const ROOM_THEMES = [
  { id: 'garage', name: 'Garage', price: 0, wall: '#3b3934', ceiling: '#252421', fog: '#171614' },
  { id: 'factory', name: 'Factory', price: 220, wall: '#303a3d', ceiling: '#192124', fog: '#111719' },
  { id: 'voltage', name: 'Voltage', price: 420, wall: '#2d2635', ceiling: '#191520', fog: '#120f17' },
  { id: 'cyber', name: 'Cyber Grid', price: 750, wall: '#151e2d', ceiling: '#0b111a', fog: '#060a10' },
];

export const UPGRADE_META = {
  speed: {
    label: 'Fast Speed',
    description: 'Increases RPM per tap (fewer taps to rev up)',
    max: 10,
    baseCost: 50,
    growth: 1.45,
  },
  durability: {
    label: 'Durability',
    description: 'Increases Max RPM capacity',
    max: 10,
    baseCost: 60,
    growth: 1.5,
  },
};

const DEFAULT_USER_DATA = {
  username: 'Guest',
  coins: 100,
  bestScore: 0,
  bestRPM: 0,
  ownedFans: ['classic'],
  ownedThemes: ['garage'],
  selectedFan: 'classic',
  selectedTheme: 'garage',
  fanUpgrades: {},
  stats: {
    fansDestroyed: 0,
    totalTaps: 0,
    totalCoinsEarned: 0,
  },
  history: [],
};

class Game {
  constructor() {
    this._listeners = [];
    this.state = STATE.LOBBY;
    this.rpm = 0;
    this.taps = 0;
    this.runCoins = 0;
    this.runNumber = 0;
    this._lastTick = 0;
    
    this.users = this._loadUsers();
    this.activeUser = localStorage.getItem('htf_active_user') || 'Guest';
    
    if (!this.users[this.activeUser]) {
      this.users[this.activeUser] = JSON.parse(JSON.stringify(DEFAULT_USER_DATA));
      this.users[this.activeUser].username = this.activeUser;
    }
    
    this._syncFromUser();
    this._prepareRun();
  }

  _loadUsers() {
    try {
      const saved = localStorage.getItem('htf_users');
      return saved ? JSON.parse(saved) : { 'Guest': JSON.parse(JSON.stringify(DEFAULT_USER_DATA)) };
    } catch (_) {
      return { 'Guest': JSON.parse(JSON.stringify(DEFAULT_USER_DATA)) };
    }
  }

  _saveUsers() {
    try {
      localStorage.setItem('htf_users', JSON.stringify(this.users));
      localStorage.setItem('htf_active_user', this.activeUser);
    } catch (_) {
    }
  }

  _syncFromUser() {
    const user = this.users[this.activeUser];
    this.coins = user.coins;
    this.bestScore = user.bestScore;
    this.bestRPM = user.bestRPM;
    this.ownedFans = user.ownedFans;
    this.ownedThemes = user.ownedThemes;
    this.selectedFan = user.selectedFan;
    this.selectedTheme = user.selectedTheme;
    this.fanUpgrades = user.fanUpgrades || {};
    this.stats = user.stats || { fansDestroyed: 0, totalTaps: 0, totalCoinsEarned: 0 };
    this.history = user.history || [];
  }

  _syncToUser() {
    const user = this.users[this.activeUser];
    user.coins = this.coins;
    user.bestScore = this.bestScore;
    user.bestRPM = this.bestRPM;
    user.ownedFans = this.ownedFans;
    user.ownedThemes = this.ownedThemes;
    user.selectedFan = this.selectedFan;
    user.selectedTheme = this.selectedTheme;
    user.fanUpgrades = this.fanUpgrades;
    user.stats = this.stats;
    user.history = this.history;
    this._saveUsers();
  }

  login(username) {
    if (!username || username.trim() === '') return { ok: false, reason: 'Invalid username.' };
    const cleaned = username.trim();
    this.activeUser = cleaned;
    
    if (!this.users[cleaned]) {
      this.users[cleaned] = JSON.parse(JSON.stringify(DEFAULT_USER_DATA));
      this.users[cleaned].username = cleaned;
    }
    
    this._syncFromUser();
    this.enterLobby();
    return { ok: true, username: cleaned };
  }

  getProfilesList() {
    return Object.keys(this.users);
  }

  getFanUpgradeLevel(fanId, type) {
    if (!this.fanUpgrades[fanId]) {
      this.fanUpgrades[fanId] = { speed: 0, durability: 0 };
    }
    return this.fanUpgrades[fanId][type] || 0;
  }

  getUpgradeCost(type, fanId = this.selectedFan) {
    const meta = UPGRADE_META[type];
    const lvl = this.getFanUpgradeLevel(fanId, type);
    return Math.round(meta.baseCost * Math.pow(meta.growth, lvl));
  }

  tick(timestamp) {
    if (this._lastTick === 0) {
      this._lastTick = timestamp;
      return;
    }

    const dt = (timestamp - this._lastTick) / 1000;
    this._lastTick = timestamp;

    if (this.state !== STATE.PLAYING && this.state !== STATE.DANGER) return;

    this.rpm = Math.max(0, this.rpm - this.config.decayPerSecond * dt);

    if (this.rpm <= 0 && this.state === STATE.PLAYING) {
      this.rpm = 0;
      this.state = STATE.IDLE;
      this._emit();
      return;
    }

    const pct = this.rpm / this.config.maxRPM;

    if (pct >= this.breakPoint || pct >= 1.0) {
      this.state = STATE.DESTROYED;
      this.rpm = this.config.maxRPM;
      this._finishRun();
      this._emit();
      return;
    }

    if (pct >= 0.85 && this.state !== STATE.DANGER) {
      this.state = STATE.DANGER;
    } else if (pct < 0.85 && this.state === STATE.DANGER) {
      this.state = STATE.PLAYING;
    }

    this._emit();
  }

  tap() {
    if (this.state === STATE.DESTROYED || this.state === STATE.LOBBY) return;

    if (this.state === STATE.IDLE) {
      this.state = STATE.PLAYING;
      this.rpm = 0;
      this.taps = 0;
      this.runCoins = 0;
    }

    this.taps += 1;
    this.stats.totalTaps += 1;

    const fraction = this.rpm / this.config.maxRPM;
    const diminish = 1 - fraction * 0.35;
    const comboBurst = Math.min(this.config.maxRPM * 0.015, this.taps * (this.config.tapRPM * 0.005));
    this.rpm = Math.min(this.config.maxRPM, this.rpm + this.config.tapRPM * diminish + comboBurst);

    this._emit();
  }

  enterLobby() {
    this.state = STATE.LOBBY;
    this.rpm = 0;
    this.taps = 0;
    this.runCoins = 0;
    this._lastTick = 0;
    this._prepareRun(false);
    this._emit();
  }

  startGame() {
    this.state = STATE.IDLE;
    this.rpm = 0;
    this.taps = 0;
    this.runCoins = 0;
    this._lastTick = 0;
    this._prepareRun(true);
    this._emit();
  }

  reset() {
    this.state = STATE.IDLE;
    this.rpm = 0;
    this.taps = 0;
    this.runCoins = 0;
    this._lastTick = 0;
    this._prepareRun(true);
    this._emit();
  }

  buyUpgrade(type) {
    const meta = UPGRADE_META[type];
    if (!meta) return { ok: false, reason: 'Unknown upgrade.' };
    
    const currentLvl = this.getFanUpgradeLevel(this.selectedFan, type);
    if (currentLvl >= meta.max) return { ok: false, reason: 'Max level reached.' };

    const cost = this.getUpgradeCost(type);
    if (this.coins < cost) return { ok: false, reason: 'Not enough coins.' };

    this.coins -= cost;
    if (!this.fanUpgrades[this.selectedFan]) {
      this.fanUpgrades[this.selectedFan] = { speed: 0, durability: 0 };
    }
    this.fanUpgrades[this.selectedFan][type] += 1;
    this._prepareRun(false);
    this._syncToUser();
    this._emit();
    return { ok: true };
  }

  buyFan(id) {
    const fan = FAN_SKINS.find((item) => item.id === id);
    if (!fan) return { ok: false, reason: 'Unknown fan.' };
    if (this.ownedFans.includes(id)) return this.selectFan(id);
    if (this.coins < fan.price) return { ok: false, reason: 'Not enough coins.' };

    this.coins -= fan.price;
    this.ownedFans.push(id);
    this.selectedFan = id;
    this._syncToUser();
    this._emit();
    return { ok: true };
  }

  buyTheme(id) {
    const theme = ROOM_THEMES.find((item) => item.id === id);
    if (!theme) return { ok: false, reason: 'Unknown theme.' };
    if (this.ownedThemes.includes(id)) return this.selectTheme(id);
    if (this.coins < theme.price) return { ok: false, reason: 'Not enough coins.' };

    this.coins -= theme.price;
    this.ownedThemes.push(id);
    this.selectedTheme = id;
    this._syncToUser();
    this._emit();
    return { ok: true };
  }

  selectFan(id) {
    if (!this.ownedFans.includes(id)) return { ok: false, reason: 'Locked fan.' };
    this.selectedFan = id;
    this._prepareRun(false);
    this._syncToUser();
    this._emit();
    return { ok: true };
  }

  selectTheme(id) {
    if (!this.ownedThemes.includes(id)) return { ok: false, reason: 'Locked theme.' };
    this.selectedTheme = id;
    this._syncToUser();
    this._emit();
    return { ok: true };
  }

  onChange(fn) {
    this._listeners.push(fn);
    fn(this._createData());
  }

  get speedPct() {
    return Math.min(1, this.rpm / this.config.maxRPM);
  }

  get isWarning() {
    return this.speedPct >= 0.6 && this.speedPct < 0.85;
  }

  get isDanger() {
    return this.speedPct >= 0.85;
  }

  _prepareRun(incrementRun = true) {
    if (incrementRun) this.runNumber += 1;

    const fan = FAN_SKINS.find((item) => item.id === this.selectedFan) || FAN_SKINS[0];
    const speedLevel = this.getFanUpgradeLevel(this.selectedFan, 'speed');
    const durabilityLevel = this.getFanUpgradeLevel(this.selectedFan, 'durability');

    const randomBrackets = [
      8000 + Math.random() * 4000,
      22000 + Math.random() * 8000,
      45000 + Math.random() * 15000,
      90000 + Math.random() * 30000,
    ];
    const baseRPM = randomBrackets[Math.floor(Math.random() * randomBrackets.length)];
    const maxRPM = Math.round(baseRPM * fan.durabilityBase * (1 + durabilityLevel * 0.15));
    const tapRPM = Math.round((maxRPM / 65) * fan.speedBase * (1 + speedLevel * 0.15));
    const decayPerSecond = Math.round(tapRPM / (1.2 + speedLevel * 0.1 + durabilityLevel * 0.06));

    this.config = {
      maxRPM,
      tapRPM,
      decayPerSecond,
    };

    const randomBreakMin = 0.88;
    const randomBreakMax = 0.98;
    this.breakPoint = randomBreakMin + Math.random() * (randomBreakMax - randomBreakMin);
  }

  _finishRun() {
    const earned = Math.max(12, Math.round(this.taps * 0.85 + this.config.maxRPM / 750));
    this.runCoins = earned;
    this.coins += earned;
    this.stats.totalCoinsEarned += earned;
    this.stats.fansDestroyed += 1;

    this.bestScore = Math.max(this.bestScore, this.taps);
    this.bestRPM = Math.max(this.bestRPM, Math.round(this.rpm));

    const historyItem = {
      timestamp: Date.now(),
      taps: this.taps,
      maxRPM: Math.round(this.rpm),
      fanId: this.selectedFan,
      coinsEarned: earned,
      status: 'DESTROYED',
    };

    this.history.unshift(historyItem);
    if (this.history.length > 15) this.history.pop();

    this._syncToUser();
  }

  _emit() {
    const data = this._createData();
    this._listeners.forEach((fn) => fn(data));
  }

  _createData() {
    const fan = FAN_SKINS.find((item) => item.id === this.selectedFan) || FAN_SKINS[0];
    const theme = ROOM_THEMES.find((item) => item.id === this.selectedTheme) || ROOM_THEMES[0];
    
    const speedLevel = this.getFanUpgradeLevel(this.selectedFan, 'speed');
    const durabilityLevel = this.getFanUpgradeLevel(this.selectedFan, 'durability');

    return {
      activeUser: this.activeUser,
      profiles: this.getProfilesList(),
      state: this.state,
      rpm: Math.round(this.rpm),
      taps: this.taps,
      bestScore: this.bestScore,
      bestRPM: this.bestRPM,
      speedPct: this.speedPct,
      isWarning: this.isWarning,
      isDanger: this.isDanger,
      coins: this.coins,
      runCoins: this.runCoins,
      fans: FAN_SKINS,
      themes: ROOM_THEMES,
      ownedFans: [...this.ownedFans],
      ownedThemes: [...this.ownedThemes],
      selectedFan: this.selectedFan,
      selectedTheme: this.selectedTheme,
      fan,
      theme,
      maxRPM: this.config ? this.config.maxRPM : 5000,
      runNumber: this.runNumber,
      stats: { ...this.stats },
      history: [...this.history],
      upgrades: {
        speed: speedLevel,
        durability: durabilityLevel,
      },
      upgradeMeta: UPGRADE_META,
      upgradeCosts: {
        speed: this.getUpgradeCost('speed'),
        durability: this.getUpgradeCost('durability'),
      },
    };
  }
}

export default Game;
