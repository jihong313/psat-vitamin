/**
 * PSAT VITAMIN LAB - CORE ENGINE
 * Complete interactive speed arithmetic trainer for PSAT Data Interpretation
 */

// =============================================================================
// 1. SOUND ENGINE (Synthesizer via Web Audio API)
// =============================================================================
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = localStorage.getItem('psat_sound_enabled') !== 'false';
  }

  init() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('psat_sound_enabled', this.enabled);
    return this.enabled;
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    // Cheerful chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

    osc2.frequency.setValueAtTime(659.25, now);
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.14);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.22);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.2, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.35);
    });
  }
}

// =============================================================================
// 2. ACTIVE TODAY STUDY TIME TRACKER
// =============================================================================
class ActiveTimeTracker {
  constructor() {
    this.timerId = null;
    this.isTabActive = true;
    this.displayEl = document.getElementById('todayStudyTimeDisplay');
    this.modalDisplayEl = document.getElementById('modalTodayTime');

    this.initVisibilityListeners();
    this.startTracking();
  }

  getTodayKey() {
    const today = new Date().toISOString().split('T')[0];
    return `psat_today_study_seconds_${today}`;
  }

  getTodaySeconds() {
    const val = localStorage.getItem(this.getTodayKey());
    return val ? parseInt(val, 10) : 0;
  }

  addSeconds(sec) {
    const current = this.getTodaySeconds();
    const updated = current + sec;
    localStorage.setItem(this.getTodayKey(), updated);
    this.updateDisplay(updated);
  }

  formatTime(totalSeconds) {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  updateDisplay(totalSeconds = this.getTodaySeconds()) {
    const formatted = this.formatTime(totalSeconds);
    if (this.displayEl) this.displayEl.textContent = formatted;
    if (this.modalDisplayEl) this.modalDisplayEl.textContent = formatted;
  }

  initVisibilityListeners() {
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;
    });
    window.addEventListener('focus', () => { this.isTabActive = true; });
    window.addEventListener('blur', () => { this.isTabActive = false; });
  }

  startTracking() {
    this.updateDisplay();
    this.timerId = setInterval(() => {
      if (this.isTabActive) {
        this.addSeconds(1);
      }
    }, 1000);
  }
}

// =============================================================================
// 3. STATS & WRONG ANSWER VAULT MANAGER
// =============================================================================
class StatsManager {
  constructor() {
    this.statsKey = 'psat_vitamin_stats_v1';
    this.vaultKey = 'psat_vitamin_wrong_vault_v1';
  }

  getStats() {
    const data = localStorage.getItem(this.statsKey);
    return data ? JSON.parse(data) : {
      totalSolved: 0,
      totalCorrect: 0,
      totalTimeSeconds: 0,
      categories: {
        add: { solved: 0, correct: 0, timeSec: 0 },
        sub: { solved: 0, correct: 0, timeSec: 0 },
        mul: { solved: 0, correct: 0, timeSec: 0 },
        frac: { solved: 0, correct: 0, timeSec: 0 },
        mulcomp: { solved: 0, correct: 0, timeSec: 0 },
        mixed: { solved: 0, correct: 0, timeSec: 0 }
      }
    };
  }

  recordSession(category, subType, questions) {
    const stats = this.getStats();
    let sessionSolved = questions.length;
    let sessionCorrect = questions.filter(q => q.isCorrect).length;
    let sessionTime = questions.reduce((acc, q) => acc + (q.timeTaken || 0), 0);
    const avgSpeed = sessionSolved > 0 ? parseFloat((sessionTime / sessionSolved).toFixed(2)) : 0;
    const totalTimeSec = parseFloat(sessionTime.toFixed(1));

    stats.totalSolved += sessionSolved;
    stats.totalCorrect += sessionCorrect;
    stats.totalTimeSeconds += sessionTime;

    if (!stats.categories[category]) {
      stats.categories[category] = { solved: 0, correct: 0, timeSec: 0 };
    }
    stats.categories[category].solved += sessionSolved;
    stats.categories[category].correct += sessionCorrect;
    stats.categories[category].timeSec += sessionTime;

    localStorage.setItem(this.statsKey, JSON.stringify(stats));

    // Save session history for session-by-session comparison
    const history = this.getSessionHistory();
    const historyItem = {
      id: Date.now(),
      date: new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: category,
      subType: subType,
      count: sessionSolved,
      totalTimeSec: totalTimeSec,
      avgSpeed: avgSpeed,
      accuracy: Math.round((sessionCorrect / sessionSolved) * 100)
    };
    history.push(historyItem);
    if (history.length > 50) history.shift();
    localStorage.setItem('psat_session_history_v1', JSON.stringify(history));

    // Save wrong questions to Vault
    const wrongQs = questions.filter(q => !q.isCorrect);
    this.addWrongQuestions(wrongQs);

    // Update today solved display
    this.updateTodaySolvedCount(sessionSolved);

    return historyItem;
  }

  getSessionHistory() {
    const data = localStorage.getItem('psat_session_history_v1');
    return data ? JSON.parse(data) : [];
  }

  clearSessionHistory() {
    localStorage.removeItem('psat_session_history_v1');
  }

  updateTodaySolvedCount(addedCount = 0) {
    const today = new Date().toISOString().split('T')[0];
    const key = `psat_today_solved_${today}`;
    let current = parseInt(localStorage.getItem(key) || '0', 10);
    current += addedCount;
    localStorage.setItem(key, current);
    const el = document.getElementById('todaySolvedDisplay');
    if (el) el.textContent = current;
  }

