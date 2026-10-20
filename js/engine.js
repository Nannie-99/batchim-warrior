(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./hangul'));
  } else {
    root.BatchimEngine = factory(root.BatchimHangul);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (Hangul) {
  var HEARTS = 5;
  var STAGE_SIZE = 5;

  function defaultSettings() {
    return { timeLimit: 0, thinkTime: 3, hearts: 5, sound: true, wrongMode: 'show' };
  }

  function normalizeSettings(raw) {
    var base = defaultSettings();
    var src = raw || {};
    if (src.timeLimit === 0 || src.timeLimit === 10 || src.timeLimit === 20 || src.timeLimit === 30) base.timeLimit = src.timeLimit;
    if (src.thinkTime === 0 || src.thinkTime === 3 || src.thinkTime === 5) base.thinkTime = src.thinkTime;
    if (src.hearts === 3 || src.hearts === 5 || src.hearts === 7) base.hearts = src.hearts;
    if (typeof src.sound === 'boolean') base.sound = src.sound;
    if (src.wrongMode === 'show' || src.wrongMode === 'retry') base.wrongMode = src.wrongMode;
    return base;
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem('batchim-warrior-settings-v2');
      if (!raw) return defaultSettings();
      return normalizeSettings(JSON.parse(raw));
    } catch (err) {
      return defaultSettings();
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('batchim-warrior-settings-v2', JSON.stringify(normalizeSettings(settings)));
    } catch (err) {
      /* 저장이 막혀 있어도 게임은 계속합니다. */
    }
  }

  function backgroundIndex(stage) {
    return (Math.max(stage, 1) - 1) % 7;
  }

  function createEngine(items, settings) {
    var state = {
      settings: normalizeSettings(settings),
      queue: Hangul.fisherYates(items),
      cursor: 0,
      stage: 1,
      solvedInStage: 0,
      defeated: 0,
      maxHearts: 5,
      heartsLeft: 5,
      wrongLog: [],
      phase: 'boot',
      current: null,
      options: [],
      disabled: [],
      heartTaken: false,
      hint: '',
      bubble: ''
    };
    var seenWrong = {};

    function rememberWrong(question) {
      if (!question || seenWrong[question.id]) return;
      seenWrong[question.id] = true;
      state.wrongLog.push(question);
    }

    function loseHeart() {
      if (state.heartTaken) return;
      state.heartTaken = true;
      state.heartsLeft -= 1;
    }

    function openOrThink() {
      state.disabled = state.disabled.slice();
      if (state.settings.thinkTime > 0) {
        state.phase = 'think';
        state.hint = '손가락으로 골라 보세요! 1 · 2 · 3';
      } else {
        state.phase = 'open';
        state.hint = '';
      }
    }

    function nextQuestion() {
      if (state.cursor >= state.queue.length) {
        state.phase = 'clear';
        state.current = null;
        state.hint = '';
        return;
      }
      state.current = state.queue[state.cursor];
      state.options = Hangul.fisherYates(state.current.options);
      state.disabled = [];
      state.heartTaken = false;
      state.bubble = '';
      openOrThink();
    }

    function advance(caught) {
      state.cursor += 1;
      if (caught) {
        state.defeated += 1;
        state.solvedInStage += 1;
      }
      if (state.cursor >= state.queue.length) {
        state.phase = 'clear';
        state.current = null;
        state.hint = '';
        state.bubble = '';
        return;
      }
      if (caught && state.solvedInStage >= STAGE_SIZE) {
        state.stage += 1;
        state.solvedInStage = 0;
        state.bubble = '다음 단계로';
        state.phase = 'stage';
        state.hint = state.bubble;
        return;
      }
      nextQuestion();
    }

    function start() {
      state.maxHearts = state.settings.hearts;
      state.heartsLeft = state.maxHearts;
      state.cursor = 0;
      state.stage = 1;
      state.solvedInStage = 0;
      state.defeated = 0;
      state.wrongLog = [];
      seenWrong = {};
      state.queue = Hangul.fisherYates(state.queue);
      nextQuestion();
    }

    function finishThink() {
      if (state.phase !== 'think') return;
      state.phase = 'open';
      state.hint = '';
    }

    function finishResolve() {
      var caught = state.phase === 'celebrate';
      if (state.phase !== 'celebrate' && state.phase !== 'reveal') return;
      advance(caught);
    }

    function finishStage() {
      if (state.phase !== 'stage') return;
      if (state.cursor >= state.queue.length) {
        state.phase = 'clear';
        state.current = null;
        state.hint = '';
        state.bubble = '';
        return;
      }
      nextQuestion();
    }

    function revealAndHold() {
      state.phase = 'reveal';
      state.hint = '';
    }

    function applyWrong(question) {
      rememberWrong(question);
      loseHeart();
      if (state.heartsLeft <= 0) {
        state.phase = 'encourage';
        state.hint = '다시 힘내요!';
        return;
      }
      if (state.settings.wrongMode === 'show') {
        revealAndHold();
        return;
      }
      var left = state.options.filter(function (opt) { return state.disabled.indexOf(opt) === -1; });
      if (left.length <= 1) {
        revealAndHold();
        return;
      }
      state.hint = '다른 친구가 도와줄까요?';
      state.phase = state.settings.thinkTime === 0 ? 'open' : 'think';
    }

    function press(text) {
      if (state.phase !== 'open') return { ok: false, reason: 'locked' };
      if (state.disabled.indexOf(text) !== -1) return { ok: false, reason: 'locked' };
      if (state.options.indexOf(text) === -1) return { ok: false, reason: 'locked' };
      if (text === state.current.answer) {
        state.phase = 'celebrate';
        state.hint = '';
        return { ok: true, result: 'correct' };
      }
      state.disabled = state.disabled.concat([text]);
      applyWrong(state.current);
      return { ok: true, result: 'wrong' };
    }

    function timeout() {
      if (state.phase !== 'open') return { ok: false, reason: 'locked' };
      if (!state.settings.timeLimit) return { ok: false, reason: 'no-timer' };
      applyWrong(state.current);
      return { ok: true, result: 'timeout' };
    }

    function updateSettings(next) {
      state.settings = normalizeSettings(Object.assign({}, state.settings, next));
    }

    return {
      state: state,
      start: start,
      press: press,
      timeout: timeout,
      finishThink: finishThink,
      finishResolve: finishResolve,
      finishStage: finishStage,
      updateSettings: updateSettings
    };
  }

  return {
    defaultSettings: defaultSettings,
    normalizeSettings: normalizeSettings,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    backgroundIndex: backgroundIndex,
    HEARTS: HEARTS,
    STAGE_SIZE: STAGE_SIZE,
    createEngine: createEngine
  };
});
