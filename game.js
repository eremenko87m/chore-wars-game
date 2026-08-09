(() => {
  'use strict';

  const scenes = [
    { key: 'title', image: 'assets/title.png' },
    { key: 'mission1', image: 'assets/mission1.png' },
    { key: 'mission2', image: 'assets/mission2.png' },
    { key: 'mission3', image: 'assets/mission3.png' },
    { key: 'mission4', image: 'assets/mission4.png' },
    { key: 'mission5', image: 'assets/mission5.png' },
    { key: 'mission6', image: 'assets/mission6.png' },
    { key: 'final', image: 'assets/final.png' }
  ];

  const heroes = ['Max', 'Mia', 'Leo', 'Zoe'];
  const chores = ['make the bed', 'wash the dishes', 'feed the dog', 'water the plants', 'take out the rubbish', 'vacuum the floor'];
  const whenWords = ['every day', 'every morning', 'on Sundays', 'in summer', 'after dinner'];
  const whoWords = ['my mum', 'my dad', 'my brother', 'my best friend', 'our teacher'];

  const state = {
    scene: 0,
    players: [
      { name: 'Player 1', score: 0 },
      { name: 'Player 2', score: 0 },
      { name: 'Player 3', score: 0 },
      { name: 'Player 4', score: 0 }
    ],
    activePlayer: 0,
    missionDone: new Set(),
    sound: true,
    foundChores: new Set(),
    finalDone: new Set(),
    currentBattle: null,
    spinner: null,
    timerHandle: null
  };

  const el = id => document.getElementById(id);
  const sceneImage = el('sceneImage');
  const hotspotLayer = el('sceneHotspots');
  const hud = el('hud');
  const scoreboard = el('scoreboard');
  const actionTray = el('actionTray');
  const setupPanel = el('setupPanel');
  const modal = el('modal');
  const bottomNav = el('bottomNav');
  const progressFill = el('progressFill');
  const progressText = el('progressText');
  const activePlayerBtn = el('activePlayerBtn');
  const nextBtn = el('nextBtn');
  const prevBtn = el('prevBtn');
  const soundBtn = el('soundBtn');

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  }

  function tone(freq = 440, duration = .12, type = 'sine', volume = .045, delay = 0) {
    if (!state.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = tone.ctx || (tone.ctx = new AC());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delay + .01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + .03);
    } catch (_) {}
  }

  function sfx(kind) {
    if (!state.sound) return;
    if (kind === 'click') tone(420, .08, 'square', .025);
    if (kind === 'success') { tone(523, .11, 'sine', .05); tone(659, .12, 'sine', .05, .09); tone(784, .16, 'sine', .05, .18); }
    if (kind === 'wrong') { tone(180, .16, 'sawtooth', .035); tone(135, .2, 'sawtooth', .03, .1); }
    if (kind === 'spin') { for (let i=0;i<8;i++) tone(240 + i*42, .05, 'square', .018, i*.045); }
    if (kind === 'win') { [523,659,784,1046].forEach((f,i)=>tone(f,.25,'sine',.06,i*.13)); }
  }

  function renderScoreboard() {
    scoreboard.innerHTML = state.players.map((p, i) => `
      <button class="player-chip ${i === state.activePlayer ? 'active' : ''}" data-player="${i}" type="button">
        <span class="player-name">${escapeHtml(p.name)}</span>
        <span class="score-pill">${p.score}</span>
      </button>`).join('');
    scoreboard.querySelectorAll('[data-player]').forEach(btn => btn.addEventListener('click', () => {
      state.activePlayer = Number(btn.dataset.player);
      renderScoreboard(); updateTurnButton(); sfx('click');
    }));
  }

  function updateProgress() {
    const completed = state.missionDone.size;
    const total = 7;
    progressFill.style.width = `${Math.min(100, (completed / total) * 100)}%`;
    progressText.textContent = `${completed} / ${total}`;
  }

  function updateTurnButton() {
    activePlayerBtn.textContent = `TURN: ${state.players[state.activePlayer].name.toUpperCase()}`;
  }

  function awardPoint(amount = 1) {
    state.players[state.activePlayer].score += amount;
    sfx('success');
    renderScoreboard();
    const chip = scoreboard.children[state.activePlayer];
    if (chip) { chip.classList.add('pulse'); setTimeout(() => chip.classList.remove('pulse'), 800); }
    advanceTurn();
  }

  function advanceTurn() {
    state.activePlayer = (state.activePlayer + 1) % state.players.length;
    renderScoreboard(); updateTurnButton();
  }

  function markMissionDone(missionNumber) {
    if (!state.missionDone.has(missionNumber)) {
      state.missionDone.add(missionNumber);
      updateProgress();
    }
  }

  function showTray(html, compact = false) {
    actionTray.hidden = false;
    actionTray.className = `action-tray glass-panel${compact ? ' compact' : ''}`;
    actionTray.innerHTML = html;
  }
  function hideTray() { actionTray.hidden = true; actionTray.innerHTML = ''; }
  function clearHotspots() { hotspotLayer.innerHTML = ''; }

  function addHotspot({x,y,w,h,label,onClick,className=''}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hotspot ${className}`;
    b.setAttribute('aria-label', label);
    Object.assign(b.style, { left:`${x}%`, top:`${y}%`, width:`${w}%`, height:`${h}%` });
    b.addEventListener('click', () => { sfx('click'); onClick(b); });
    hotspotLayer.appendChild(b);
    return b;
  }

  function gotoScene(index) {
    state.scene = Math.max(0, Math.min(scenes.length - 1, index));
    sceneImage.src = scenes[state.scene].image;
    sceneImage.alt = scenes[state.scene].key.replace(/([0-9])/g,' $1');
    clearHotspots(); hideTray(); closeModal();
    if (state.timerHandle) { clearInterval(state.timerHandle); state.timerHandle = null; }

    prevBtn.disabled = state.scene <= 1;
    nextBtn.textContent = state.scene === scenes.length - 1 ? 'FINISH' : 'NEXT MISSION';

    if (state.scene === 1) setupMission1();
    if (state.scene === 2) setupMission2();
    if (state.scene === 3) setupMission3();
    if (state.scene === 4) setupMission4();
    if (state.scene === 5) setupMission5();
    if (state.scene === 6) setupMission6();
    if (state.scene === 7) setupFinal();
  }

  function setupMission1() {
    const spots = [
      { key:'make the bed', x:1.1,y:23,w:20.3,h:19.5 },
      { key:'wash the dishes', x:1.1,y:43.4,w:20.3,h:19.3 },
      { key:'take out the rubbish', x:1.1,y:64,w:20.3,h:18.5 },
      { key:'feed the dog', x:79.2,y:23,w:19.3,h:19.5 },
      { key:'water the plants', x:79.2,y:43.5,w:19.3,h:19.2 },
      { key:'vacuum the floor', x:79.2,y:64,w:19.3,h:18.5 }
    ];
    spots.forEach(s => addHotspot({ ...s, label:`Find chore: ${s.key}`, className: state.foundChores.has(s.key) ? 'found' : '', onClick(btn) {
      if (!state.foundChores.has(s.key)) {
        state.foundChores.add(s.key); btn.classList.add('found');
        showTray(`<div class="tray-title">FOUND: ${s.key.toUpperCase()}</div><div class="big-prompt">Say: “I ${s.key}.” or “He/She ${thirdPerson(s.key)}.”</div><div class="tray-row"><button class="award-btn" id="m1point">GOOD SENTENCE +1</button></div>`, true);
        el('m1point').addEventListener('click', () => awardPoint());
        if (state.foundChores.size === 6) { markMissionDone(1); setTimeout(() => sfx('success'), 350); }
      }
    }}));
    showTray(`<div class="tray-title">MISSION 1 — PROBLEM HUNT</div><div class="tray-sub">Click the 6 chore cards when students find the problem in the house. ${state.foundChores.size}/6 found.</div>`, true);
  }

  function setupMission2() {
    const heroSpots = [
      { hero:'Max', x:2.4,y:23.5,w:18.2,h:49 },
      { hero:'Mia', x:21.4,y:23.5,w:18.2,h:49 },
      { hero:'Leo', x:40.6,y:23.5,w:18.2,h:49 },
      { hero:'Zoe', x:60,y:23.5,w:18.2,h:49 }
    ];
    heroSpots.forEach(s => addHotspot({ ...s, label:`Choose ${s.hero}`, onClick(btn) {
      hotspotLayer.querySelectorAll('.hotspot').forEach(h => h.classList.remove('hero-picked'));
      btn.classList.add('hero-picked');
      const chore = chores[Math.floor(Math.random()*chores.length)];
      const freq = ['always','sometimes','never'][Math.floor(Math.random()*3)];
      showTray(`<div class="tray-title">${s.hero.toUpperCase()} IS YOUR HERO</div>
        <div class="big-prompt">Make a sentence: <strong>${s.hero} / ${chore} / ${freq}</strong></div>
        <div class="tray-sub">Then ask another student a Do/Does question.</div>
        <div class="tray-row"><button class="award-btn" id="m2point">SPEAKING DONE +1</button><button class="secondary-btn" id="m2new">NEW PROMPT</button></div>`, true);
      el('m2point').addEventListener('click', () => { awardPoint(); markMissionDone(2); });
      el('m2new').addEventListener('click', () => setupMission2());
    }}));
    showTray(`<div class="tray-title">MISSION 2 — CHOOSE YOUR HERO</div><div class="tray-sub">Each student chooses Max, Mia, Leo or Zoe. Click a hero to get a speaking prompt.</div>`, true);
  }

  function setupMission3() {
    const suspectSpots = [
      { hero:'Max', x:3.2,y:29,w:12.5,h:26 },
      { hero:'Mia', x:16.5,y:29,w:12.5,h:26 },
      { hero:'Leo', x:3.2,y:61,w:12.5,h:25 },
      { hero:'Zoe', x:16.5,y:61,w:12.5,h:25 }
    ];
    suspectSpots.forEach(s => addHotspot({ ...s, label:`Choose ${s.hero}`, onClick(btn) {
      hotspotLayer.querySelectorAll('.hotspot').forEach(h=>h.classList.remove('hero-picked'));
      btn.classList.add('hero-picked');
      showTray(`<div class="tray-title">DETECTIVE ANSWER</div>
        <div class="big-prompt">I think <strong>${s.hero}</strong> is the lazy one because ...</div>
        <div class="tray-sub">There is no single answer here: students must justify their choice using the clues and correct Present Simple.</div>
        <div class="tray-row"><button class="award-btn" id="m3point">GOOD REASON +1</button></div>`, true);
      el('m3point').addEventListener('click', () => { awardPoint(); markMissionDone(3); });
    }}));
    showTray(`<div class="tray-title">MISSION 3 — DETECTIVE MODE</div><div class="tray-sub">Read the clues. Students choose a suspect and explain: “I think ... because ...”</div>`, true);
  }

  const battlePrompts = [
    { text:'She / make the bed', subject:'She', verb:'make the bed' },
    { text:'He / wash the dishes', subject:'He', verb:'wash the dishes' },
    { text:'They / water the plants', subject:'They', verb:'water the plants' },
    { text:'He / feed the dog', subject:'He', verb:'feed the dog' },
    { text:'She / take out the rubbish', subject:'She', verb:'take out the rubbish' },
    { text:'They / vacuum the floor', subject:'They', verb:'vacuum the floor' }
  ];

  function setupMission4() {
    const coords = [
      [8,44,26,18],[36.8,44,26,18],[65.5,44,27,18],
      [8,64,26,18],[36.8,64,26,18],[65.5,64,27,18]
    ];
    coords.forEach((c,i) => addHotspot({x:c[0],y:c[1],w:c[2],h:c[3],label:`Battle task ${i+1}`,onClick(){ openBattle(i); }}));
    showTray(`<div class="tray-title">MISSION 4 — CHORE BATTLE</div><div class="tray-sub">Click any task card. The active player must say: affirmative → negative → question.</div>`, true);
  }

  function openBattle(i) {
    const p = battlePrompts[i];
    state.currentBattle = p;
    const answers = transformForms(p.subject, p.verb);
    showTray(`<div class="tray-title">BATTLE TASK ${i+1}</div><div class="big-prompt">${p.text}</div>
      <div class="tray-row"><button class="secondary-btn" id="revealBattle">REVEAL ANSWERS</button><button class="award-btn" id="battlePoint">ALL 3 CORRECT +1</button></div>
      <div id="battleAnswers"></div>`, false);
    el('revealBattle').addEventListener('click', () => {
      el('battleAnswers').innerHTML = `<div class="answer-box">${answers.affirmative}<br>${answers.negative}<br>${answers.question}</div>`; sfx('click');
    });
    el('battlePoint').addEventListener('click', () => { awardPoint(); markMissionDone(4); });
  }

  function setupMission5() {
    state.spinner = state.spinner || { who:'my mum', chore:'make the bed', when:'every day' };
    renderSpinnerTray();
  }

  function renderSpinnerTray() {
    const r = state.spinner;
    showTray(`<div class="tray-title">MISSION 5 — CRAZY CHORE GENERATOR</div>
      <div class="mini-grid">
        <div class="result-card"><div class="label">WHO</div><div class="value">${escapeHtml(r.who)}</div></div>
        <div class="result-card"><div class="label">CHORE</div><div class="value">${escapeHtml(r.chore)}</div></div>
        <div class="result-card"><div class="label">WHEN</div><div class="value">${escapeHtml(r.when)}</div></div>
      </div>
      <div class="tray-row" style="margin-top:9px"><button class="primary-btn" id="spinBtn">SPIN ALL</button><button class="secondary-btn" id="spinnerReveal">REVEAL 3 FORMS</button><button class="award-btn" id="spinnerPoint">SPEAKING DONE +1</button></div>
      <div id="spinnerAnswer"></div>`, false);
    el('spinBtn').addEventListener('click', spinAll);
    el('spinnerReveal').addEventListener('click', revealSpinner);
    el('spinnerPoint').addEventListener('click', () => { awardPoint(); markMissionDone(5); });
  }

  function spinAll() {
    sfx('spin');
    let count = 0;
    const handle = setInterval(() => {
      state.spinner = {
        who: whoWords[Math.floor(Math.random()*whoWords.length)],
        chore: chores[Math.floor(Math.random()*5)],
        when: whenWords[Math.floor(Math.random()*whenWords.length)]
      };
      renderSpinnerTray();
      count++;
      if (count >= 8) { clearInterval(handle); sfx('success'); }
    }, 90);
  }

  function revealSpinner() {
    const r = state.spinner;
    const third = thirdPersonSubject(r.who);
    const aux = isThirdSubject(r.who) ? 'Does' : 'Do';
    const negAux = isThirdSubject(r.who) ? "doesn't" : "don't";
    el('spinnerAnswer').innerHTML = `<div class="answer-box">
      <strong>+</strong> ${cap(r.who)} ${thirdPersonIfNeeded(r.chore, r.who)} ${r.when}.<br>
      <strong>−</strong> ${cap(r.who)} ${negAux} ${r.chore} ${r.when}.<br>
      <strong>?</strong> ${aux} ${r.who} ${r.chore} ${r.when}?
      </div>`;
    sfx('click');
  }

  function setupMission6() {
    const examples = [
      ['I make my bed every day.','I never wash the dishes.','I water the plants in summer.'],
      ['I feed my pet every morning.','I sometimes take out the rubbish.','I never vacuum the floor.'],
      ['I wash the dishes after dinner.','I make my bed every morning.','I sometimes water the plants.']
    ];
    const group = examples[Math.floor(Math.random()*examples.length)];
    showTray(`<div class="tray-title">MISSION 6 — TWO TRUE, ONE FALSE</div>
      <div class="tray-sub"><strong>${escapeHtml(state.players[state.activePlayer].name)}</strong>: say 3 sentences about yourself. Use these only as models.</div>
      <div class="answer-box">1. ${group[0]}<br>2. ${group[1]}<br>3. ${group[2]}</div>
      <div class="tray-row" style="margin-top:9px"><button class="choice-btn vote" data-vote="1">VOTE 1</button><button class="choice-btn vote" data-vote="2">VOTE 2</button><button class="choice-btn vote" data-vote="3">VOTE 3</button><button class="award-btn" id="confessionPoint">GOOD SPEAKING +1</button></div>`, false);
    actionTray.querySelectorAll('.vote').forEach(btn => btn.addEventListener('click', () => {
      actionTray.querySelectorAll('.vote').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected'); sfx('click');
    }));
    el('confessionPoint').addEventListener('click', () => { awardPoint(); markMissionDone(6); setupMission6(); });
  }

  function setupFinal() {
    showTray(`<div class="tray-title">FINAL BOSS — 5 LOCKS</div>
      <div class="lock-grid">
        ${[1,2,3,4,5].map(n=>`<button class="lock-card ${state.finalDone.has(n)?'done':''}" data-lock="${n}" type="button"><span class="lock-num">${n}</span>${state.finalDone.has(n)?'UNLOCKED':'LOCKED'}</button>`).join('')}
      </div>
      <div class="tray-sub">Open all 5 locks to unlock the Summer Party.</div>`, false);
    actionTray.querySelectorAll('[data-lock]').forEach(btn=>btn.addEventListener('click',()=>openFinalLock(Number(btn.dataset.lock))));
    if (state.finalDone.size === 5) celebrate();
  }

  function openFinalLock(n) {
    if (state.finalDone.has(n)) return;
    if (n === 5) return openTimerLock();
    const quiz = {
      1: { q:'Fix it: She wash the dishes every day.', options:['She washes the dishes every day.','She washing the dishes every day.','She wash the dishes every day.'], a:0 },
      2: { q:'Make it negative: Tom makes his bed.', options:["Tom doesn't makes his bed.","Tom doesn't make his bed.","Tom not make his bed."], a:1 },
      3: { q:'Make a question: Mia waters the plants.', options:['Does Mia waters the plants?','Do Mia water the plants?','Does Mia water the plants?'], a:2 },
      4: { q:'Choose the correct question about Leo and the dog.', options:['Does Leo feed the dog?','Does Leo feeds the dog?','Do Leo feeds the dog?'], a:0 }
    }[n];
    openModal(`<div class="modal-title">LOCK ${n}</div><div class="modal-text">${quiz.q}</div>
      <div class="quiz-options">${quiz.options.map((o,i)=>`<button class="quiz-btn" data-opt="${i}" type="button">${o}</button>`).join('')}</div>
      <button class="secondary-btn" id="closeQuiz">CLOSE</button>`);
    modal.querySelectorAll('[data-opt]').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.opt);
      if (idx === quiz.a) {
        btn.classList.add('correct'); sfx('success'); state.finalDone.add(n); markMissionDone(7);
        setTimeout(()=>{ closeModal(); setupFinal(); }, 650);
      } else { btn.classList.add('wrong'); sfx('wrong'); }
    }));
    el('closeQuiz').addEventListener('click', closeModal);
  }

  function openTimerLock() {
    let time = 30;
    openModal(`<div class="modal-title">LOCK 5 — 30-SECOND CHALLENGE</div>
      <div class="modal-text">As a team, say 6 correct chore sentences.</div>
      <div class="timer" id="timerValue">30</div>
      <div class="tray-row"><button class="primary-btn" id="timerStart">START TIMER</button><button class="award-btn" id="timerDone">6 SENTENCES DONE</button><button class="secondary-btn" id="timerClose">CLOSE</button></div>`);
    el('timerStart').addEventListener('click', () => {
      if (state.timerHandle) clearInterval(state.timerHandle);
      time = 30; el('timerValue').textContent = time; sfx('click');
      state.timerHandle = setInterval(() => {
        time -= 1; el('timerValue').textContent = time;
        if (time <= 0) { clearInterval(state.timerHandle); state.timerHandle = null; sfx('wrong'); }
      }, 1000);
    });
    el('timerDone').addEventListener('click', () => {
      if (state.timerHandle) clearInterval(state.timerHandle);
      state.timerHandle = null; state.finalDone.add(5); markMissionDone(7); awardPoint(); closeModal(); setupFinal();
    });
    el('timerClose').addEventListener('click', closeModal);
  }

  function openModal(inner) {
    modal.hidden = false;
    modal.innerHTML = `<div class="modal-card glass-panel">${inner}</div>`;
  }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

  function celebrate() {
    sfx('win');
    openModal(`<div class="modal-title">SUMMER PARTY UNLOCKED!</div><div class="modal-text">Pool. Pizza Party. Game Room. Mission complete.</div>
      <div class="modal-text">Final scores:</div>
      <div class="mini-grid">${state.players.map(p=>`<div class="result-card"><div class="label">${escapeHtml(p.name)}</div><div class="value">${p.score}</div></div>`).join('')}</div>
      <div class="tray-row" style="margin-top:14px"><button class="primary-btn" id="playAgain">PLAY AGAIN</button><button class="secondary-btn" id="closeWin">KEEP THIS SCREEN</button></div>`);
    for (let i=0;i<70;i++) {
      const c = document.createElement('div'); c.className='confetti';
      c.style.left = `${Math.random()*100}%`;
      c.style.background = ['#27d6ff','#ffbd1a','#36b94e','#7d43dc','#ff6a45','#ffffff'][i%6];
      c.style.setProperty('--drift', `${(Math.random()-.5)*240}px`);
      c.style.animationDelay = `${Math.random()*.9}s`;
      el('gameStage').appendChild(c);
      setTimeout(()=>c.remove(), 3800);
    }
    el('playAgain').addEventListener('click', resetGame);
    el('closeWin').addEventListener('click', closeModal);
  }

  function resetGame() {
    state.players.forEach(p=>p.score=0);
    state.activePlayer=0; state.missionDone.clear(); state.foundChores.clear(); state.finalDone.clear(); state.spinner=null;
    renderScoreboard(); updateProgress(); updateTurnButton(); closeModal(); gotoScene(1);
  }

  function thirdPerson(verbPhrase) {
    const [verb, ...rest] = verbPhrase.split(' ');
    return `${thirdVerb(verb)} ${rest.join(' ')}`.trim();
  }
  function thirdVerb(v) {
    if (/(s|sh|ch|x|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0,-1) + 'ies';
    return v + 's';
  }
  function transformForms(subject, verbPhrase) {
    const third = subject === 'He' || subject === 'She' || subject === 'It';
    const positive = third ? thirdPerson(verbPhrase) : verbPhrase;
    const aux = third ? 'Does' : 'Do';
    const neg = third ? "doesn't" : "don't";
    return {
      affirmative: `${subject} ${positive}.`,
      negative: `${subject} ${neg} ${verbPhrase}.`,
      question: `${aux} ${subject.toLowerCase()} ${verbPhrase}?`
    };
  }
  function isThirdSubject(subject) {
    return ['my mum','my dad','my brother','my best friend','our teacher'].includes(subject);
  }
  function thirdPersonIfNeeded(chore, subject) { return isThirdSubject(subject) ? thirdPerson(chore) : chore; }
  function thirdPersonSubject(s) { return isThirdSubject(s) ? 'third' : 'base'; }
  function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

  el('startBtn').addEventListener('click', () => {
    [1,2,3,4].forEach((n,i) => {
      const value = el(`p${n}`).value.trim();
      state.players[i].name = value || `Player ${n}`;
    });
    setupPanel.hidden = true; hud.hidden = false; bottomNav.hidden = false; renderScoreboard(); updateProgress(); updateTurnButton(); sfx('success'); gotoScene(1);
  });

  nextBtn.addEventListener('click', () => {
    if (state.scene < scenes.length-1) gotoScene(state.scene+1); else if (state.finalDone.size === 5) celebrate(); else setupFinal();
    sfx('click');
  });
  prevBtn.addEventListener('click', () => { if (state.scene > 1) gotoScene(state.scene-1); sfx('click'); });
  activePlayerBtn.addEventListener('click', () => { advanceTurn(); sfx('click'); });
  soundBtn.addEventListener('click', () => { state.sound = !state.sound; soundBtn.textContent = state.sound ? 'SOUND ON' : 'SOUND OFF'; if (state.sound) sfx('click'); });
  el('fullscreenBtn').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await el('gameStage').requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {}
  });

  // Prevent accidental image dragging while presenting.
  sceneImage.addEventListener('dragstart', e => e.preventDefault());
})();