  getTodaySolvedCount() {
    const today = new Date().toISOString().split('T')[0];
    const key = `psat_today_solved_${today}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  getVault() {
    const data = localStorage.getItem(this.vaultKey);
    return data ? JSON.parse(data) : [];
  }

  addWrongQuestions(wrongList) {
    if (!wrongList || wrongList.length === 0) return;
    const vault = this.getVault();
    wrongList.forEach(q => {
      // Avoid exact duplicates
      const exists = vault.some(v => v.rawExpression === q.rawExpression);
      if (!exists) {
        vault.unshift({
          category: q.category,
          subType: q.subType,
          rawExpression: q.rawExpression,
          correctAnswer: q.correctAnswer,
          userAnswer: q.userAnswer,
          date: new Date().toLocaleDateString()
        });
      }
    });
    // Keep max 100 wrong questions
    const trimmed = vault.slice(0, 100);
    localStorage.setItem(this.vaultKey, JSON.stringify(trimmed));
  }

  clearVault() {
    localStorage.removeItem(this.vaultKey);
  }
}

// =============================================================================
// 4. PROBLEM GENERATOR (PSAT Specialized Arithmetic)
// =============================================================================
class ProblemGenerator {
  static randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // -------------------------------------------------------------
  // 1. ADDITION
  // -------------------------------------------------------------
  static genAddition(subType, difficulty) {
    if (subType === 'add_4x4') {
      const a = this.randInt(1100, 9899);
      const b = this.randInt(1100, 9899);
      return {
        type: 'numeric',
        category: 'add',
        subType: 'add_4x4',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">+</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} + ${b}`,
        correctAnswer: (a + b).toString(),
        tip: null
      };
    } else if (subType === 'add_chain') {
      // 2-digit chain (3~4 numbers)
      const count = difficulty === 'hard' ? 4 : 3;
      const nums = [];
      for (let i = 0; i < count; i++) {
        nums.push(this.randInt(15, 95));
      }
      const sum = nums.reduce((acc, n) => acc + n, 0);
      const chainHtml = nums.map((n, i) => 
        `<span class="chain-item">${n}</span>` + (i < count - 1 ? `<span class="chain-plus">+</span>` : `<span class="equals">=</span>`)
      ).join(' ');

      return {
        type: 'numeric',
        category: 'add',
        subType: 'add_chain',
        displayHtml: `<div class="chain-add-expr">${chainHtml}</div>`,
        rawExpression: nums.join(' + '),
        correctAnswer: sum.toString(),
        tip: "앞자리(십의 자리) 먼저 합산 후 일의 자리를 덧붙이면 빠릅니다!"
      };
    } else {
      // Default: add_2x2
      const a = this.randInt(15, 98);
      const b = this.randInt(15, 98);
      return {
        type: 'numeric',
        category: 'add',
        subType: 'add_2x2',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">+</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} + ${b}`,
        correctAnswer: (a + b).toString(),
        tip: null
      };
    }
  }

  // -------------------------------------------------------------
  // 2. SUBTRACTION
  // -------------------------------------------------------------
  static genSubtraction(subType, difficulty) {
    if (subType === 'sub_4x4') {
      const n1 = this.randInt(2000, 9999);
      const n2 = this.randInt(1000, n1 - 100);
      return {
        type: 'numeric',
        category: 'sub',
        subType: 'sub_4x4',
        displayHtml: `<div class="calc-math-expr">${n1} <span class="operator">-</span> ${n2} <span class="equals">=</span></div>`,
        rawExpression: `${n1} - ${n2}`,
        correctAnswer: (n1 - n2).toString(),
        tip: null
      };
    } else if (subType === 'sub_990') {
      // 990법 / 보수법
      const base = [1000, 1000, 990, 900, 100][this.randInt(0, 4)];
      let sub;
      if (base === 1000) sub = this.randInt(123, 889);
      else if (base === 990) sub = this.randInt(120, 780);
      else if (base === 900) sub = this.randInt(120, 780);
      else sub = this.randInt(15, 85);

      const ans = base - sub;
      return {
        type: 'numeric',
        category: 'sub',
        subType: 'sub_990',
        displayHtml: `<div class="calc-math-expr">${base} <span class="operator">-</span> ${sub} <span class="equals">=</span></div>`,
        rawExpression: `${base} - ${sub}`,
        correctAnswer: ans.toString(),
        tip: base === 1000 ? "990법: 앞자리들은 합이 9, 맨 끝자리만 합이 10이 되는 수를 구하세요!" : "보수법 기준수 활용"
      };
    } else if (subType === 'sub_bridge') {
      // 징검다리법: e.g. 523 - 278 (bridge at 300: 22 + 223 = 245)
      const bridge = this.randInt(2, 8) * 100; // e.g. 300
      const bDiff = this.randInt(12, 45);
      const b = bridge - bDiff; // e.g. 300 - 22 = 278
      const aDiff = this.randInt(35, 250);
      const a = bridge + aDiff; // e.g. 300 + 223 = 523
      const ans = a - b;

      return {
        type: 'numeric',
        category: 'sub',
        subType: 'sub_bridge',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">-</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} - ${b}`,
        correctAnswer: ans.toString(),
        tip: `징검다리 기준수 [${bridge}]를 거쳐 계산해보세요! (+${bDiff} + ${aDiff} = ${ans})`
      };
    } else {
      // Default: sub_2x2
      const n1 = this.randInt(25, 99);
      const n2 = this.randInt(12, n1 - 1);
      return {
        type: 'numeric',
        category: 'sub',
        subType: 'sub_2x2',
        displayHtml: `<div class="calc-math-expr">${n1} <span class="operator">-</span> ${n2} <span class="equals">=</span></div>`,
        rawExpression: `${n1} - ${n2}`,
        correctAnswer: (n1 - n2).toString(),
        tip: null
      };
    }
  }

  // -------------------------------------------------------------
  // 3. MULTIPLICATION
  // -------------------------------------------------------------
  static genMultiplication(subType, difficulty) {
    if (subType === 'mul_10_20') {
      // 10대·20대 곱셈 (10~29 × 10~29)
      const roll = Math.random();
      if (roll < 0.4) {
        return this.genMultiplication('mul_teens', difficulty);
      } else if (roll < 0.8) {
        return this.genMultiplication('mul_twenties', difficulty);
      } else {
        // 10대 × 20대 교차 곱셈
        const teens = this.randInt(12, 19);
        const twenties = this.randInt(21, 29);
        const isReversed = Math.random() < 0.5;
        const a = isReversed ? twenties : teens;
        const b = isReversed ? teens : twenties;
        const ans = a * b;
        const onesB = b % 10;
        return {
          type: 'numeric',
          category: 'mul',
          subType: 'mul_10_20',
          displayHtml: `<div class="calc-math-expr">${a} <span class="operator">×</span> ${b} <span class="equals">=</span></div>`,
          rawExpression: `${a} × ${b}`,
          correctAnswer: ans.toString(),
          tip: `10·20대 교차 비법: (${a}×${b - onesB}) + (${a}×${onesB}) = ${a * (b - onesB)} + ${a * onesB} = ${ans}`
        };
      }
    }

    if (subType === 'mul_teens') {
      // 10대 곱셈 (10~19 × 10~19)
      let a, b;
      if (difficulty === 'easy') {
        a = this.randInt(11, 15);
        b = this.randInt(11, 15);
      } else if (difficulty === 'normal') {
        a = this.randInt(11, 19);
        b = this.randInt(12, 19);
      } else {
        a = this.randInt(14, 19);
        b = this.randInt(15, 19);
      }

      const onesA = a % 10;
      const onesB = b % 10;
      const step1 = (a + onesB) * 10;
      const step2 = onesA * onesB;
      const ans = a * b;

      return {
        type: 'numeric',
        category: 'mul',
        subType: 'mul_teens',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">×</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} × ${b}`,
        correctAnswer: ans.toString(),
        tip: `10대 곱셈 비법: (${a} + ${onesB})×10 + (${onesA}×${onesB}) = ${step1} + ${step2} = ${ans}`
      };
    }

    if (subType === 'mul_twenties') {
      // 20대 곱셈 (20~29 × 20~29)
      let a, b;
      if (difficulty === 'easy') {
        a = this.randInt(21, 25);
        b = this.randInt(21, 25);
      } else if (difficulty === 'normal') {
        a = this.randInt(21, 29);
        b = this.randInt(21, 29);
      } else {
        a = this.randInt(24, 29);
        b = this.randInt(24, 29);
      }

      const onesA = a % 10;
      const onesB = b % 10;
      const sumA = a + onesB;
      const step1 = sumA * 20;
      const step2 = onesA * onesB;
      const ans = a * b;

      return {
        type: 'numeric',
        category: 'mul',
        subType: 'mul_twenties',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">×</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} × ${b}`,
        correctAnswer: ans.toString(),
        tip: `20대 곱셈 비법: (${a} + ${onesB})×20 + (${onesA}×${onesB}) = (${sumA}×20) + ${step2} = ${step1} + ${step2} = ${ans}`
      };
    }

    if (subType === 'mul_11') {
      // 11단 곱셈 (11 × N 또는 N × 11)
      let n;
      let tip = '';

      if (difficulty === 'easy') {
        // 합이 10 미만인 2자리 수 (올림 없음 우선)
        const candidates = [
          12, 13, 14, 15, 16, 17, 18,
          21, 22, 23, 24, 25, 26, 27,
          31, 32, 33, 34, 35, 36,
          41, 42, 43, 44, 45,
          51, 52, 53, 54,
          61, 62, 63,
          71, 72
        ];
        n = candidates[this.randInt(0, candidates.length - 1)];
      } else if (difficulty === 'normal') {
        // 전범위 2자리 수 (올림 포함 적극 훈련)
        n = this.randInt(14, 99);
      } else {
        // 고난도: 3자리 수 또는 큰 2자리 수
        if (Math.random() < 0.65) {
          n = this.randInt(112, 895);
        } else {
          n = this.randInt(68, 99);
        }
      }

      const ans = 11 * n;
      const isReversed = Math.random() < 0.5;
      const exprLeft = isReversed ? n : 11;
      const exprRight = isReversed ? 11 : n;

      if (n < 100) {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        const sum = tens + ones;
        if (sum < 10) {
          tip = `11단 비법: 앞(${tens})과 끝(${ones}) 사이에 합(${tens}+${ones}=${sum})을 쏙! → ${ans}`;
        } else {
          tip = `11단 비법: ${tens}+${ones}=${sum} (올림 1 발생!) → 앞자리 (${tens}+1=${tens + 1}) | 중간 (${sum % 10}) | 끝 (${ones}) → ${ans}`;
        }
      } else {
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        tip = `11단 3자리 비법: 맨앞(${h})과 맨끝(${u})을 두고 이웃 자릿수 합(${h}+${t}, ${t}+${u})을 결합! → ${ans}`;
      }

      return {
        type: 'numeric',
        category: 'mul',
        subType: 'mul_11',
        displayHtml: `<div class="calc-math-expr">${exprLeft} <span class="operator">×</span> ${exprRight} <span class="equals">=</span></div>`,
        rawExpression: `${exprLeft} × ${exprRight}`,
        correctAnswer: ans.toString(),
        tip: tip
      };
    }

    if (subType === 'mul_sum10') {
      // 십의 자리는 같고 일의 자리 합이 10인 수의 곱셈
      const tens = this.randInt(2, 9);
      const ones1 = this.randInt(1, 9);
      const ones2 = 10 - ones1;
      const a = tens * 10 + ones1;
      const b = tens * 10 + ones2;
      const ans = a * b; // (tens * (tens + 1)) * 100 + (ones1 * ones2)
      return {
        type: 'numeric',
        category: 'mul',
        subType: 'mul_sum10',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">×</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} × ${b}`,
        correctAnswer: ans.toString(),
        tip: `합10 공식: 앞자리 (${tens}×${tens+1}=${tens*(tens+1)}) 뒤에 끝자리 (${ones1}×${ones2}=${String(ones1*ones2).padStart(2,'0')})를 붙이세요!`
      };
    } else if (subType === 'mul_digits') {
      // 자릿수 x 1자리 (2x1, 3x1, 4x1)
      let a;
      if (difficulty === 'easy') a = this.randInt(12, 99);
      else if (difficulty === 'normal') a = this.randInt(105, 995);
      else a = this.randInt(1050, 9950);

      const b = this.randInt(3, 9);
      return {
        type: 'numeric',
        category: 'mul',
        subType: 'mul_digits',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">×</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} × ${b}`,
        correctAnswer: (a * b).toString(),
        tip: "큰 자릿수부터 곱해 더해가는 좌측 우선 계산법을 적용해보세요."
      };
    } else {
      // Default: mul_2x2
      const a = this.randInt(12, 89);
      const b = this.randInt(12, 89);
      return {
        type: 'numeric',
        category: 'mul',
        subType: 'mul_2x2',
        displayHtml: `<div class="calc-math-expr">${a} <span class="operator">×</span> ${b} <span class="equals">=</span></div>`,
        rawExpression: `${a} × ${b}`,
        correctAnswer: (a * b).toString(),
        tip: "교차 곱셈(크로스 계산법) 또는 (A × B의 십의자리) + (A × B의 일의자리) 분해 추천"
      };
    }
  }

  // -------------------------------------------------------------
  // 4. FRACTION COMPARISON (A vs B)
  // -------------------------------------------------------------
  static genFractionComp(subType, difficulty) {
    let n1, d1, n2, d2;

    if (difficulty === 'hard') {
      // 1~3% ultra-fine difference (Difference method / 차분법)
      d1 = this.randInt(300, 850);
      n1 = Math.round(d1 * (this.randInt(25, 75) / 100));
      // delta
      const diffPercent = (this.randInt(1, 3) / 100) * (Math.random() < 0.5 ? 1 : -1);
      d2 = Math.round(d1 * (1 + this.randInt(10, 40) / 100));
      const val1 = n1 / d1;
      const targetVal2 = val1 * (1 + diffPercent);
      n2 = Math.round(d2 * targetVal2);
    } else if (difficulty === 'normal') {
      // 3-digit fraction, 5~12% difference
      d1 = this.randInt(150, 700);
      n1 = Math.round(d1 * (this.randInt(25, 80) / 100));
      d2 = Math.round(d1 * (1 + this.randInt(15, 50) / 100));
      const diff = (this.randInt(5, 12) / 100) * (Math.random() < 0.5 ? 1 : -1);
      n2 = Math.round(d2 * ((n1 / d1) * (1 + diff)));
    } else {
      // Easy: 2-digit or obvious 15~30% difference
      d1 = this.randInt(30, 95);
      n1 = this.randInt(10, d1 - 5);
      d2 = this.randInt(30, 95);
      n2 = this.randInt(10, d2 - 5);
    }

    // Ensure they are not strictly equal
    const v1 = n1 / d1;
    const v2 = n2 / d2;
    if (Math.abs(v1 - v2) < 0.0001) {
      n1 += 2;
    }

    const isLeftBigger = (n1 / d1) > (n2 / d2);
    const correctAnswer = isLeftBigger ? 'left' : 'right';

    const displayHtml = `
      <div class="comparison-container">
        <div class="comp-item-card clickable-comp-card" data-choice="left" title="클릭하거나 키보드 ← 또는 A 키">
          <span class="comp-tag">분수 A</span>
          <div class="fraction-box">
            <span class="fraction-num">${n1}</span>
            <span class="fraction-den">${d1}</span>
          </div>
          <div class="card-action-badge">A 선택 (← 또는 A)</div>
        </div>
        <div class="comp-vs-pill">VS</div>
        <div class="comp-item-card clickable-comp-card" data-choice="right" title="클릭하거나 키보드 → 또는 B 키">
          <span class="comp-tag">분수 B</span>
          <div class="fraction-box">
            <span class="fraction-num">${n2}</span>
            <span class="fraction-den">${d2}</span>
          </div>
          <div class="card-action-badge">B 선택 (→ 또는 B)</div>
        </div>
      </div>
    `;

    return {
      type: 'comparison',
      category: 'frac',
      subType: subType || 'frac_std',
      displayHtml: displayHtml,
      rawExpression: `${n1}/${d1} vs ${n2}/${d2}`,
      correctAnswer: correctAnswer,
      tip: "분모와 분자의 증가율을 비교하거나 차분법(차이분수)을 적용해보세요!"
    };
  }

  // -------------------------------------------------------------
  // 5. MULTIPLICATION COMPARISON (A x B vs C x D)
  // -------------------------------------------------------------
  static genMulComp(subType, difficulty) {
    const a = this.randInt(25, 95);
    const b = this.randInt(25, 95);

    // Make second product close to first product (trade-off)
    const ratio = 1 + (this.randInt(10, 30) / 100);
    const c = Math.round(a * ratio);
    const diffPct = (this.randInt(2, 10) / 100) * (Math.random() < 0.5 ? 1 : -1);
    const targetProduct = (a * b) * (1 + diffPct);
    const d = Math.round(targetProduct / c);

    const prod1 = a * b;
    const prod2 = c * d;
    const isLeftBigger = prod1 > prod2;
    const correctAnswer = isLeftBigger ? 'left' : 'right';

    const displayHtml = `
      <div class="comparison-container">
        <div class="comp-item-card clickable-comp-card" data-choice="left" title="클릭하거나 키보드 ← 또는 A 키">
          <span class="comp-tag">값 A</span>
          <div class="mult-box">${a} × ${b}</div>
          <div class="card-action-badge">A 선택 (← 또는 A)</div>
        </div>
        <div class="comp-vs-pill">VS</div>
        <div class="comp-item-card clickable-comp-card" data-choice="right" title="클릭하거나 키보드 → 또는 B 키">
          <span class="comp-tag">값 B</span>
          <div class="mult-box">${c} × ${d}</div>
          <div class="card-action-badge">B 선택 (→ 또는 B)</div>
        </div>
      </div>
    `;

    return {
      type: 'comparison',
      category: 'mulcomp',
      subType: subType || 'mulcomp_std',
      displayHtml: displayHtml,
      rawExpression: `(${a}×${b}) vs (${c}×${d})`,
      correctAnswer: correctAnswer,
      tip: "한 쪽의 증가율과 다른 쪽의 감소율을 비교해 상쇄 대소를 판정하세요!"
    };
  }

  // -------------------------------------------------------------
  // 6. MASTER DISPATCHER
  // -------------------------------------------------------------
  static generate(mode, subType, difficulty) {
    if (mode === 'mixed') {
      const modes = ['add', 'sub', 'mul', 'frac', 'mulcomp'];
      const chosen = modes[this.randInt(0, modes.length - 1)];
      let chosenSub = 'default';
      if (chosen === 'mul') {
        const mulSubs = ['mul_2x2', 'mul_digits', 'mul_sum10', 'mul_11', 'mul_teens', 'mul_twenties', 'mul_10_20'];
        chosenSub = mulSubs[this.randInt(0, mulSubs.length - 1)];
      } else if (chosen === 'sub') {
        const subSubs = ['sub_2x2', 'sub_4x4', 'sub_990', 'sub_bridge'];
        chosenSub = subSubs[this.randInt(0, subSubs.length - 1)];
      } else if (chosen === 'add') {
        const addSubs = ['add_2x2', 'add_4x4', 'add_chain'];
        chosenSub = addSubs[this.randInt(0, addSubs.length - 1)];
      }
      return this.generate(chosen, chosenSub, difficulty);
    }

    switch (mode) {
      case 'add':
        return this.genAddition(subType, difficulty);
      case 'sub':
        return this.genSubtraction(subType, difficulty);
      case 'mul':
        return this.genMultiplication(subType, difficulty);
      case 'frac':
        return this.genFractionComp(subType, difficulty);
      case 'mulcomp':
        return this.genMulComp(subType, difficulty);
      default:
        return this.genAddition(subType, difficulty);
    }
  }
}

