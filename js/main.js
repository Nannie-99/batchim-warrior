(function () {
  var NUM = ['①', '②', '③'];
  var CARDS = [
    { id: 'single', label: '홑받침' },
    { id: 'double', label: '쌍받침' },
    { id: 'cluster', label: '겹받침' }
  ];
  var SLIMES = [
    '파랑 슬라임', '분홍 슬라임', '보라 슬라임', '리본 슬라임',
    '반짝이 슬라임', '불꽃 슬라임', '얼음 슬라임', '찌릿 슬라임',
    '독성 슬라임', '진흙 슬라임', '바다 슬라임', '꿀꿀 슬라임',
    '유령 슬라임', '악마 슬라임', '기사 슬라임', '우주 슬라임'
  ];
  var DEX_KEY = 'batchim-warrior-slime-dex-v1';
  var HEROES = ['남1', '남2', '여1', '여2'];
  var CHEERS = [
    '우리 반 정말 대단해요!',
    '함께해서 멋졌어요!',
    '슬라임이 깜짝 놀랐어요!',
    '다음엔 더 많이 물리칠 수 있어요!',
    '포기하지 않은 우리 반이 최고예요!',
    '한 마리씩 차근차근, 잘하고 있어요!',
    '오늘도 수고했어요!',
    '함께해 줘서 고마워요!',
    '받침 용사의 활약이 빛났어요!',
    '열심히 도전한 여러분이 최고예요!'
  ];

  var report = null;
  var pools = null;
  var settings = BatchimEngine.loadSettings();
  var engine = null;
  var modeItems = [];
  var heroName = '남1';
  var pendingMode = 'single';
  var slimeStage = 0;
  var currentSlime = '';
  var runCatches = [];
  var attacking = false;
  var attackTimer = 0;
  var gameStartedAt = 0;
  var attackCount = 0;
  var audioCtx = null;
  var thinkTimer = 0;
  var limitTimer = 0;
  var resolveTimer = 0;
  var stageTimer = 0;
  var fx = { mode: 'idle', started: 0 };
  var bgmReady = false;
  var volume = 0.5;
  var volumeBeforeMute = 0.5;
  var quitOpen = false;
  var resumeLimit = null;
  var resumeStage = null;

  var titleScreen = document.getElementById('screen-title');
  var gameScreen = document.getElementById('screen-game');
  var endScreen = document.getElementById('screen-end');
  var setupScreen = document.getElementById('screen-setup');
  var modeRow = document.getElementById('mode-row');
  var modeAll = document.getElementById('mode-all');
  var heroCards = document.getElementById('hero-cards');
  var levelEl = document.getElementById('level');
  var countEl = document.getElementById('count');
  var progressEl = document.getElementById('progress');
  var timerWrap = document.getElementById('timer-wrap');
  var timerCount = document.getElementById('timer-count');
  var heartsEl = document.getElementById('hearts');
  var questionEl = document.getElementById('question');
  var hintEl = document.getElementById('hint');
  var optionsEl = document.getElementById('options');
  var stageScroll = document.getElementById('stage-scroll');
  var stageTitle = document.getElementById('stage-title');
  var stageSub = document.getElementById('stage-sub');
  var stageCountdown = document.getElementById('stage-countdown');
  var canvas = document.getElementById('stage');
  var stageWrap = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  var heroEl = document.getElementById('hero-sprite');
  var slimeEl = document.getElementById('slime-sprite');
  var shotEl = document.getElementById('shot');
  var endTime = document.getElementById('end-time');
  var endAttacks = document.getElementById('end-attacks');
  var endCaught = document.getElementById('end-caught');
  var dexBtn = document.getElementById('dex-btn');
  var dexModal = document.getElementById('modal-dex');
  var dexGrid = document.getElementById('dex-grid');
  var dexSummary = document.getElementById('dex-summary');
  var dexReset = document.getElementById('dex-reset');
  var dexResetArmed = false;
  var endCopy = document.getElementById('end-copy');
  var againBtn = document.getElementById('again-btn');
  var homeBtn = document.getElementById('home-btn');
  var loadError = document.getElementById('load-error');
  var bgmEl = document.getElementById('bgm');
  var soundBtn = document.getElementById('sound-btn');
  var volumePanel = document.getElementById('volume-panel');
  var volumeSlider = document.getElementById('volume-slider');
  var muteBtn = document.getElementById('mute-btn');
  var quitBtn = document.getElementById('quit-btn');
  var quitModal = document.getElementById('modal-quit');
  var setupBack = document.getElementById('setup-back');
  var howtoModal = document.getElementById('modal-howto');
  var creatorModal = document.getElementById('modal-creator');
  var openHowto = document.getElementById('open-howto');
  var openCreator = document.getElementById('open-creator');

  function clearTimers() {
    clearTimeout(thinkTimer);
    clearInterval(limitTimer);
    clearTimeout(resolveTimer);
    clearInterval(stageTimer);
  }

  function fillStageScroll() {
    if (!engine) return;
    var cleared = Math.max(1, engine.state.stage - 1);
    stageTitle.textContent = cleared + '단계 성공!';
    stageSub.textContent = '다음단계로 넘어가 볼까요?';
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
  }

  function closeAllModals() {
    closeModal(howtoModal);
    closeModal(creatorModal);
    closeModal(dexModal);
    dexResetArmed = false;
    if (dexReset) dexReset.textContent = '기록 초기화';
  }

  function slimePath(name) {
    return picture('asset/pic/슬라임/' + name + '.png');
  }

  function loadDex() {
    try {
      var raw = localStorage.getItem(DEX_KEY);
      var data = raw ? JSON.parse(raw) : {};
      var dex = {};
      SLIMES.forEach(function (name) {
        var count = Number(data[name]);
        dex[name] = isFinite(count) && count > 0 ? Math.floor(count) : 0;
      });
      return dex;
    } catch (err) {
      var empty = {};
      SLIMES.forEach(function (name) { empty[name] = 0; });
      return empty;
    }
  }

  function saveDex(dex) {
    try {
      localStorage.setItem(DEX_KEY, JSON.stringify(dex));
    } catch (err) {}
  }

  function noteDefeat(name) {
    if (!name || SLIMES.indexOf(name) === -1) return;
    runCatches.push(name);
    var dex = loadDex();
    dex[name] = (dex[name] || 0) + 1;
    saveDex(dex);
  }

  function pickSlimeName(except) {
    var pool = SLIMES.filter(function (name) { return name !== except; });
    if (!pool.length) pool = SLIMES.slice();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function picture(path) {
    return encodeURI(path);
  }

  function heroPath(pose) {
    var suffix = pose === true || pose === 'attack' ? '(공격)' : pose === 'hurt' ? '(피해)' : '';
    return picture('asset/pic/캐릭터/' + heroName + suffix + '.png');
  }

  var sfx = {
    correct: new Audio('asset/sfx/correct.wav'),
    wrong: new Audio('asset/sfx/wrong.wav')
  };
  Object.keys(sfx).forEach(function (key) {
    sfx[key].preload = 'auto';
  });

  function applyVolume() {
    var muted = volume <= 0.001;
    if (bgmEl) bgmEl.volume = volume;
    Object.keys(sfx).forEach(function (key) {
      sfx[key].volume = Math.min(1, volume);
    });
    if (soundBtn) {
      soundBtn.classList.toggle('is-muted', muted);
      soundBtn.setAttribute('aria-label', muted ? '음소거됨, 소리 조절' : '소리 조절');
      soundBtn.title = muted ? '음소거 중 · 두 번 누르면 소리 켜기' : '소리 조절 · 두 번 누르면 음소거';
    }
    if (muteBtn) {
      muteBtn.textContent = muted ? '소리 켜기' : '음소거';
      muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    }
  }

  function toggleMute() {
    if (volume <= 0.001) {
      volume = volumeBeforeMute > 0.001 ? volumeBeforeMute : 0.5;
    } else {
      volumeBeforeMute = volume;
      volume = 0;
    }
    if (volumeSlider) volumeSlider.value = String(Math.round(volume * 100));
    applyVolume();
    if (volume > 0.001) startBgm();
  }

  function closeVolumePanel() {
    if (!volumePanel) return;
    volumePanel.classList.remove('is-open');
    volumePanel.setAttribute('aria-hidden', 'true');
    if (soundBtn) soundBtn.setAttribute('aria-expanded', 'false');
  }

  function setQuitVisible(show) {
    if (!quitBtn) return;
    quitBtn.hidden = !show;
  }

  function rememberTimers() {
    resumeLimit = null;
    resumeStage = null;
    if (!engine) return;
    if (engine.state.phase === 'open' && engine.state.settings.timeLimit > 0) {
      var left = Number(timerCount.textContent);
      resumeLimit = isFinite(left) ? left : engine.state.settings.timeLimit;
    }
    if (engine.state.phase === 'stage') {
      var stageLeft = Number(stageCountdown.textContent);
      resumeStage = isFinite(stageLeft) && stageLeft > 0 ? stageLeft : 3;
    }
  }

  function openQuit() {
    if (!quitModal || gameScreen.hidden || quitOpen) return;
    quitOpen = true;
    rememberTimers();
    clearTimers();
    closeVolumePanel();
    quitModal.hidden = false;
  }

  function resumeGame() {
    if (!quitOpen) return;
    quitOpen = false;
    if (quitModal) quitModal.hidden = true;
    armPhase();
  }

  function leaveToTitle() {
    quitOpen = false;
    resumeLimit = null;
    resumeStage = null;
    if (quitModal) quitModal.hidden = true;
    clearTimers();
    clearTimeout(attackTimer);
    attacking = false;
    if (shotEl) shotEl.hidden = true;
    if (heroEl) heroEl.classList.remove('hurt');
    gameScreen.hidden = true;
    endScreen.hidden = true;
    setupScreen.hidden = true;
    titleScreen.hidden = false;
    setQuitVisible(false);
  }

  function startBgm() {
    if (!bgmEl) return;
    applyVolume();
    var play = bgmEl.play();
    if (play && typeof play.then === 'function') {
      play.then(function () {
        bgmReady = true;
      }).catch(function () {});
    } else {
      bgmReady = true;
    }
  }

  function armAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }
    startBgm();
  }

  function playSound(kind) {
    if (!settings.sound || volume <= 0.001) return;
    var clip = sfx[kind];
    if (clip) {
      try {
        clip.pause();
        clip.currentTime = 0;
        clip.volume = Math.min(1, volume);
        var play = clip.play();
        if (play && typeof play.catch === 'function') play.catch(function () {});
        return;
      } catch (err) {}
    }
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var now = audioCtx.currentTime;
    var level = 0.12 * volume;
    if (kind === 'correct') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.08);
      osc.frequency.setValueAtTime(784, now + 0.16);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.22);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  function renderHearts() {
    heartsEl.textContent = '';
    var row = document.createElement('span');
    row.className = 'heart-row';
    var max = engine ? engine.state.maxHearts : 5;
    var left = engine ? engine.state.heartsLeft : max;
    for (var i = 0; i < max; i++) {
      var img = document.createElement('img');
      img.className = 'heart';
      img.alt = '';
      img.src = picture(i < left ? 'asset/pic/아이템/하트.png' : 'asset/pic/아이템/빈하트.png');
      row.appendChild(img);
    }
    heartsEl.appendChild(row);
  }

  function renderQuestion() {
    questionEl.textContent = '';
    var current = engine.state.current;
    if (!current) return;
    if (engine.state.phase === 'celebrate') {
      var done = document.createElement('p');
      done.className = 'done-line';
      var filledParts = current.sentence.split('{value}');
      done.appendChild(document.createTextNode(filledParts[0] || ''));
      var filled = document.createElement('span');
      filled.className = 'filled';
      filled.textContent = current.answer;
      done.appendChild(filled);
      done.appendChild(document.createTextNode(filledParts[1] || ''));
      questionEl.appendChild(done);
      return;
    }
    var parts = current.sentence.split('{value}');
    var line = document.createElement('p');
    line.className = 'ask-line';
    line.appendChild(document.createTextNode(parts[0] || ''));
    var blank = document.createElement('span');
    blank.className = 'blank';
    line.appendChild(blank);
    line.appendChild(document.createTextNode(parts[1] || ''));
    questionEl.appendChild(line);
  }

  function renderOptions() {
    optionsEl.textContent = '';
    var state = engine.state;
    state.options.forEach(function (opt, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer';
      button.dataset.value = opt;
      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = NUM[index] || '';
      var word = document.createElement('span');
      word.className = 'word';
      word.textContent = opt;
      var body = document.createElement('span');
      body.className = 'answer-body';
      body.appendChild(num);
      body.appendChild(word);
      button.appendChild(body);
      var used = state.disabled.indexOf(opt) !== -1;
      var showO = state.phase === 'celebrate' && opt === state.current.answer;
      var showX = used;
      if (showO || showX) {
        var mark = document.createElement('span');
        mark.className = 'answer-mark ' + (showO ? 'is-o' : 'is-x');
        mark.textContent = showO ? 'O' : 'X';
        mark.setAttribute('aria-hidden', 'true');
        button.appendChild(mark);
      }
      if (used) button.classList.add('is-locked');
      if (state.phase === 'reveal' && opt === state.current.answer) button.classList.add('is-correct');
      button.disabled = state.phase !== 'open' || used;
      button.addEventListener('click', function () {
        choose(opt, button);
      });
      optionsEl.appendChild(button);
    });
  }

  function renderHud() {
    var state = engine.state;
    levelEl.textContent = state.stage + '단계';
    countEl.textContent = state.solvedInStage + ' / ' + BatchimEngine.STAGE_SIZE;
    progressEl.style.width = (state.solvedInStage / BatchimEngine.STAGE_SIZE) * 100 + '%';
    // 제한 시간이 켜져 있으면 자리를 항상 유지해 프로그레스바가 늘어나지 않게 합니다.
    timerWrap.hidden = !(state.settings.timeLimit > 0);
    if (state.settings.timeLimit > 0 && state.phase === 'think') {
      timerCount.textContent = String(state.settings.timeLimit);
    }
    renderHearts();
    stageScroll.hidden = state.phase !== 'stage';
    if (state.phase === 'stage') fillStageScroll();
    hintEl.textContent = state.phase === 'stage' ? '' : (state.hint || '');
    syncActors();
    renderQuestion();
    renderOptions();
  }

  function render() {
    if (!engine || gameScreen.hidden) return;
    renderHud();
  }

  function formatPlayTime(ms) {
    var totalSec = Math.max(0, Math.floor(ms / 1000));
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    return min + '분 ' + sec + '초';
  }

  function renderEndCaught() {
    if (!endCaught) return;
    endCaught.textContent = '';
    var title = document.createElement('p');
    title.className = 'end-caught-title';
    title.textContent = '이번엔 잡은 슬라임';
    endCaught.appendChild(title);
    if (!runCatches.length) {
      var empty = document.createElement('p');
      empty.className = 'end-caught-empty';
      empty.textContent = '아직 없어요.';
      endCaught.appendChild(empty);
      return;
    }
    var order = [];
    var counts = {};
    runCatches.forEach(function (name) {
      if (!counts[name]) order.push(name);
      counts[name] = (counts[name] || 0) + 1;
    });
    var row = document.createElement('div');
    row.className = 'end-caught-row';
    order.forEach(function (name) {
      var card = document.createElement('div');
      card.className = 'caught-card';
      var img = document.createElement('img');
      img.src = slimePath(name);
      img.alt = name;
      var label = document.createElement('span');
      label.textContent = name;
      var count = document.createElement('b');
      count.textContent = counts[name] + '번';
      card.appendChild(img);
      card.appendChild(label);
      card.appendChild(count);
      row.appendChild(card);
    });
    endCaught.appendChild(row);
  }

  function showEnd() {
    if (quitOpen) return;
    if (engine && engine.state.phase === 'clear' && engine.state.solvedInStage >= BatchimEngine.STAGE_SIZE && currentSlime) {
      noteDefeat(currentSlime);
      currentSlime = '';
    }
    setQuitVisible(false);
    clearTimers();
    clearTimeout(attackTimer);
    attacking = false;
    heroEl.classList.remove('hurt');
    shotEl.hidden = true;
    gameScreen.hidden = true;
    endScreen.hidden = false;
    var elapsed = gameStartedAt ? Date.now() - gameStartedAt : 0;
    endTime.textContent = '걸린 시간: ' + formatPlayTime(elapsed);
    endAttacks.textContent = '공격 횟수: ' + attackCount + '회';
    endCopy.textContent = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    renderEndCaught();
  }

  function renderDex() {
    if (!dexGrid) return;
    var dex = loadDex();
    var known = 0;
    dexGrid.textContent = '';
    SLIMES.forEach(function (name) {
      var count = dex[name] || 0;
      if (count > 0) known += 1;
      var item = document.createElement('div');
      item.className = 'dex-item' + (count > 0 ? ' is-known' : ' is-unknown');
      var img = document.createElement('img');
      img.src = slimePath(name);
      img.alt = count > 0 ? name : name + ', 아직 못 잡음';
      var label = document.createElement('span');
      label.className = 'dex-name';
      label.textContent = name;
      var times = document.createElement('span');
      times.className = 'dex-count';
      times.textContent = count + '번';
      item.appendChild(img);
      item.appendChild(label);
      item.appendChild(times);
      dexGrid.appendChild(item);
    });
    if (dexSummary) dexSummary.textContent = '잡은 종류 ' + known + ' / ' + SLIMES.length;
  }

  function armPhase() {
    clearTimers();
    if (!engine || gameScreen.hidden || !setupScreen.hidden) {
      resumeLimit = null;
      resumeStage = null;
      return;
    }
    var state = engine.state;
    if (state.phase !== 'open') resumeLimit = null;
    if (state.phase !== 'stage') resumeStage = null;
    if (state.phase === 'think') {
      thinkTimer = setTimeout(function () {
        engine.finishThink();
        render();
        armPhase();
      }, state.settings.thinkTime * 1000);
    } else if (state.phase === 'open' && state.settings.timeLimit > 0) {
      var leftSec = state.settings.timeLimit;
      if (resumeLimit != null) {
        leftSec = resumeLimit;
        resumeLimit = null;
      }
      timerCount.textContent = String(leftSec);
      limitTimer = setInterval(function () {
        if (engine.state.phase !== 'open') {
          clearInterval(limitTimer);
          return;
        }
        leftSec -= 1;
        timerCount.textContent = String(Math.max(0, leftSec));
        if (leftSec <= 0) {
          clearInterval(limitTimer);
          var result = engine.timeout();
          if (result.ok) playSound('wrong');
          if (engine.state.phase === 'encourage') showEnd();
          else {
            render();
            armPhase();
          }
        }
      }, 1000);
    } else if (state.phase === 'celebrate') {
      resolveTimer = setTimeout(function () {
        engine.finishResolve();
        fx.mode = 'idle';
        if (engine.state.phase === 'clear') showEnd();
        else {
          render();
          armPhase();
        }
      }, 2500);
    } else if (state.phase === 'reveal') {
      resolveTimer = setTimeout(function () {
        engine.finishResolve();
        fx.mode = 'idle';
        if (engine.state.phase === 'clear') showEnd();
        else {
          render();
          armPhase();
        }
      }, 1500);
    } else if (state.phase === 'stage') {
      if (!state.bubble) {
        engine.finishStage();
        if (engine.state.phase === 'clear') showEnd();
        else {
          render();
          armPhase();
        }
      } else {
        fillStageScroll();
        var left = 3;
        if (resumeStage != null) {
          left = resumeStage;
          resumeStage = null;
        }
        stageCountdown.textContent = String(left);
        stageTimer = setInterval(function () {
          left -= 1;
          if (left > 0) {
            stageCountdown.textContent = String(left);
            return;
          }
          clearInterval(stageTimer);
          engine.finishStage();
          if (engine.state.phase === 'clear') showEnd();
          else {
            render();
            armPhase();
          }
        }, 1000);
      }
    } else if (state.phase === 'encourage' || state.phase === 'clear') {
      showEnd();
    }
  }

  function choose(text) {
    if (quitOpen) return;
    if (!engine || engine.state.phase !== 'open') return;
    var result = engine.press(text);
    if (!result.ok) return;
    if (result.result === 'correct') {
      playAttack();
      playSound('correct');
    } else {
      playHurt();
      playSound('wrong');
    }
    if (engine.state.phase === 'encourage') {
      render();
      setTimeout(showEnd, 1200);
      return;
    }
    render();
    if (result.result === 'wrong' && window.CSS && CSS.escape) {
      var picked = optionsEl.querySelector('[data-value="' + CSS.escape(text) + '"]');
      if (picked) picked.classList.add('shake');
    }
    armPhase();
  }

  var SLIME_IDLES = ['idle-sway', 'idle-hop', 'idle-float', 'idle-wobble'];

  function clearSlimeIdle() {
    SLIME_IDLES.forEach(function (name) {
      slimeEl.classList.remove(name);
    });
  }

  function pickSlimeIdle() {
    clearSlimeIdle();
    var pick = SLIME_IDLES[Math.floor(Math.random() * SLIME_IDLES.length)];
    slimeEl.classList.add(pick);
  }

  function syncActors() {
    if (!engine) return;
    if (slimeStage !== engine.state.stage) {
      if (slimeStage > 0 && currentSlime) noteDefeat(currentSlime);
      slimeStage = engine.state.stage;
      currentSlime = pickSlimeName(currentSlime);
      slimeEl.src = slimePath(currentSlime);
      slimeEl.alt = currentSlime;
      slimeEl.classList.remove('hit');
      pickSlimeIdle();
    }
    var isBoss = slimeStage > 0 && slimeStage % 5 === 0;
    slimeEl.classList.toggle('is-boss', isBoss);
    if (!attacking) heroEl.src = heroPath(false);
  }

  function playAttack() {
    attacking = true;
    attackCount += 1;
    clearTimeout(attackTimer);
    heroEl.src = heroPath(true);
    var fxNum = 30 + Math.floor(Math.random() * 6);
    var stageRect = stageWrap.getBoundingClientRect();
    var heroRect = heroEl.getBoundingClientRect();
    var slimeRect = slimeEl.getBoundingClientRect();
    var startX = heroRect.left - stageRect.left + heroRect.width * 0.72;
    var startY = heroRect.top - stageRect.top + heroRect.height * 0.28;
    var endX = slimeRect.left - stageRect.left + slimeRect.width * 0.35;
    var endY = slimeRect.top - stageRect.top + slimeRect.height * 0.4;
    shotEl.src = picture('asset/pic/이펙터/' + fxNum + '.png');
    shotEl.hidden = false;
    shotEl.style.transition = 'none';
    shotEl.style.left = startX + 'px';
    shotEl.style.top = startY + 'px';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        shotEl.style.transition = 'left 0.28s linear, top 0.28s linear';
        shotEl.style.left = endX + 'px';
        shotEl.style.top = endY + 'px';
      });
    });
    attackTimer = setTimeout(function () {
      shotEl.hidden = true;
      attacking = false;
      heroEl.src = heroPath(false);
      slimeEl.classList.remove('hit');
      void slimeEl.offsetWidth;
      slimeEl.classList.add('hit');
      setTimeout(function () {
        slimeEl.classList.remove('hit');
      }, 450);
    }, 300);
  }

  function playHurt() {
    attacking = true;
    clearTimeout(attackTimer);
    heroEl.classList.remove('hurt');
    heroEl.src = heroPath('hurt');
    void heroEl.offsetWidth;
    heroEl.classList.add('hurt');
    attackTimer = setTimeout(function () {
      attacking = false;
      heroEl.classList.remove('hurt');
      heroEl.src = heroPath(false);
    }, 700);
  }

  function showHero() {
    attacking = false;
    heroEl.classList.remove('hurt');
    heroEl.src = heroPath(false);
  }

  function begin(items) {
    showHero();
    slimeStage = 0;
    currentSlime = '';
    runCatches = [];
    attackCount = 0;
    gameStartedAt = Date.now();
    slimeEl.classList.remove('is-boss', 'hit');
    clearSlimeIdle();
    var shuffled = BatchimHangul.fisherYates(items.slice());
    engine = BatchimEngine.createEngine(shuffled, settings);
    engine.start();
    fx.mode = 'idle';
    quitOpen = false;
    if (quitModal) quitModal.hidden = true;
    setQuitVisible(true);
    titleScreen.hidden = true;
    setupScreen.hidden = true;
    endScreen.hidden = true;
    gameScreen.hidden = false;
    render();
    armPhase();
  }

  function openSetup(id) {
    if (!pools) return;
    pendingMode = id;
    titleScreen.hidden = true;
    setupScreen.hidden = false;
    renderSettings();
    renderHeroCards();
  }

  function makeModeCard(card) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode-card';
    var img = document.createElement('img');
    img.src = picture('asset/pic/아이템/' + card.label + '.png');
    img.alt = card.label;
    button.appendChild(img);
    button.disabled = true;
    button.addEventListener('click', function () {
      openSetup(card.id);
    });
    return button;
  }

  function buildCards() {
    modeRow.textContent = '';
    modeAll.textContent = '';
    CARDS.forEach(function (card) {
      modeRow.appendChild(makeModeCard(card));
    });
    modeAll.appendChild(makeModeCard({ id: 'all', label: '종합' }));
  }

  function renderHeroCards() {
    heroCards.textContent = '';
    HEROES.forEach(function (name) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'hero-card' + (name === heroName ? ' is-on' : '');
      var img = document.createElement('img');
      img.src = picture('asset/pic/캐릭터/' + name + '.png');
      img.alt = name;
      button.appendChild(img);
      button.addEventListener('click', function () {
        heroName = name;
        renderHeroCards();
      });
      heroCards.appendChild(button);
    });
  }

  function renderSettings() {
    document.querySelectorAll('[data-set]').forEach(function (button) {
      var key = button.getAttribute('data-set');
      var value = button.getAttribute('data-value');
      var current = settings[key];
      var on = String(current) === value;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function loop(time) {
    if (engine && !gameScreen.hidden) {
      var state = engine.state;
      BatchimDraw.draw(ctx, {
        time: time,
        bg: BatchimEngine.backgroundIndex(state.stage)
      });
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('pointerdown', armAudio, { once: false });

  applyVolume();
  if (volumeSlider) {
    volumeSlider.value = String(Math.round(volume * 100));
    volumeSlider.addEventListener('input', function () {
      volume = Number(volumeSlider.value) / 100;
      if (volume > 0.001) volumeBeforeMute = volume;
      applyVolume();
      startBgm();
    });
  }
  if (muteBtn) {
    muteBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      armAudio();
      toggleMute();
    });
  }
  if (soundBtn && volumePanel) {
    var soundClickTimer = 0;
    soundBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      clearTimeout(soundClickTimer);
      soundClickTimer = setTimeout(function () {
        armAudio();
        var open = !volumePanel.classList.contains('is-open');
        volumePanel.classList.toggle('is-open', open);
        volumePanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        soundBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }, 250);
    });
    soundBtn.addEventListener('dblclick', function (event) {
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(soundClickTimer);
      armAudio();
      toggleMute();
      closeVolumePanel();
    });
    document.addEventListener('pointerdown', function (event) {
      if (!volumePanel.classList.contains('is-open')) return;
      var dock = document.getElementById('sound-dock');
      if (dock && !dock.contains(event.target)) closeVolumePanel();
    });
  }
  if (quitBtn) {
    quitBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      openQuit();
    });
  }
  var quitStay = document.getElementById('quit-stay');
  var quitHome = document.getElementById('quit-home');
  if (quitStay) quitStay.addEventListener('click', resumeGame);
  if (quitHome) quitHome.addEventListener('click', leaveToTitle);
  if (quitModal) {
    quitModal.addEventListener('click', function (event) {
      if (event.target === quitModal) resumeGame();
    });
  }
  if (setupBack) {
    setupBack.addEventListener('click', function () {
      setupScreen.hidden = true;
      titleScreen.hidden = false;
    });
  }

  if (openHowto) {
    openHowto.addEventListener('click', function () {
      closeModal(creatorModal);
      closeModal(dexModal);
      openModal(howtoModal);
    });
  }
  if (openCreator) {
    openCreator.addEventListener('click', function () {
      closeModal(howtoModal);
      closeModal(dexModal);
      openModal(creatorModal);
    });
  }
  document.querySelectorAll('[data-close-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      closeAllModals();
    });
  });
  if (dexBtn) {
    dexBtn.addEventListener('click', function () {
      closeModal(howtoModal);
      closeModal(creatorModal);
      dexResetArmed = false;
      if (dexReset) dexReset.textContent = '기록 초기화';
      renderDex();
      openModal(dexModal);
    });
  }
  if (dexReset) {
    dexReset.addEventListener('click', function () {
      if (!dexResetArmed) {
        dexResetArmed = true;
        dexReset.textContent = '정말 지울까요?';
        return;
      }
      try { localStorage.removeItem(DEX_KEY); } catch (err) {}
      dexResetArmed = false;
      dexReset.textContent = '기록 초기화';
      renderDex();
    });
  }
  [howtoModal, creatorModal, dexModal].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (quitOpen) {
      resumeGame();
      return;
    }
    closeAllModals();
  });

  document.addEventListener('keydown', function (event) {
    if (event.repeat) return;
    if (quitOpen) return;
    if (!engine || gameScreen.hidden || !setupScreen.hidden) return;
    var index = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[event.code];
    if (index == null) return;
    var text = engine.state.options[index];
    if (!text) return;
    event.preventDefault();
    choose(text);
  });

  document.getElementById('start-ready').addEventListener('click', function () {
    if (!pools || !pendingMode) return;
    modeItems = pendingMode === 'all'
      ? BatchimHangul.fisherYates(pools.single.concat(pools.double, pools.cluster))
      : BatchimHangul.fisherYates(pools[pendingMode].slice());
    begin(modeItems);
  });
  document.querySelectorAll('[data-set]').forEach(function (button) {
    button.addEventListener('click', function () {
      var key = button.getAttribute('data-set');
      var raw = button.getAttribute('data-value');
      var value = raw === 'true' ? true : raw === 'false' ? false : raw === 'show' || raw === 'retry' ? raw : Number(raw);
      settings[key] = value;
      settings = BatchimEngine.normalizeSettings(settings);
      BatchimEngine.saveSettings(settings);
      if (engine) engine.updateSettings(settings);
      renderSettings();
      if (engine && !gameScreen.hidden) render();
    });
  });

  againBtn.addEventListener('click', function () {
    begin(BatchimHangul.fisherYates(modeItems.slice()));
  });
  homeBtn.addEventListener('click', leaveToTitle);

  buildCards();
  renderSettings();
  requestAnimationFrame(loop);

  fetch('batchim_questions.json')
    .then(function (res) {
      if (!res.ok) throw new Error('load failed');
      return res.json();
    })
    .then(function (data) {
      report = BatchimHangul.validateQuestions(data);
      console.log(BatchimHangul.formatReport(report));
      report.skipped.forEach(function (item) {
        console.warn('문항을 건너뜁니다', item.id, item.reasons.join(', '));
      });
      pools = report.passedItems;
      loadError.hidden = true;
      modeRow.querySelectorAll('button').forEach(function (button) { button.disabled = false; });
      modeAll.querySelectorAll('button').forEach(function (button) { button.disabled = false; });
    })
    .catch(function () {
      loadError.hidden = false;
      console.warn('batchim_questions.json을 불러오지 못했습니다.');
    });
})();
