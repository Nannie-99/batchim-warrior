(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.BatchimDraw = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var INK = '#1a1c2c';
  var NIGHT = '#2d2a4a';
  var PURPLE = '#5d275d';
  var RED = '#b13e53';
  var ORANGE = '#ef7d57';
  var YELLOW = '#ffcd75';
  var LIME = '#a7f070';
  var GREEN = '#38b764';
  var TEAL = '#257179';
  var NAVY = '#29366f';
  var BLUE = '#3b5dc9';
  var SKY = '#41a6f6';
  var CYAN = '#73eff7';
  var WHITE = '#f4f4f4';
  var SILVER = '#94b0c2';
  var BROWN = '#566c86';

  function pix(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w, h);
  }

  function ground(ctx, color) {
    pix(ctx, 0, 158, 320, 22, color);
    pix(ctx, 0, 158, 320, 2, INK);
  }

  function drawBackdrop(ctx, bg, time) {
    var far = Math.floor(time / 90) % 320;
    var mid = Math.floor(time / 50) % 320;
    if (bg === 0) {
      pix(ctx, 0, 0, 320, 110, SKY);
      pix(ctx, 0, 110, 320, 48, LIME);
      pix(ctx, 250, 18, 28, 28, YELLOW);
      pix(ctx, 258, 26, 12, 12, WHITE);
      pix(ctx, 20 - (far % 80), 30, 24, 8, WHITE);
      pix(ctx, 140 - (far % 100), 22, 30, 8, WHITE);
      pix(ctx, 0, 128, 320, 30, GREEN);
      pix(ctx, 40, 120, 16, 16, TEAL);
      pix(ctx, 48, 112, 8, 10, TEAL);
      pix(ctx, 200, 118, 20, 18, TEAL);
    } else if (bg === 1) {
      pix(ctx, 0, 0, 320, 100, BLUE);
      pix(ctx, 30, 0, 6, 90, CYAN);
      pix(ctx, 150, 0, 6, 70, CYAN);
      pix(ctx, 260, 10, 6, 80, CYAN);
      pix(ctx, 18 - mid, 90, 28, 50, TEAL);
      pix(ctx, 26 - mid, 78, 12, 16, GREEN);
      pix(ctx, 210, 86, 34, 56, TEAL);
      pix(ctx, 80, 124, 12, 10, ORANGE);
      pix(ctx, 84, 120, 4, 6, WHITE);
      pix(ctx, 150, 128, 14, 12, RED);
      ground(ctx, TEAL);
      return;
    } else if (bg === 2) {
      pix(ctx, 0, 0, 320, 90, CYAN);
      pix(ctx, 0, 90, 320, 30, BLUE);
      pix(ctx, 0, 120, 320, 38, NAVY);
      var spark = (Math.floor(time / 200) % 6);
      pix(ctx, 40 + spark, 132, 4, 2, CYAN);
      pix(ctx, 120, 140, 6, 2, SKY);
      pix(ctx, 220 - spark, 128, 4, 2, WHITE);
      pix(ctx, 0, 150, 320, 8, GREEN);
      ground(ctx, TEAL);
      return;
    } else if (bg === 3) {
      pix(ctx, 0, 0, 320, 180, INK);
      pix(ctx, 0, 150, 320, 30, NIGHT);
      pix(ctx, 36, 70, 10, 28, SKY);
      pix(ctx, 40, 60, 4, 10, CYAN);
      pix(ctx, 250, 48, 14, 36, BLUE);
      pix(ctx, 180, 90, 8, 22, PURPLE);
      pix(ctx, 100, 110, 12, 18, CYAN);
      pix(ctx, 0, 158, 320, 2, SILVER);
      return;
    } else if (bg === 4) {
      pix(ctx, 0, 0, 320, 110, SILVER);
      pix(ctx, 0, 70, 120, 50, WHITE);
      pix(ctx, 140, 84, 180, 40, WHITE);
      pix(ctx, 0, 130, 320, 28, WHITE);
      var flake = Math.floor(time / 120) % 40;
      pix(ctx, 30, flake, 2, 2, WHITE);
      pix(ctx, 90, (flake * 2) % 140, 2, 2, WHITE);
      pix(ctx, 200, (flake + 20) % 130, 2, 2, NAVY);
      pix(ctx, 260, (flake * 3) % 120, 2, 2, WHITE);
      ground(ctx, SILVER);
      return;
    } else if (bg === 5) {
      pix(ctx, 0, 0, 320, 100, RED);
      pix(ctx, 0, 70, 320, 40, ORANGE);
      pix(ctx, 0, 120, 320, 20, BROWN);
      pix(ctx, 40, 112, 240, 8, BROWN);
      var ember = Math.floor(time / 80) % 50;
      pix(ctx, 60, 100 - ember, 2, 2, YELLOW);
      pix(ctx, 180, 90 - (ember % 30), 2, 2, ORANGE);
      pix(ctx, 240, 110 - (ember % 40), 2, 2, YELLOW);
      ground(ctx, INK);
      return;
    } else {
      pix(ctx, 0, 0, 320, 180, INK);
      pix(ctx, 230, 16, 22, 22, WHITE);
      pix(ctx, 236, 22, 8, 8, SILVER);
      pix(ctx, 20, 20, 2, 2, YELLOW);
      pix(ctx, 70, 36, 2, 2, WHITE);
      pix(ctx, 130, 18, 2, 2, YELLOW);
      pix(ctx, 180, 48, 2, 2, WHITE);
      pix(ctx, 200, 70, 36, 70, NAVY);
      pix(ctx, 210, 60, 16, 12, NIGHT);
      pix(ctx, 214, 90, 6, 8, YELLOW);
      ground(ctx, NIGHT);
    }
  }

  function draw(ctx, view) {
    ctx.clearRect(0, 0, 320, 180);
    drawBackdrop(ctx, view.bg, view.time);
    if (view.bg === 0) ground(ctx, GREEN);
  }

  return { draw: draw };
});