// =============================================================================
// 5. APPLICATION CONTROLLER
// =============================================================================
class VitaminApp {
  constructor() {
    this.sound = new SoundEngine();
    this.timeTracker = new ActiveTimeTracker();
    this.stats = new StatsManager();

    // State
    this.currentMode = 'add';
    this.selectedSubTypes = ['add_2x2'];
    this.currentSubType = 'add_2x2';
    this.distributionMode = 'equal'; // 'equal' | 'custom'
    this.customSubTypeCounts = {};
    this.currentCount = 20;
    this.currentDifficulty = 'normal';

    this.isDrillActive = false;
    this.isPaused = false;
    this.pauseStartTime = 0;

    this.questions = [];
    this.currentIndex = 0;
    this.currentQuestion = null;

    this.questionStartTime = 0;
    this.sessionStartTime = 0;
    this.questionTimerInterval = null;
    this.sessionTimerInterval = null;

    // Subtype configurations map
    this.subTypesMap = {
      add: [
        { id: 'add_2x2', name: '2자리+2자리' },
        { id: 'add_4x4', name: '4자리+4자리' },
        { id: 'add_chain', name: '2자리 연속합산 (3~4개)' }
      ],
      sub: [
        { id: 'sub_2x2', name: '2자리-2자리' },
        { id: 'sub_4x4', name: '4자리-4자리' },
        { id: 'sub_990', name: '990법 (보수법)' },
        { id: 'sub_bridge', name: '징검다리법' }
      ],
      mul: [
        { id: 'mul_2x2', name: '2자리 × 2자리' },
        { id: 'mul_digits', name: '자릿수 × 1자리' },
        { id: 'mul_sum10', name: '십의자리 동일 & 일의자리합 10' },
        { id: 'mul_11', name: '11단 (11 × N)' },
        { id: 'mul_teens', name: '10대 곱셈 (10~19 × 10~19)' },
        { id: 'mul_twenties', name: '20대 곱셈 (20~29 × 20~29)' },
        { id: 'mul_10_20', name: '10·20대 곱셈 (10~29 × 10~29)' }
      ],
      frac: [
        { id: 'frac_std', name: '표준 분수 대소비교' }
      ],
      mulcomp: [
        { id: 'mulcomp_std', name: '표준 곱셈 대소비교 (A×B vs C×D)' }
      ],
      mixed: [
        { id: 'mixed_all', name: '종합 5대 연산 랜덤 출제' }
      ]
    };

    this.initDOMElements();
    this.initEventListeners();
    this.initTheme();
    this.renderSubTypes();
    this.updateHeaderStats();
  }

