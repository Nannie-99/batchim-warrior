var fs = require('fs');
var path = require('path');
var Hangul = require('../js/hangul');
var Engine = require('../js/engine');

var data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'batchim_questions.json'), 'utf8'));
var report = Hangul.validateQuestions(data);
console.log(Hangul.formatReport(report));

var failed = 0;
function assert(name, cond) {
  if (!cond) {
    failed += 1;
    console.log('실패: ' + name);
  } else {
    console.log('통과: ' + name);
  }
}

assert('검사 전체 통과', report.ok === true);

var all = report.passedItems.single.concat(report.passedItems.double, report.passedItems.cluster);
var game = Engine.createEngine(all, { timeLimit: 0, thinkTime: 3, hearts: 5, sound: false, wrongMode: 'show' });
game.start();
var ids = game.state.queue.map(function (q) { return q.id; });
assert('종합 150개가 중복 없이 준비됨', ids.length === 150 && new Set(ids).size === 150);

var sample = all[0];
var locked = Engine.createEngine([sample], { thinkTime: 3, hearts: 5, timeLimit: 0, wrongMode: 'show', sound: false });
locked.start();
var before = locked.state.heartsLeft;
var blocked = locked.press(sample.answer);
assert('생각 시간에는 정답도 막힘', blocked.ok === false && locked.state.phase === 'think' && locked.state.heartsLeft === before);
locked.finishThink();
var first = locked.press(sample.answer);
var second = locked.press(sample.answer);
assert('정답은 한 번만 처리', first.ok === true && first.result === 'correct' && second.ok === false && locked.state.phase === 'celebrate');

var wrongItem = all.find(function (q) { return q.options.filter(function (o) { return o !== q.answer; }).length === 2; });
var showGame = Engine.createEngine([wrongItem], { thinkTime: 0, hearts: 5, timeLimit: 0, wrongMode: 'show', sound: false });
showGame.start();
var wrongPick = wrongItem.options.find(function (o) { return o !== wrongItem.answer; });
showGame.press(wrongPick);
assert('정답 보여주고 넘어가기', showGame.state.phase === 'reveal' && showGame.state.heartsLeft === 4 && showGame.state.wrongLog.length === 1);
showGame.finishResolve();
assert('오답은 잡은 슬라임 수에 넣지 않음', showGame.state.defeated === 0 && showGame.state.solvedInStage === 0);

var retry = Engine.createEngine([wrongItem], { thinkTime: 3, hearts: 5, timeLimit: 10, wrongMode: 'retry', sound: false });
retry.start();
retry.finishThink();
var wrongs = wrongItem.options.filter(function (o) { return o !== wrongItem.answer; });
retry.press(wrongs[0]);
assert('다시 도전에서 하트 1개', retry.state.phase === 'think' && retry.state.heartsLeft === 4 && retry.state.hint.indexOf('다른 친구') !== -1);
retry.finishThink();
retry.press(wrongs[0]);
assert('잠긴 보기는 다시 눌리지 않음', retry.state.heartsLeft === 4);
retry.press(wrongs[1]);
assert('보기가 하나 남으면 정답을 보여 줌', retry.state.phase === 'reveal' && retry.state.heartsLeft === 4);

var tired = Engine.createEngine([wrongItem], { thinkTime: 0, hearts: 3, timeLimit: 0, wrongMode: 'show', sound: false });
tired.start();
tired.state.heartsLeft = 1;
tired.press(wrongPick);
assert('하트 0이면 다시 힘내요', tired.state.phase === 'encourage' && tired.state.heartsLeft === 0);

var timed = Engine.createEngine([sample], { thinkTime: 0, hearts: 5, timeLimit: 0, wrongMode: 'show', sound: false });
timed.start();
var noTimer = timed.timeout();
assert('시간 제한이 꺼지면 시간 초과가 없음', noTimer.ok === false && timed.state.phase === 'open');

var ten = [];
for (var i = 0; i < 80; i++) {
  ten.push(Object.assign({}, sample, { id: 't-' + i }));
}
var stages = Engine.createEngine(ten, { thinkTime: 0, timeLimit: 0, wrongMode: 'show', sound: false });
stages.start();
var sawStage8 = false;
for (var n = 0; n < 35; n++) {
  if (stages.state.phase === 'think') stages.finishThink();
  stages.press(sample.answer);
  if (stages.state.phase === 'celebrate' || stages.state.phase === 'reveal') stages.finishResolve();
  if (stages.state.phase === 'stage') {
    if (stages.state.stage === 8) {
      sawStage8 = true;
      assert('8단계 배경은 다시 마을', Engine.backgroundIndex(stages.state.stage) === 0);
      assert('단계 안내 문구', stages.state.bubble === '다음 단계로');
    }
    stages.finishStage();
  }
}
assert('슬라임 35마리 뒤에 8단계', sawStage8 === true && stages.state.defeated === 35);

var early = Engine.createEngine(ten, { thinkTime: 0, timeLimit: 0, wrongMode: 'show', sound: false });
early.start();
assert('생명은 항상 5개', early.state.heartsLeft === 5);

console.log(failed ? '\n논리 검사 실패 ' + failed + '개' : '\n논리 검사 모두 통과');
process.exit(failed || !report.ok ? 1 : 0);
