(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.BatchimHangul = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var SINGLE = { 'ㄱ': 1, 'ㄴ': 1, 'ㄷ': 1, 'ㄹ': 1, 'ㅁ': 1, 'ㅂ': 1, 'ㅅ': 1, 'ㅇ': 1, 'ㅈ': 1, 'ㅊ': 1, 'ㅋ': 1, 'ㅌ': 1, 'ㅍ': 1, 'ㅎ': 1 };
  var DOUBLE = { 'ㄲ': 1, 'ㅆ': 1 };
  var CLUSTER = { 'ㄳ': 1, 'ㄵ': 1, 'ㄶ': 1, 'ㄺ': 1, 'ㄻ': 1, 'ㄼ': 1, 'ㄽ': 1, 'ㄾ': 1, 'ㄿ': 1, 'ㅀ': 1, 'ㅄ': 1 };

  function lastHangul(word) {
    if (!word) return null;
    for (var i = word.length - 1; i >= 0; i--) {
      var code = word.charCodeAt(i);
      if (code >= 0xAC00 && code <= 0xD7A3) return code;
    }
    return null;
  }

  function jongOf(word) {
    var code = lastHangul(word);
    if (code === null) return '';
    return JONG[(code - 0xAC00) % 28];
  }

  function jongKind(jong) {
    if (SINGLE[jong]) return 'single';
    if (DOUBLE[jong]) return 'double';
    if (CLUSTER[jong]) return 'cluster';
    return 'none';
  }

  function fisherYates(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function validateItem(item, expectedType) {
    var reasons = [];
    if (!item || typeof item.sentence !== 'string') {
      reasons.push('{value}가 없습니다');
      return reasons;
    }
    var marks = item.sentence.match(/\{value\}/g);
    var markCount = marks ? marks.length : 0;
    if (markCount !== 1) reasons.push('{value}가 ' + markCount + '개입니다');

    var options = item.options;
    if (!Array.isArray(options) || options.length !== 3) {
      reasons.push('보기가 3개가 아닙니다');
    } else {
      var seen = {};
      for (var i = 0; i < options.length; i++) {
        if (seen[options[i]]) reasons.push('보기가 중복됩니다');
        seen[options[i]] = true;
      }
      if (options.indexOf(item.answer) === -1) reasons.push('보기에 정답이 없습니다');
    }

    if (item.type !== 'single' && item.type !== 'double' && item.type !== 'cluster') {
      reasons.push('타입을 알 수 없습니다');
    } else if (expectedType && item.type !== expectedType) {
      reasons.push('모드와 타입이 다릅니다');
    }

    var jong = jongOf(item.answer);
    var kind = jongKind(jong);
    if (item.final && jong !== item.final) reasons.push('정답 받침이 final과 다릅니다');
    if (item.type && kind !== item.type) reasons.push('정답 받침이 모드와 다릅니다');

    if (Array.isArray(options)) {
      for (var n = 0; n < options.length; n++) {
        if (options[n] === item.answer) continue;
        var wrongKind = jongKind(jongOf(options[n]));
        if (item.type === 'double') {
          if (wrongKind !== 'single') reasons.push('쌍받침 오답이 홑받침이 아닙니다');
        } else if (item.type === 'single' || item.type === 'cluster') {
          if (wrongKind !== item.type) reasons.push('오답 받침 종류가 모드와 다릅니다');
        }
      }
    }
    return reasons;
  }

  function validateQuestions(data) {
    var report = {
      ok: true,
      modes: {},
      skipped: [],
      passedItems: { single: [], double: [], cluster: [] }
    };
    var keys = ['single', 'double', 'cluster'];
    keys.forEach(function (key) {
      var items = (data.modes && data.modes[key] && data.modes[key].items) || [];
      var passed = [];
      var failed = [];
      items.forEach(function (item) {
        var reasons = validateItem(item, key);
        if (reasons.length) {
          failed.push({ id: item && item.id, reasons: reasons });
          report.skipped.push({ id: item && item.id, reasons: reasons });
        } else {
          passed.push(item);
        }
      });
      report.modes[key] = { total: items.length, passed: passed.length, failed: failed.length, failedItems: failed };
      report.passedItems[key] = passed;
      if (failed.length || items.length !== 50 || passed.length !== 50) report.ok = false;
    });
    var allPassed = report.passedItems.single.length + report.passedItems.double.length + report.passedItems.cluster.length;
    report.all = { total: 150, passed: allPassed, failed: report.skipped.length };
    if (allPassed !== 150) report.ok = false;
    return report;
  }

  function formatReport(report) {
    var lines = [];
    ['single', 'double', 'cluster'].forEach(function (key) {
      var row = report.modes[key];
      var label = { single: '홑받침', double: '쌍받침', cluster: '겹받침' }[key];
      lines.push(label + ' ' + row.passed + '/' + row.total + (row.failed ? ' 실패 ' + row.failed : ' 통과'));
    });
    lines.push('종합 ' + report.all.passed + '/' + report.all.total + (report.all.failed ? ' 실패 ' + report.all.failed : ' 통과'));
    lines.push(report.ok ? '결과: 모두 통과' : '결과: 확인이 필요합니다');
    report.skipped.forEach(function (item) {
      lines.push('건너뜀 ' + item.id + ' - ' + item.reasons.join(', '));
    });
    return lines.join('\n');
  }

  return {
    jongOf: jongOf,
    jongKind: jongKind,
    fisherYates: fisherYates,
    validateItem: validateItem,
    validateQuestions: validateQuestions,
    formatReport: formatReport
  };
});