  initDOMElements() {
    // Views
    this.lobbyView = document.getElementById('lobbyView');
    this.drillView = document.getElementById('drillView');
    this.resultView = document.getElementById('resultView');

    // Drill Elements
    this.currentQNumEl = document.getElementById('currentQNum');
    this.totalQNumEl = document.getElementById('totalQNum');
    this.liveAccuracyEl = document.getElementById('liveAccuracy');
    this.drillProgressBar = document.getElementById('drillProgressBar');
    this.currentSecEl = document.getElementById('currentSec');
    this.totalSecEl = document.getElementById('totalSec');
    this.drillModeBadge = document.getElementById('drillModeBadge');
    this.drillSubBadge = document.getElementById('drillSubBadge');

    this.btnPauseDrill = document.getElementById('btnPauseDrill');
    this.pauseOverlay = document.getElementById('pauseOverlay');
    this.btnResumeDrill = document.getElementById('btnResumeDrill');

    this.problemCard = document.getElementById('problemCard');
    this.expressionArea = document.getElementById('expressionArea');
    this.methodTipBanner = document.getElementById('methodTipBanner');
    this.tipText = document.getElementById('tipText');

    this.numericInputArea = document.getElementById('numericInputArea');
    this.answerInput = document.getElementById('answerInput');
    this.btnSubmitAnswer = document.getElementById('btnSubmitAnswer');
    this.comparisonInputArea = document.getElementById('comparisonInputArea');
    this.btnChoiceLeft = document.getElementById('btnChoiceLeft');
    this.btnChoiceRight = document.getElementById('btnChoiceRight');

    this.feedbackOverlay = document.getElementById('feedbackOverlay');
    this.feedbackIcon = document.getElementById('feedbackIcon');
    this.feedbackText = document.getElementById('feedbackText');

    // Result Elements
    this.resAccuracy = document.getElementById('resAccuracy');
    this.resCorrectCount = document.getElementById('resCorrectCount');
    this.resAvgSpeed = document.getElementById('resAvgSpeed');
    this.resTotalTime = document.getElementById('resTotalTime');
    this.resFastest = document.getElementById('resFastest');
    this.reviewList = document.getElementById('reviewList');
    this.btnRetryWrong = document.getElementById('btnRetryWrong');
    this.sessionComparisonChart = document.getElementById('sessionComparisonChart');
    this.chartSessionDeltaBadge = document.getElementById('chartSessionDeltaBadge');
    this.btnGoToHistory = document.getElementById('btnGoToHistory');

    // Navigation & History View Elements
    this.historyView = document.getElementById('historyView');
    this.tabNavPractice = document.getElementById('tabNavPractice');
    this.tabNavHistory = document.getElementById('tabNavHistory');
    this.historyMainChart = document.getElementById('historyMainChart');
    this.historyMainStatBadge = document.getElementById('historyMainStatBadge');
    this.historyTableBody = document.getElementById('historyTableBody');
    this.historyEmptyMsg = document.getElementById('historyEmptyMsg');
    this.btnClearAllHistory = document.getElementById('btnClearAllHistory');
    this.btnHistoryToDrill = document.getElementById('btnHistoryToDrill');

    this.historyFilterCat = 'all';
    this.historyFilterCount = 'all';

    // Modal
    this.statsModal = document.getElementById('statsModal');
    this.historyTrendChart = document.getElementById('historyTrendChart');
  }

