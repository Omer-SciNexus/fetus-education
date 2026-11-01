// An optional symbolic chapter. The original film remains reproducible.
(() => {
  const enabled = new URLSearchParams(location.search).get('edition') === 'bonding';
  window.film = {
    duration: enabled ? 86 : 68,
    name: enabled ? 'a-little-sun-bonding' : 'a-little-sun',
    poster: 55,
    previews: enabled ? [2, 20, 41, 44.5, 48, 54, 60, 62, 63.5, 67, 73, 82] : [2, 8, 14, 20, 27, 34, 41, 48, 55, 64],
  };
  if (!enabled) return;

  const original = window.renderFrame;
  const transition = document.createElement('canvas');
  transition.width = W;
  transition.height = H;
  const transitionContext = transition.getContext('2d');
  const chapters = [
    { title: ['Your voice', 'becomes light.'], line: 'A familiar voice. A little moment of connection.', label: 'VOICE' },
    { title: ['A story becomes', 'a sky of stars.'], line: 'A few quiet words. A world to share.', label: 'STORIES' },
    { title: ['A gentle melody.', 'A golden thread.'], line: 'Little moments, gathered into light.', label: 'MUSIC' },
  ];

  function star(x, y, radius, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    glow(x, y, radius * 4, 'rgba(255,209,130,.28)');
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 - Math.PI / 2;
      const r = i % 2 ? radius * .28 : radius;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe1a5';
    ctx.fill();
    ctx.restore();
  }

  function sourceIcon(kind, alpha, t) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(173, 478);
    glow(0, 0, 105, 'rgba(249,178,80,.12)');
    ellipse(0, 0, 64, 64, 'rgba(236,186,117,.045)');
    ctx.strokeStyle = 'rgba(241,201,143,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 64, 0, TAU); ctx.stroke();
    if (kind === 0) {
      // Parent silhouette, facing the baby; no modeled physiological response.
      path('M -40 37 C -38 15 -20 10 -16 2 L -16 -10 C -35 -21 -28 -48 -9 -51 C 10 -56 28 -40 25 -22 L 35 -9 Q 38 -3 26 -3 L 25 5 Q 19 14 7 10 L 7 22 C 25 24 36 29 40 37', 'rgba(238,188,132,.12)', '#e4bd89', 2);
      path('M 10 -23 Q 16 -26 20 -23 M 21 1 L 27 1', null, '#edc894', 1.4);
      for (let i = 0; i < 3; i++) {
        const r = 16 + i * 9;
        ctx.globalAlpha = alpha * (.3 + .18 * (1 + Math.sin(t * 2 - i)));
        ctx.beginPath(); ctx.arc(30, -4, r, -.65, .65); ctx.stroke();
      }
    } else if (kind === 1) {
      path('M 0 -21 Q -22 -38 -46 -28 L -46 29 Q -22 18 0 34 Q 22 18 46 29 L 46 -28 Q 22 -38 0 -21 Z', 'rgba(238,188,132,.12)', '#efcc98', 2);
      path('M 0 -21 L 0 34 M -35 -14 Q -20 -19 -10 -10 M -35 -2 Q -20 -7 -10 2 M -35 10 Q -20 5 -10 14 M 10 -10 Q 20 -19 35 -14 M 10 2 Q 20 -7 35 -2 M 10 14 Q 20 5 35 10', null, '#cfaa78', 1.3);
      star(17, -47, 7, .6 + .25 * Math.sin(t));
    } else {
      path('M -19 17 L -19 -28 L 24 -38 L 24 7 M -19 -17 L 24 -27', null, '#efcc98', 3);
      ellipse(-28, 20, 10, 7, '#efcc98');
      ellipse(15, 11, 10, 7, '#efcc98');
    }
    ctx.restore();
  }

  function voiceWaves(t, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = 'screen';
    // Wavefronts travel from the parent toward the luminous womb.
    for (let i = 0; i < 6; i++) {
      const p = ((t * .2 + i / 6) % 1 + 1) % 1;
      const x = mix(255, 798, p), y = mix(480, 374, ease(p));
      const radius = 13 + p * 125;
      const a = Math.sin(p * Math.PI) * .52;
      ctx.strokeStyle = `rgba(255,211,141,${a})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * .4, radius, -.12, -1.15, 1.15);
      ctx.stroke();
      glow(x + radius * .4, y, 19, `rgba(255,201,111,${a * .25})`);
    }
    ctx.restore();
  }

  function storyStars(t, alpha, gather) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (let i = 0; i < 22; i++) {
      const p = ((t * .10 + i / 22) % 1 + 1) % 1;
      const x = mix(235, 1080, p);
      const y = 478 - 280 * ease((p - .38) / .62) + 25 * Math.sin(i * 4.2);
      const angle = i * 2.399 + t * .13;
      const orbitX = 874 + Math.cos(angle) * (185 + i % 4 * 12);
      const orbitY = 330 + Math.sin(angle) * (185 + i % 4 * 12);
      star(mix(x, orbitX, gather), mix(y, orbitY, gather), 4 + i % 4, Math.sin(p * Math.PI) * .8);
    }
    // Stars remain around the womb as each story joins the light.
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10 + t * .05;
      star(874 + Math.cos(a) * 212, 330 + Math.sin(a) * 224, 4 + i % 3,
        (.5 + .2 * Math.sin(t + i)) * ease((t - 6) / 3));
    }
    ctx.restore();
  }

  function musicRibbons(t, alpha, gather) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = 'screen';
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const p = i / 120;
        const x = mix(245, 1125, p);
        const y = mix(487, 348, ease(p)) + Math.sin(p * 7 - t * .9 + j * .46) * Math.sin(p * Math.PI) * (38 + j * 12);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(245, 480, 1125, 350);
      g.addColorStop(0, 'rgba(255,215,148,0)');
      g.addColorStop(.2, 'rgba(255,215,148,.48)');
      g.addColorStop(.8, 'rgba(255,202,122,.3)');
      g.addColorStop(1, 'rgba(255,215,148,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = j === 0 ? 2.5 : 1.1;
      ctx.stroke();
    }
    if (gather > 0) {
      for (let j = 0; j < 3; j++) {
        ctx.strokeStyle = `rgba(255,220,153,${gather * (.3 - j * .06)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(874, 330, 233 + j * 8, 216 + j * 7, t * .07 + j * .4, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function bondingFrame(t) {
    const motionTime = 45 + t;
    background(44);
    ctx.textAlign = 'left';
    spaced('L I T T L E   B L O O M', 90, 64, 11, 1.5, '#d8bd98');
    text('A LITTLE SUN', 1190, 64, 11, '#b9a39a', 'Arial', 'right');
    ctx.textAlign = 'left';
    const gather = ease((t - 14.5) / 3.5);
    womb(874, 330, motionTime);
    rays(874, 330, motionTime, .75 + gather * 1.2);
    glow(874, 330, 270, `rgba(255,192,93,${.08 + gather * .2})`);
    magic(874, 330, motionTime, .65);

    // Effects build on one another instead of depicting increased intelligence.
    const voice = 1 - ease((t - 5.4) / 1.4) * .75;
    const story = ease((t - 5.6) / 1.2);
    const music = ease((t - 11.6) / 1.2);
    voiceWaves(t, voice);
    storyStars(t, story, gather);
    musicRibbons(t, music, gather);
    ctx.save();
    ctx.translate(874, 330 + Math.sin(motionTime * .7) * 4);
    fetus(motionTime, .9);
    ctx.restore();

    spaced('PRENATAL BONDING', 90, 176, 12, 3);
    for (let i = 0; i < 3; i++) {
      const fadeIn = i === 0 ? 1 : ease((t - i * 6 + .4) / 1.2);
      const fadeOut = i === 2 ? 1 : 1 - ease((t - (i + 1) * 6 + .4) / 1.2);
      const alpha = fadeIn * fadeOut;
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      const shift = (1 - alpha) * 8;
      chapters[i].title.forEach((line, row) => text(line, 86, 241 + row * 59 + shift, 51, '#fff0d9', 'Georgia'));
      text(chapters[i].line, 90, 350 + shift, 16, '#dbc1a5');
      ctx.restore();
      sourceIcon(i, alpha, t);
    }
    // Chapter markers replace the week timeline during this symbolic interlude.
    for (let i = 0; i < 3; i++) {
      const x = 90 + i * 145;
      const active = Math.floor(clamp(t, 0, 17.99) / 6) === i;
      ellipse(x + 4, 586, 3, 3, active ? '#ffe6b1' : '#886b55');
      text(chapters[i].label, x + 17, 590, 11, active ? '#f2d09b' : '#a58a77');
    }
    text('A familiar voice. A story. A little moment of connection.', 640, 652, 19, '#e5c9a4', 'Arial', 'center');
    text('A symbolic expression of connection', 1190, 686, 11, '#a7979d', 'Arial', 'right');
    ctx.textAlign = 'left';
  }

  window.renderFrame = function(t) {
    const sourceTime = t < 45 ? t : t < 63 ? 45 : t - 18;
    if (t < 44 || t >= 64) {
      original(sourceTime);
      return;
    }
    const alpha = ease(t - 44) * (1 - ease(t - 63));
    if (alpha < 1) {
      original(sourceTime);
      transitionContext.drawImage(c, 0, 0);
    }
    bondingFrame(t - 45);
    if (alpha < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - alpha;
      ctx.drawImage(transition, 0, 0);
      ctx.restore();
    }
  };
  window.renderFrame(55);
})();