  initEventListeners() {
    // Theme toggle buttons (Beige / Dark)
    document.getElementById('btnThemeBeige')?.addEventListener('click', () => this.applyTheme('beige'));
    document.getElementById('btnThemeDark')?.addEventListener('click', () => this.applyTheme('dark'));

    // Sound toggle
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const enabled = this.sound.toggle();
      document.getElementById('soundIcon').textContent = enabled ? '🔊' : '🔇';
    });

    // Accordion Guide Toggle
    const guideCard = document.getElementById('methodGuideCard');
    document.getElementById('guideHeaderToggle').addEventListener('click', () => {
      guideCard.classList.toggle('open');
    });

    // Mode Selection Cards
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentMode = card.dataset.mode;
        this.renderSubTypes();
      });
    });

    // Count Segments
    document.querySelectorAll('#countOptions .btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#countOptions .btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCount = parseInt(btn.dataset.count, 10);
        this.updateDistributionUI();
      });
    });

    // Subtype Quick Actions (Select All / Reset)
    document.getElementById('btnSelectAllSubs')?.addEventListener('click', () => {
      const list = this.subTypesMap[this.currentMode] || [];
      this.selectedSubTypes = list.map(s => s.id);
      this.currentSubType = this.selectedSubTypes.join(',');
      document.querySelectorAll('#subTypeOptions .subtype-toggle-btn').forEach(btn => {
        btn.classList.add('active');
        const check = btn.querySelector('.sub-check');
        if (check) check.textContent = '✓';
      });
      this.updateDistributionUI();
    });

    document.getElementById('btnResetSubs')?.addEventListener('click', () => {
      const list = this.subTypesMap[this.currentMode] || [];
      this.selectedSubTypes = [list[0]?.id || 'default'];
      this.currentSubType = this.selectedSubTypes[0];
      document.querySelectorAll('#subTypeOptions .subtype-toggle-btn').forEach((btn, idx) => {
        const check = btn.querySelector('.sub-check');
        if (idx === 0) {
          btn.classList.add('active');
          if (check) check.textContent = '✓';
        } else {
          btn.classList.remove('active');
          if (check) check.textContent = '';
        }
      });
      this.updateDistributionUI();
    });

    // Distribution Mode Switch (Equal / Custom)
    document.getElementById('distModeEqual')?.addEventListener('click', () => {
      this.distributionMode = 'equal';
      this.updateDistributionUI();
    });

    document.getElementById('distModeCustom')?.addEventListener('click', () => {
      this.distributionMode = 'custom';
      this.updateDistributionUI();
    });

    // Quick Stepper Actions for Custom Distribution
    document.getElementById('btnQuickPlus5')?.addEventListener('click', () => {
      this.selectedSubTypes.forEach(id => {
        this.customSubTypeCounts[id] = (this.customSubTypeCounts[id] || 5) + 5;
      });
      this.updateDistributionUI();
    });

    document.getElementById('btnQuickPlus10')?.addEventListener('click', () => {
      this.selectedSubTypes.forEach(id => {
        this.customSubTypeCounts[id] = (this.customSubTypeCounts[id] || 5) + 10;
      });
      this.updateDistributionUI();
    });

    document.getElementById('btnQuickSet20')?.addEventListener('click', () => {
      const per = Math.max(2, Math.floor(20 / Math.max(1, this.selectedSubTypes.length)));
      this.selectedSubTypes.forEach(id => {
        this.customSubTypeCounts[id] = per;
      });
      this.updateDistributionUI();
    });

    // Difficulty Segments
    document.querySelectorAll('#diffOptions .btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#diffOptions .btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDifficulty = btn.dataset.diff;
      });
    });

    // Start Drill
    document.getElementById('btnStartDrill').addEventListener('click', () => this.startDrill());
    document.getElementById('btnExitDrill').addEventListener('click', () => this.exitDrill());
    document.getElementById('btnRestartDrill').addEventListener('click', () => this.startDrill());
    document.getElementById('btnBackToLobby').addEventListener('click', () => this.showView('lobby'));

    // Input submission
    this.btnSubmitAnswer.addEventListener('click', () => this.submitAnswer(this.answerInput.value.trim()));
    this.answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitAnswer(this.answerInput.value.trim());
      }
    });

    // Virtual Numpad
    document.querySelectorAll('.np-key').forEach(key => {
      key.addEventListener('click', () => {
        const val = key.dataset.key;
        if (val === 'enter') {
          this.submitAnswer(this.answerInput.value.trim());
        } else if (val === 'clear') {
          this.answerInput.value = '';
        } else {
          this.answerInput.value += val;
        }
        this.answerInput.focus();
      });
    });

    // Pause / Resume Events
    this.btnPauseDrill.addEventListener('click', () => this.togglePause());
    this.btnResumeDrill.addEventListener('click', () => this.togglePause(false));

    // Comparison Mode Buttons
    this.btnChoiceLeft.addEventListener('click', () => this.submitAnswer('left'));
    this.btnChoiceRight.addEventListener('click', () => this.submitAnswer('right'));

    // Global Keydown for Comparison, Pause and Shortcuts
    window.addEventListener('keydown', (e) => {
      // Toggle sound on 'M'
      if ((e.key === 'm' || e.key === 'M') && document.activeElement !== this.answerInput) {
        const enabled = this.sound.toggle();
        document.getElementById('soundIcon').textContent = enabled ? '🔊' : '🔇';
        return;
      }

      // Toggle theme on 'T'
      if ((e.key === 't' || e.key === 'T') && document.activeElement !== this.answerInput) {
        this.toggleTheme();
        return;
      }

      if (!this.isDrillActive) {
        if (e.key === 'Enter' && this.lobbyView.classList.contains('active')) {
          this.startDrill();
        }
        return;
      }

      // Space or 'P' to toggle Pause
      if (e.key === 'p' || e.key === 'P' || (e.key === ' ' && (this.isPaused || this.currentQuestion?.type === 'comparison' || document.activeElement !== this.answerInput))) {
        e.preventDefault();
        this.togglePause();
        return;
      }

      if (this.isPaused) return;

      if (this.currentQuestion && this.currentQuestion.type === 'comparison') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === '<' || e.key === '1') {
          e.preventDefault();
          this.submitAnswer('left');
        } else if (e.key === 'ArrowRight' || e.key === 'b' || e.key === 'B' || e.key === '>' || e.key === '2') {
          e.preventDefault();
          this.submitAnswer('right');
        }
      }
    });

    // Modal Events
    document.getElementById('btnStatsModal').addEventListener('click', () => this.openStatsModal());
    document.getElementById('btnCloseModal').addEventListener('click', () => this.closeStatsModal());
    this.statsModal.addEventListener('click', (e) => {
      if (e.target === this.statsModal) this.closeStatsModal();
    });
    document.getElementById('btnClearVault').addEventListener('click', () => {
      if (confirm('오답 보관함을 모두 비우시겠습니까?')) {
        this.stats.clearVault();
        this.renderVault();
      }
    });

    // Retry wrong
    this.btnRetryWrong.addEventListener('click', () => {
      const wrongList = this.questions.filter(q => !q.isCorrect);
      if (wrongList.length > 0) {
        this.startCustomDrill(wrongList);
      }
    });

    // Top Navigation & History View Events
    this.tabNavPractice.addEventListener('click', () => this.showView('lobby'));
    this.tabNavHistory.addEventListener('click', () => this.showView('history'));
    this.btnGoToHistory.addEventListener('click', () => this.showView('history'));
    this.btnHistoryToDrill.addEventListener('click', () => this.showView('lobby'));

    // History View Category Filters
    document.querySelectorAll('#historyCatFilter .btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#historyCatFilter .btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.historyFilterCat = btn.dataset.cat;
        this.renderHistoryView();
      });
    });

    // History View Count Filters
    document.querySelectorAll('#historyCountFilter .btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#historyCountFilter .btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.historyFilterCount = btn.dataset.cnt;
        this.renderHistoryView();
      });
    });

    // Clear History Button
    this.btnClearAllHistory.addEventListener('click', () => {
      if (confirm('모든 회차별 풀이 기록을 초기화하시겠습니까?')) {
        this.stats.clearSessionHistory();
        this.renderHistoryView();
      }
    });
  }

  initTheme() {
    const saved = localStorage.getItem('psat_theme') || 'beige';
    this.applyTheme(saved);
  }

  applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('psat_theme', themeName);

    // Update active pill button state
    const btnBeige = document.getElementById('btnThemeBeige');
    const btnDark = document.getElementById('btnThemeDark');
    if (btnBeige && btnDark) {
      btnBeige.classList.toggle('active', themeName === 'beige');
      btnDark.classList.toggle('active', themeName === 'dark');
    }

    // Redraw charts with adapted theme colors
    if (this.resultView && this.resultView.classList.contains('active')) {
      const history = this.stats.getSessionHistory();
      if (history.length > 0) this.drawSessionComparisonChart(history[history.length - 1]);
    } else if (this.historyView && this.historyView.classList.contains('active')) {
      this.renderHistoryView();
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'beige';
    const next = current === 'beige' ? 'dark' : 'beige';
    this.applyTheme(next);
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  renderSubTypes() {
    const list = this.subTypesMap[this.currentMode] || [];
    const container = document.getElementById('subTypeOptions');
    container.innerHTML = '';

    // Validate selectedSubTypes are within current mode
    const validIds = list.map(s => s.id);
    this.selectedSubTypes = this.selectedSubTypes.filter(id => validIds.includes(id));
    if (this.selectedSubTypes.length === 0) {
      this.selectedSubTypes = [list[0]?.id || 'default'];
    }
    this.currentSubType = this.selectedSubTypes.join(',');

    list.forEach(sub => {
      const isSelected = this.selectedSubTypes.includes(sub.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-segment subtype-toggle-btn ${isSelected ? 'active' : ''}`;
      btn.dataset.sub = sub.id;
      btn.innerHTML = `<span class="sub-check">${isSelected ? '✓' : ''}</span><span class="sub-name-text">${sub.name}</span>`;

      btn.addEventListener('click', () => {
        const currentlySelected = this.selectedSubTypes.includes(sub.id);
        if (currentlySelected) {
          if (this.selectedSubTypes.length === 1) {
            btn.classList.add('shake-anim');
            setTimeout(() => btn.classList.remove('shake-anim'), 400);
            return;
          }
          this.selectedSubTypes = this.selectedSubTypes.filter(id => id !== sub.id);
          btn.classList.remove('active');
          const check = btn.querySelector('.sub-check');
          if (check) check.textContent = '';
        } else {
          this.selectedSubTypes.push(sub.id);
          btn.classList.add('active');
          const check = btn.querySelector('.sub-check');
          if (check) check.textContent = '✓';
        }
        this.currentSubType = this.selectedSubTypes.join(',');
        this.updateDistributionUI();
      });

      container.appendChild(btn);
    });

    const titles = {
      add: '덧셈 훈련 상세 설정',
      sub: '뺄셈 훈련 상세 설정',
      mul: '곱셈 훈련 상세 설정',
      frac: '분수 대소비교 상세 설정',
      mulcomp: '곱셈 대소비교 상세 설정',
      mixed: '종합 비타민 실전 모드 설정'
    };
    document.getElementById('currentModeTitle').textContent = titles[this.currentMode] || '상세 설정';

    this.updateDistributionUI();
  }

  updateDistributionUI() {
    const equalSec = document.getElementById('equalCountSection');
    const customSec = document.getElementById('customCountSection');
    const distModeEqual = document.getElementById('distModeEqual');
    const distModeCustom = document.getElementById('distModeCustom');
    const distSummaryText = document.getElementById('distSummaryText');
    const customSubList = document.getElementById('customSubList');
    const customTotalDisplay = document.getElementById('customTotalCountDisplay');

    if (this.distributionMode === 'custom') {
      distModeEqual?.classList.remove('active');
      distModeCustom?.classList.add('active');
      equalSec?.classList.add('hidden');
      customSec?.classList.remove('hidden');

      if (customSubList) {
        customSubList.innerHTML = '';
        let totalCustom = 0;

        this.selectedSubTypes.forEach(subId => {
          const subName = this.getSubName(subId);
          if (!this.customSubTypeCounts[subId] || this.customSubTypeCounts[subId] <= 0) {
            const defaultPer = Math.max(5, Math.floor((this.currentCount >= 999 ? 20 : this.currentCount) / Math.max(1, this.selectedSubTypes.length)));
            this.customSubTypeCounts[subId] = defaultPer;
          }
          const cnt = this.customSubTypeCounts[subId];
          totalCustom += cnt;

          const row = document.createElement('div');
          row.className = 'custom-sub-row';
          row.innerHTML = `
            <div class="custom-sub-name">
              <span class="sub-bullet">✦</span>
              <strong>${subName}</strong>
            </div>
            <div class="stepper-controls">
              <button type="button" class="btn-stepper btn-sub-minus" data-sub="${subId}" title="1문항 감소">−</button>
              <input type="number" class="stepper-input" data-sub="${subId}" value="${cnt}" min="1" max="100" />
              <button type="button" class="btn-stepper btn-sub-plus" data-sub="${subId}" title="1문항 추가">+</button>
              <span class="stepper-unit">문항</span>
            </div>
          `;

          const input = row.querySelector('.stepper-input');

          row.querySelector('.btn-sub-minus').addEventListener('click', () => {
            const cur = this.customSubTypeCounts[subId] || 1;
            if (cur > 1) {
              this.customSubTypeCounts[subId] = cur - 1;
              input.value = this.customSubTypeCounts[subId];
              this.updateCustomTotalDisplay();
            }
          });

          row.querySelector('.btn-sub-plus').addEventListener('click', () => {
            const cur = this.customSubTypeCounts[subId] || 1;
            if (cur < 100) {
              this.customSubTypeCounts[subId] = cur + 1;
              input.value = this.customSubTypeCounts[subId];
              this.updateCustomTotalDisplay();
            }
          });

          input.addEventListener('change', () => {
            let val = parseInt(input.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 100) val = 100;
            input.value = val;
            this.customSubTypeCounts[subId] = val;
            this.updateCustomTotalDisplay();
          });

          customSubList.appendChild(row);
        });

        if (customTotalDisplay) {
          customTotalDisplay.textContent = totalCustom;
        }
      }
    } else {
      distModeEqual?.classList.add('active');
      distModeCustom?.classList.remove('active');
      equalSec?.classList.remove('hidden');
      customSec?.classList.add('hidden');

      if (distSummaryText) {
        const count = this.currentCount;
        const numTypes = this.selectedSubTypes.length;
        if (count >= 999) {
          distSummaryText.textContent = `선택된 ${numTypes}개 유형이 무제한(Endless)으로 균등하게 무작위 출제됩니다.`;
        } else if (numTypes === 1) {
          const name = this.getSubName(this.selectedSubTypes[0]);
          distSummaryText.textContent = `선택된 유형 '${name}' 단독으로 총 ${count}문항이 출제됩니다.`;
        } else {
          const names = this.selectedSubTypes.map(id => this.getSubName(id)).join(', ');
          const perType = Math.floor(count / numTypes);
          const remainder = count % numTypes;
          const distDetail = remainder === 0 ? `각 ${perType}문항씩` : `각 ${perType}~${perType + 1}문항씩`;
          distSummaryText.textContent = `선택된 ${numTypes}개 유형(${names})에 ${distDetail} 균등 분배되어 총 ${count}문항이 무작위 순서로 출제됩니다.`;
        }
      }
    }
  }

  updateCustomTotalDisplay() {
    let total = 0;
    this.selectedSubTypes.forEach(id => {
      total += (this.customSubTypeCounts[id] || 0);
    });
    const customTotalDisplay = document.getElementById('customTotalCountDisplay');
    if (customTotalDisplay) {
      customTotalDisplay.textContent = total;
    }
  }

  showView(viewName) {
    this.lobbyView.classList.remove('active');
    this.drillView.classList.remove('active');
    this.resultView.classList.remove('active');
    this.historyView.classList.remove('active');

    // Update navigation active tab
    if (viewName === 'history') {
      this.tabNavPractice.classList.remove('active');
      this.tabNavHistory.classList.add('active');
    } else {
      this.tabNavPractice.classList.add('active');
      this.tabNavHistory.classList.remove('active');
    }

    if (viewName === 'lobby') {
      this.isDrillActive = false;
      this.stopTimers();
      this.lobbyView.classList.add('active');
      this.updateHeaderStats();
    } else if (viewName === 'drill') {
      this.isDrillActive = true;
      this.drillView.classList.add('active');
    } else if (viewName === 'result') {
      this.isDrillActive = false;
      this.stopTimers();
      this.resultView.classList.add('active');
    } else if (viewName === 'history') {
      this.isDrillActive = false;
      this.stopTimers();
      this.historyView.classList.add('active');
      setTimeout(() => this.renderHistoryView(), 30);
    }
  }

  // -------------------------------------------------------------
  // DRILL ENGINE
  // -------------------------------------------------------------
  startDrill() {
    this.sound.init();
    this.questions = [];
    this.currentIndex = 0;

    const selected = this.selectedSubTypes.length > 0 
      ? this.selectedSubTypes 
      : [this.subTypesMap[this.currentMode][0].id];

    if (this.distributionMode === 'custom') {
      selected.forEach(subId => {
        const cnt = Math.max(1, this.customSubTypeCounts[subId] || 5);
        for (let i = 0; i < cnt; i++) {
          this.questions.push(ProblemGenerator.generate(this.currentMode, subId, this.currentDifficulty));
        }
      });
      this.shuffleArray(this.questions);
      this.currentCount = this.questions.length;
    } else {
      const count = this.currentCount;
      if (count >= 999) {
        // Endless mode (initial 100 questions pool, randomly drawn from selected)
        for (let i = 0; i < 100; i++) {
          const chosenSub = selected[ProblemGenerator.randInt(0, selected.length - 1)];
          this.questions.push(ProblemGenerator.generate(this.currentMode, chosenSub, this.currentDifficulty));
        }
      } else {
        const base = Math.floor(count / selected.length);
        const remainder = count % selected.length;
        selected.forEach((subId, idx) => {
          const cnt = base + (idx < remainder ? 1 : 0);
          for (let i = 0; i < cnt; i++) {
            this.questions.push(ProblemGenerator.generate(this.currentMode, subId, this.currentDifficulty));
          }
        });
        this.shuffleArray(this.questions);
      }
    }

    this.setupDrillSession();
  }

  startCustomDrill(customQuestions) {
    this.sound.init();
    this.questions = customQuestions.map(q => ({
      ...q,
      isCorrect: false,
      userAnswer: '',
      timeTaken: 0
    }));
    this.currentIndex = 0;
    this.setupDrillSession();
  }

  setupDrillSession() {
    this.totalQNumEl.textContent = (this.distributionMode === 'equal' && this.currentCount >= 999) ? '∞' : this.questions.length;
    this.drillModeBadge.textContent = this.getModeName(this.currentMode);
    
    if (this.selectedSubTypes.length > 1) {
      const names = this.selectedSubTypes.map(s => this.getSubName(s));
      if (names.length === 2) {
        this.drillSubBadge.textContent = `${names[0]}, ${names[1]} 혼합`;
      } else {
        this.drillSubBadge.textContent = `${names[0]} 외 ${names.length - 1}개 혼합`;
      }
    } else {
      this.drillSubBadge.textContent = this.getSubName(this.selectedSubTypes[0]);
    }

    this.sessionStartTime = performance.now();
    this.startSessionTimer();

    this.showView('drill');
    this.loadQuestion(0);
  }

  loadQuestion(index) {
    if (index >= this.questions.length) {
      this.finishDrill();
      return;
    }

    this.currentIndex = index;
    this.currentQuestion = this.questions[index];
    this.currentQNumEl.textContent = index + 1;

    // Progress bar
    const pct = ((index) / this.questions.length) * 100;
    this.drillProgressBar.style.width = `${pct}%`;

    // Live accuracy
    const answered = this.questions.slice(0, index);
    const correctCount = answered.filter(q => q.isCorrect).length;
    const acc = answered.length === 0 ? 100 : Math.round((correctCount / answered.length) * 100);
    this.liveAccuracyEl.textContent = `${acc}%`;

    // Render Expression
    this.expressionArea.innerHTML = this.currentQuestion.displayHtml;

    // Tip Banner
    if (this.currentQuestion.tip) {
      this.tipText.textContent = this.currentQuestion.tip;
      this.methodTipBanner.classList.remove('hidden');
    } else {
      this.methodTipBanner.classList.add('hidden');
    }

    // Toggle Input Types
    if (this.currentQuestion.type === 'comparison') {
      this.numericInputArea.classList.add('hidden');
      this.numericInputArea.style.display = 'none';
      this.comparisonInputArea.classList.add('hidden');
      this.comparisonInputArea.style.display = 'none';

      // Attach direct click events to comparison cards
      this.expressionArea.querySelectorAll('.clickable-comp-card').forEach(card => {
        card.onclick = () => {
          if (this.isPaused) return;
          this.submitAnswer(card.dataset.choice);
        };
      });
    } else {
      this.comparisonInputArea.classList.add('hidden');
      this.comparisonInputArea.style.display = 'none';
      this.numericInputArea.classList.remove('hidden');
      this.numericInputArea.style.display = '';
      this.answerInput.value = '';
      this.answerInput.focus();
    }

    // Question Timer
    this.questionStartTime = performance.now();
    this.startQuestionTimer();
  }

  togglePause(forceState) {
    if (!this.isDrillActive) return;
    const shouldPause = forceState !== undefined ? forceState : !this.isPaused;
    if (shouldPause === this.isPaused) return;

    this.isPaused = shouldPause;
    if (this.isPaused) {
      this.pauseStartTime = performance.now();
      this.stopTimers();
      this.pauseOverlay.classList.remove('hidden');
      this.btnPauseDrill.textContent = '▶️ 계속하기';
    } else {
      const pausedDuration = performance.now() - this.pauseStartTime;
      this.questionStartTime += pausedDuration;
      this.sessionStartTime += pausedDuration;
      this.pauseOverlay.classList.add('hidden');
      this.btnPauseDrill.textContent = '⏸️ 일시정지';
      this.startQuestionTimer();
      this.startSessionTimer();
      if (this.currentQuestion && this.currentQuestion.type === 'numeric') {
        this.answerInput.focus();
      }
    }
  }

  submitAnswer(userAns) {
    if (!this.isDrillActive || !this.currentQuestion || this.isPaused) return;
    if (userAns === '') return;

    const timeTaken = (performance.now() - this.questionStartTime) / 1000;
    const isCorrect = userAns.toString().trim().toLowerCase() === this.currentQuestion.correctAnswer.toLowerCase();

    this.currentQuestion.userAnswer = userAns;
    this.currentQuestion.isCorrect = isCorrect;
    this.currentQuestion.timeTaken = parseFloat(timeTaken.toFixed(2));

    this.showFeedback(isCorrect, timeTaken);

    if (isCorrect) {
      this.sound.playCorrect();
    } else {
      this.sound.playWrong();
      this.problemCard.classList.add('shake');
      setTimeout(() => this.problemCard.classList.remove('shake'), 400);
    }

    // Auto Advance after brief feedback delay
    setTimeout(() => {
      this.loadQuestion(this.currentIndex + 1);
    }, isCorrect ? 250 : 600);
  }

  showFeedback(isCorrect, timeTaken) {
    this.feedbackOverlay.className = `feedback-overlay ${isCorrect ? 'correct' : 'wrong'}`;
    this.feedbackIcon.textContent = isCorrect ? '✓' : '✕';
    this.feedbackText.textContent = isCorrect ? `${timeTaken.toFixed(2)}초` : `정답: ${this.currentQuestion.correctAnswer}`;

    setTimeout(() => {
      this.feedbackOverlay.className = 'feedback-overlay';
    }, 450);
  }

  startQuestionTimer() {
    clearInterval(this.questionTimerInterval);
    this.currentSecEl.textContent = '0.00';
    this.questionTimerInterval = setInterval(() => {
      if (this.isPaused) return;
      const elapsed = (performance.now() - this.questionStartTime) / 1000;
      this.currentSecEl.textContent = elapsed.toFixed(2);
    }, 40);
  }

  startSessionTimer() {
    clearInterval(this.sessionTimerInterval);
    this.totalSecEl.textContent = '00:00';
    this.sessionTimerInterval = setInterval(() => {
      if (this.isPaused) return;
      const totalSec = Math.floor((performance.now() - this.sessionStartTime) / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      this.totalSecEl.textContent = `${mins}:${secs}`;
    }, 500);
  }

  stopTimers() {
    clearInterval(this.questionTimerInterval);
    clearInterval(this.sessionTimerInterval);
  }

  exitDrill() {
    if (confirm('현재 진행 중인 훈련을 중단하고 메인으로 돌아가시겠습니까?')) {
      this.showView('lobby');
    }
  }

  finishDrill() {
    this.stopTimers();
    this.sound.playFanfare();

    const totalCount = this.questions.length;
    const correctCount = this.questions.filter(q => q.isCorrect).length;
    const accuracy = Math.round((correctCount / totalCount) * 100);
    const totalTimeSec = this.questions.reduce((acc, q) => acc + q.timeTaken, 0);
    const avgSpeed = parseFloat((totalTimeSec / totalCount).toFixed(2));
    const fastest = Math.min(...this.questions.map(q => q.timeTaken)).toFixed(2);

    // Save stats & session history
    const currentSession = this.stats.recordSession(this.currentMode, this.currentSubType, this.questions);

    // Render Scorecard
    this.resAccuracy.textContent = `${accuracy}%`;
    this.resCorrectCount.textContent = `${correctCount} / ${totalCount} 문항`;
    this.resAvgSpeed.innerHTML = `${avgSpeed}<span class="unit">초</span>`;
    this.resTotalTime.textContent = this.formatSeconds(Math.round(totalTimeSec));
    this.resFastest.textContent = `${fastest}초`;

    // Render Session Comparison Line Chart
    this.drawSessionComparisonChart(currentSession);

    // Render Review List
    this.renderReviewList();

    // Toggle Retry Wrong button
    const wrongCount = totalCount - correctCount;
    if (wrongCount > 0) {
      this.btnRetryWrong.classList.remove('hidden');
      this.btnRetryWrong.textContent = `🔁 틀린 문제만 다시 풀기 (${wrongCount}문항)`;
    } else {
      this.btnRetryWrong.classList.add('hidden');
    }

    this.showView('result');
  }

  drawSessionComparisonChart(currentSession) {
    if (!this.sessionComparisonChart) return;
    const history = this.stats.getSessionHistory();
    // Filter matching sessions: same category and count if available
    let matching = history.filter(h => h.category === currentSession.category && h.count === currentSession.count);
    if (matching.length < 2) {
      matching = history.filter(h => h.count === currentSession.count);
    }
    if (matching.length < 2) {
      matching = history;
    }

    const recent = matching.slice(-15);
    const points = recent.map((h, idx) => ({
      label: `${idx + 1}회`,
      val: h.totalTimeSec
    }));

    const avgVal = points.length > 0 ? parseFloat((points.reduce((acc, p) => acc + p.val, 0) / points.length).toFixed(1)) : 0;

    // Delta badge
    if (recent.length >= 2) {
      const prev = recent[recent.length - 2];
      const diff = parseFloat((currentSession.totalTimeSec - prev.totalTimeSec).toFixed(1));
      if (diff < 0) {
        this.chartSessionDeltaBadge.textContent = `이전 ${prev.count}문항 회차 대비 ${Math.abs(diff)}초 단축! 🚀`;
        this.chartSessionDeltaBadge.style.color = 'var(--accent-success)';
      } else if (diff > 0) {
        this.chartSessionDeltaBadge.textContent = `이전 ${prev.count}문항 회차 대비 +${diff}초`;
        this.chartSessionDeltaBadge.style.color = 'var(--accent-warning)';
      } else {
        this.chartSessionDeltaBadge.textContent = `이전 회차와 동일 소요`;
        this.chartSessionDeltaBadge.style.color = 'var(--accent-secondary)';
      }
    } else {
      this.chartSessionDeltaBadge.textContent = `첫 번째 회차 기록 (${currentSession.totalTimeSec}초)`;
    }

    this.drawLineChart(this.sessionComparisonChart, points, {
      avgVal: avgVal
    });
  }

  renderHistoryView() {
    const history = this.stats.getSessionHistory();
    let filtered = history;

    if (this.historyFilterCat !== 'all') {
      filtered = filtered.filter(h => h.category === this.historyFilterCat);
    }
    if (this.historyFilterCount !== 'all') {
      const cnt = parseInt(this.historyFilterCount, 10);
      filtered = filtered.filter(h => h.count === cnt);
    }

    // Update header badges and titles
    this.historyMainStatBadge.textContent = `총 ${filtered.length}회차 기록`;
    const catName = this.historyFilterCat === 'all' ? '전체 영역' : this.getModeName(this.historyFilterCat);
    const cntName = this.historyFilterCount === 'all' ? '전체 문항' : `${this.historyFilterCount}문항`;
    document.getElementById('historyMainChartTitle').textContent = `📈 ${catName} (${cntName}) 회차별 총 소요시간 변화 (초)`;

    // Draw Main Line Chart
    const points = filtered.map((h, idx) => ({
      label: `${idx + 1}회`,
      val: h.totalTimeSec
    }));

    const avgVal = points.length > 0 ? parseFloat((points.reduce((acc, p) => acc + p.val, 0) / points.length).toFixed(1)) : 0;
    this.drawLineChart(this.historyMainChart, points, {
      avgVal: avgVal
    });

    // Populate History Records Table
    this.historyTableBody.innerHTML = '';
    if (filtered.length === 0) {
      this.historyEmptyMsg.classList.remove('hidden');
    } else {
      this.historyEmptyMsg.classList.add('hidden');
      const reversed = [...filtered].reverse();
      reversed.forEach((h, idx) => {
        const roundNum = filtered.length - idx;
        const tr = document.createElement('tr');
        const accBadge = h.accuracy >= 90 ? 'is-correct' : (h.accuracy >= 75 ? 'badge-accent' : 'is-wrong');
        tr.innerHTML = `
          <td><strong>#${roundNum}회차</strong></td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${h.date}</td>
          <td><span class="badge badge-outline">${this.getModeName(h.category)}</span></td>
          <td><strong>${h.count}문항</strong></td>
          <td><strong style="color: var(--accent-secondary); font-size: 1.05rem;">${h.totalTimeSec}초</strong></td>
          <td>${h.avgSpeed}초/문항</td>
          <td><span class="row-badge ${accBadge}">${h.accuracy}%</span></td>
        `;
        this.historyTableBody.appendChild(tr);
      });
    }
  }

  drawHistoryTrendChart() {
    if (!this.historyTrendChart) return;
    const history = this.stats.getSessionHistory();
    if (history.length === 0) return;

    const points = history.map((h, idx) => ({
      label: `${idx + 1}회`,
      val: h.avgSpeed
    }));

    this.drawLineChart(this.historyTrendChart, points, {
      targetVal: 3.0
    });
  }

  drawLineChart(canvas, dataPoints, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    if (!dataPoints || dataPoints.length === 0) return;

    const padding = { top: 25, right: 25, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const rawMax = Math.max(...dataPoints.map(d => d.val), 4);
    const maxVal = Math.ceil(rawMax + 1);

    const isBeige = (document.documentElement.getAttribute('data-theme') || 'beige') === 'beige';
    const gridColor = isBeige ? 'rgba(140, 110, 80, 0.16)' : 'rgba(255, 255, 255, 0.08)';
    const textColor = isBeige ? '#736254' : '#94a3b8';
    const lineColor = isBeige ? '#b45309' : '#06b6d4';
    const gradColor1 = isBeige ? 'rgba(180, 83, 9, 0.22)' : 'rgba(6, 182, 212, 0.25)';
    const gradColor2 = isBeige ? 'rgba(180, 83, 9, 0.0)' : 'rgba(6, 182, 212, 0.0)';
    const dotBg = isBeige ? '#ffffff' : '#0a0d14';
    const dotValueColor = isBeige ? '#b45309' : '#38bdf8';

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const yVal = (maxVal / steps) * i;
      const y = padding.top + chartH - (yVal / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toFixed(1) + 's', padding.left - 8, y + 4);
    }

    // Target line (3.0s)
    if (options.targetVal !== undefined && options.targetVal <= maxVal) {
      const targetY = padding.top + chartH - (options.targetVal / maxVal) * chartH;
      ctx.save();
      ctx.strokeStyle = '#15803d';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, targetY);
      ctx.lineTo(padding.left + chartW, targetY);
      ctx.stroke();
      ctx.restore();
    }

    // Average line
    if (options.avgVal !== undefined && options.avgVal <= maxVal) {
      const avgY = padding.top + chartH - (options.avgVal / maxVal) * chartH;
      ctx.save();
      ctx.strokeStyle = '#d97706';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, avgY);
      ctx.lineTo(padding.left + chartW, avgY);
      ctx.stroke();
      ctx.restore();
    }

    // Coordinates
    const points = dataPoints.map((d, idx) => {
      const x = dataPoints.length === 1 
        ? padding.left + chartW / 2 
        : padding.left + (idx / (dataPoints.length - 1)) * chartW;
      const y = padding.top + chartH - (d.val / maxVal) * chartH;
      return { x, y, label: d.label, val: d.val };
    });

    if (points.length > 1) {
      // Gradient fill under line
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, gradColor1);
      grad.addColorStop(1, gradColor2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      ctx.fill();

      // Stroke line
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // Data points, values, and X labels
    const labelStep = Math.ceil(dataPoints.length / 10);
    points.forEach((p, idx) => {
      // Circle
      ctx.fillStyle = dotBg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Value label on top (if <= 15 points)
      if (points.length <= 15) {
        ctx.fillStyle = dotValueColor;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.val}s`, p.x, p.y - 10);
      }

      // X-axis label below
      if (idx % labelStep === 0 || idx === dataPoints.length - 1 || dataPoints.length === 1) {
        ctx.fillStyle = textColor;
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, p.x, padding.top + chartH + 18);
      }
    });
  }

  renderReviewList(filter = 'all') {
    this.reviewList.innerHTML = '';
    const filtered = filter === 'wrong' 
      ? this.questions.filter(q => !q.isCorrect)
      : this.questions;

    document.getElementById('countAllFilter').textContent = this.questions.length;
    document.getElementById('countWrongFilter').textContent = this.questions.filter(q => !q.isCorrect).length;

    filtered.forEach((q, idx) => {
      const row = document.createElement('div');
      row.className = `review-row ${q.isCorrect ? 'correct' : 'wrong'}`;

      const tierClass = q.timeTaken < 2.0 ? 'speed-tier-fast' : (q.timeTaken <= 3.5 ? 'speed-tier-good' : 'speed-tier-slow');
      const tierLabel = q.timeTaken < 2.0 ? '⚡ 초고속' : (q.timeTaken <= 3.5 ? '🎯 합격권' : '⏱️ 보완필요');

      row.innerHTML = `
        <div class="row-expr">#${idx + 1}. ${q.rawExpression} = <span style="color: var(--accent-primary);">${q.correctAnswer}</span></div>
        <div class="row-res">
          <span class="row-speed-pill ${tierClass}">${tierLabel} <strong>${q.timeTaken.toFixed(2)}초</strong></span>
          <span class="row-badge ${q.isCorrect ? 'is-correct' : 'is-wrong'}">
            ${q.isCorrect ? '정답' : `오답 (입력: ${q.userAnswer})`}
          </span>
        </div>
      `;
      this.reviewList.appendChild(row);
    });

    // Review Filters
    document.querySelectorAll('.btn-filter').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderReviewList(btn.dataset.filter);
      };
    });
  }

  // -------------------------------------------------------------
  // MODAL & DASHBOARD
  // -------------------------------------------------------------
  openStatsModal() {
    const stats = this.stats.getStats();
    document.getElementById('modalTotalSolved').textContent = `${stats.totalSolved}문항`;
    const acc = stats.totalSolved === 0 ? 0 : Math.round((stats.totalCorrect / stats.totalSolved) * 100);
    document.getElementById('modalOverallAcc').textContent = `${acc}%`;
    const spd = stats.totalSolved === 0 ? '0.00' : (stats.totalTimeSeconds / stats.totalSolved).toFixed(2);
    document.getElementById('modalOverallSpeed').textContent = `${spd}초`;

    // Table Body
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    const catLabels = {
      add: '덧셈 훈련',
      sub: '뺄셈 훈련',
      mul: '곱셈 훈련',
      frac: '분수 대소비교',
      mulcomp: '곱셈 대소비교',
      mixed: '종합 비타민'
    };

    Object.keys(catLabels).forEach(key => {
      const c = stats.categories[key] || { solved: 0, correct: 0, timeSec: 0 };
      const catAcc = c.solved === 0 ? 0 : Math.round((c.correct / c.solved) * 100);
      const catSpd = c.solved === 0 ? 0 : (c.timeSec / c.solved).toFixed(2);
      const levelBadge = catSpd > 0 && catSpd <= 2.5 && catAcc >= 90 ? '🏆 마스터' : (c.solved > 20 ? '⚡ 훈련중' : '🌱 시작단계');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${catLabels[key]}</strong></td>
        <td>${c.solved}개</td>
        <td>${catSpd}s</td>
        <td>${catAcc}%</td>
        <td>${levelBadge}</td>
      `;
      tbody.appendChild(tr);
    });

    this.renderVault();
    this.statsModal.classList.remove('hidden');
    setTimeout(() => this.drawHistoryTrendChart(), 50);
  }

  renderVault() {
    const vault = this.stats.getVault();
    const vaultList = document.getElementById('vaultList');
    const vaultCount = document.getElementById('vaultCount');
    const btnSolveVault = document.getElementById('btnSolveVault');

    vaultCount.textContent = vault.length;
    vaultList.innerHTML = '';

    if (vault.length === 0) {
      vaultList.innerHTML = `<p class="empty-msg">오답 보관함이 비어 있습니다. 완벽합니다!</p>`;
      btnSolveVault.classList.add('hidden');
      return;
    }

    btnSolveVault.classList.remove('hidden');
    btnSolveVault.onclick = () => {
      this.closeStatsModal();
      const vaultQs = vault.map(v => ({
        type: (v.category === 'frac' || v.category === 'mulcomp') ? 'comparison' : 'numeric',
        category: v.category,
        subType: v.subType,
        displayHtml: `<div class="calc-math-expr">${v.rawExpression} = ?</div>`,
        rawExpression: v.rawExpression,
        correctAnswer: v.correctAnswer,
        tip: "오답 노트 재도전 문항입니다."
      }));
      this.startCustomDrill(vaultQs);
    };

    vault.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'vault-item';
      item.innerHTML = `
        <span>#${idx + 1} <strong>${v.rawExpression}</strong> (정답: ${v.correctAnswer})</span>
        <span style="color: var(--text-faint); font-size: 0.75rem;">${v.date}</span>
      `;
      vaultList.appendChild(item);
    });
  }

  closeStatsModal() {
    this.statsModal.classList.add('hidden');
  }

  updateHeaderStats() {
    const todaySolved = this.stats.getTodaySolvedCount();
    document.getElementById('todaySolvedDisplay').textContent = todaySolved;
  }

  formatSeconds(totalSec) {
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  getModeName(mode) {
    const map = {
      add: '덧셈 훈련',
      sub: '뺄셈 훈련',
      mul: '곱셈 훈련',
      frac: '분수 대소비교',
      mulcomp: '곱셈 대소비교',
      mixed: '종합 비타민'
    };
    return map[mode] || mode;
  }

  getSubName(sub) {
    if (!sub) return '전체';
    if (typeof sub === 'string' && sub.includes(',')) {
      const parts = sub.split(',').filter(Boolean);
      const names = parts.map(p => this.getSubName(p.trim()));
      if (names.length === 2) return `${names[0]}, ${names[1]} 혼합`;
      return `${names[0]} 외 ${names.length - 1}개 혼합`;
    }
    const list = this.subTypesMap[this.currentMode] || [];
    const found = list.find(s => s.id === sub);
    if (found) return found.name;
    for (const cat in this.subTypesMap) {
      const match = this.subTypesMap[cat].find(s => s.id === sub);
      if (match) return match.name;
    }
    return sub;
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Theme initialization
  const savedTheme = localStorage.getItem('psat_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  window.vitaminApp = new VitaminApp();
});
