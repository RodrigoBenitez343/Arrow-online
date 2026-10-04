// Scroll-reveal: fade elements in as they enter the viewport (native IntersectionObserver)
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  }
}

// Hero background: a miniature node-editor graph. Nodes rest scattered; hovering
// the card glides them into a left → right chain, the links draw node-by-node,
// and once the chain completes it re-shuffles into a brand-new arrangement and
// builds again — looping while hovered. Leaving disconnects and drifts them back.
(function () {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('hero-canvas');
  if (!hero || !canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  let nodes = [], edges = [], w = 0, h = 0, raf = null, last = 0;

  // Phase timings (ms).
  const STAGGER = 240;   // gap between consecutive links starting to draw
  const LINK_DUR = 320;  // time for a single link to draw
  const HOLD = 950;      // fully-connected pause before re-shuffle
  const SHUF_OUT = 180;  // fade-out
  const SHUF_IN = 260;   // fade-in

  let assembly = 0;      // 0 = scattered, 1 = chain aligned
  let hoverTarget = 0;   // 0/1
  let opacity = 1;       // node + link opacity (dips during re-shuffle)
  let mode = 'idle';     // 'idle' | 'build' | 'hold' | 'shuffle'
  let modeT = 0;         // ms within the current mode
  let shuffleDir = 'out';

  // Current chain layout geometry (set by build, used by randomizeArrangement).
  let nodeCols = 4, nodeBaseW = 64, nodePadX = 45, nodePadY = 32;

  // Node skins lifted from the editor: brown "app", green "job", purple
  // "condition", dark "globe / terminal".
  const SKINS = [
    { fill: 'rgba(96,66,30,.92)',  stroke: 'rgba(150,106,54,.9)',  icon: 'app',   multi: true  },
    { fill: 'rgba(30,128,96,.92)', stroke: 'rgba(66,190,142,.85)', icon: 'job',   multi: false },
    { fill: 'rgba(44,34,82,.94)',  stroke: 'rgba(122,106,192,.85)', icon: 'cond', multi: true  },
    { fill: 'rgba(13,13,13,.94)',  stroke: 'rgba(74,74,78,.9)',     icon: 'globe', multi: false },
  ];
  const LINK = 'rgba(214,138,52,.6)';
  const LINK_ALT = 'rgba(212,186,58,.55)';
  const PULSE = 'rgba(246,196,120,.95)';
  const PORT_IN = 'rgba(96,192,226,.95)';
  const PORT_OUT = 'rgba(64,206,142,.95)';
  const LABEL = 'rgba(226,232,240,.5)';
  const GRID = 'rgba(255,255,255,.03)';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smooth(a) { return a * a * (3 - 2 * a); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Vertical position of port i of n on a node's left/right edge.
  function portY(node, i, n) {
    if (n <= 1) return node.y + node.h / 2;
    return node.y + node.h * (i === 0 ? 0.34 : 0.66);
  }

  function build() {
    const rect = hero.getBoundingClientRect();
    w = rect.width; h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nodeW = Math.max(48, Math.min(84, w / 11));
    const nodeH = nodeW * 0.66;
    const cols = Math.max(3, Math.min(6, Math.round(w / 185)));
    const padX = nodeW * 0.7;
    const padY = nodeH * 0.75;

    // Fixed scatter positions — where each node rests when the card isn't hovered.
    nodes = [];
    for (let c = 0; c < cols; c++) {
      const colX = cols === 1 ? w / 2 : padX + (c / (cols - 1)) * (w - 2 * padX);
      const sx = clamp(colX - nodeW / 2 + rand(-0.34, 0.34) * w, padX * 0.2, w - nodeW - padX * 0.2);
      const sy = clamp(rand(padY * 0.2, h - padY * 0.2 - nodeH), 0, h - nodeH);
      nodes.push({ sx, sy, hx: sx, hy: sy, x: sx, y: sy, w: nodeW, h: nodeH, skin: SKINS[0], outLabels: ['output'], bob: Math.random() * Math.PI * 2 });
    }
    nodeCols = cols; nodeBaseW = nodeW; nodePadX = padX; nodePadY = padY;

    randomizeArrangement();
    mode = 'idle'; modeT = 0;
  }

  // Lay out a fresh chain (positions, sizes, colors, links). Safe to call while
  // the nodes are scattered or faded out, so the change is never seen as a jump.
  function randomizeArrangement() {
    const cols = nodeCols, baseW = nodeBaseW, padX = nodePadX, padY = nodePadY;
    const spanY = Math.max(0, h - 2 * padY - baseW * 0.66);

    const slots = [];
    for (let i = 0; i < cols; i++) slots.push(i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = slots[i]; slots[i] = slots[j]; slots[j] = t;
    }

    nodes.forEach((n, c) => {
      const nw = baseW * (0.88 + Math.random() * 0.24);
      const nh = nw * 0.66;
      const colX = cols === 1 ? w / 2 : padX + (c / (cols - 1)) * (w - 2 * padX);
      const hy = padY + (cols === 1 ? spanY / 2 : (slots[c] / (cols - 1)) * spanY);
      n.w = nw; n.h = nh;
      n.hx = colX - nw / 2;
      n.hy = clamp(hy, padY * 0.5, h - padY * 0.5 - nh);
      n.skin = SKINS[(Math.random() * SKINS.length) | 0];
      n.outLabels = n.skin.icon === 'cond' ? ['true', 'false']
        : (n.skin.multi && Math.random() < 0.5 ? ['output', 'ctx_out'] : ['output']);
    });

    // Chain left → right, plus a few longer "skip" links for richness.
    edges = [];
    for (let c = 0; c < cols - 1; c++) edges.push({ a: c, b: c + 1, out: 0, color: LINK, p: 0 });
    for (let c = 0; c < cols - 2; c++) {
      if (nodes[c].outLabels.length > 1 && Math.random() < 0.7) {
        edges.push({ a: c, b: c + 2, out: 1, color: LINK_ALT, p: 0 });
      }
    }
    edges.forEach(e => { e.phase = Math.random(); e.speed = 0.35 + Math.random() * 0.35; });
  }

  // Cubic control points for a link: ports on the inner edges, bent horizontally.
  function linkPoints(e) {
    const a = nodes[e.a], b = nodes[e.b];
    const sx = a.x + a.w, sy = portY(a, e.out, a.outLabels.length);
    const tx = b.x, ty = portY(b, 0, 1);
    const bend = Math.max(34, Math.abs(tx - sx) * 0.5);
    return {
      p0: { x: sx, y: sy }, p1: { x: sx + bend, y: sy },
      p2: { x: tx - bend, y: ty }, p3: { x: tx, y: ty },
      color: e.color,
    };
  }

  function bezAt(p, t) {
    const mt = 1 - t;
    const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
    return {
      x: a * p.p0.x + b * p.p1.x + c * p.p2.x + d * p.p3.x,
      y: a * p.p0.y + b * p.p1.y + c * p.p2.y + d * p.p3.y,
    };
  }

  // Draw the [0..prog] portion of a link so it grows node-by-node.
  function strokeLink(p, prog) {
    if (prog <= 0.001) return;
    const end = Math.min(1, prog);
    const steps = Math.max(2, Math.round(28 * end));
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const pt = bezAt(p, (s / steps) * end);
      if (s === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  function roundRect(x, y, ww, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
  }

  function dot(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(10,10,10,.8)';
    ctx.stroke();
  }

  function glowAt(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(246,196,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGrid() {
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    const step = 28;
    ctx.beginPath();
    for (let x = step; x < w; x += step) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); }
    for (let y = step; y < h; y += step) { ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); }
    ctx.stroke();
  }

  function drawIcon(kind, cx, cy, s) {
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    if (kind === 'app') {
      roundRect(cx - s * 0.46, cy - s * 0.4, s * 0.92, s * 0.8, s * 0.16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.46, cy - s * 0.16);
      ctx.lineTo(cx + s * 0.46, cy - s * 0.16);
      ctx.stroke();
    } else if (kind === 'job') {
      roundRect(cx - s * 0.46, cy - s * 0.4, s * 0.92, s * 0.8, s * 0.16);
      ctx.stroke();
      roundRect(cx - s * 0.2, cy - s * 0.16, s * 0.4, s * 0.34, s * 0.08);
      ctx.stroke();
    } else if (kind === 'cond') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(s)}px "Segoe UI", Inter, sans-serif`;
      ctx.fillText('?', cx, cy + s * 0.04);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
      ctx.moveTo(cx - s * 0.42, cy);
      ctx.lineTo(cx + s * 0.42, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.18, s * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Blend each node between its fixed scatter spot and its current home slot.
  function updatePositions(t) {
    const a = smooth(assembly);
    nodes.forEach(n => {
      n.x = n.sx + (n.hx - n.sx) * a;
      n.y = n.sy + (n.hy - n.sy) * a + (1 - a) * Math.sin(t * 0.001 + n.bob) * 3;
    });
  }

  function update(dt) {
    // Smoothly glide between scattered and chain (never snap).
    assembly += (hoverTarget - assembly) * Math.min(1, dt * 0.0028);
    if (Math.abs(hoverTarget - assembly) < 0.001) assembly = hoverTarget;

    if (mode === 'shuffle') {
      modeT += dt;
      if (shuffleDir === 'out') {
        opacity = clamp(1 - modeT / SHUF_OUT, 0, 1);
        if (modeT >= SHUF_OUT) { opacity = 0; randomizeArrangement(); shuffleDir = 'in'; modeT = 0; }
      } else {
        opacity = clamp(modeT / SHUF_IN, 0, 1);
        if (modeT >= SHUF_IN) { opacity = 1; mode = 'build'; modeT = 0; }
      }
    } else if (mode === 'build') {
      if (assembly > 0.9) {
        modeT += dt;
        const total = (edges.length - 1) * STAGGER + LINK_DUR;
        edges.forEach((e, i) => {
          const start = i * STAGGER;
          const tgt = modeT <= start ? 0 : Math.min(1, (modeT - start) / LINK_DUR);
          e.p += (tgt - e.p) * Math.min(1, dt * 0.02);
        });
        if (modeT >= total + 80) { mode = 'hold'; modeT = 0; }
      }
    } else if (mode === 'hold') {
      modeT += dt;
      edges.forEach(e => { e.p += (1 - e.p) * Math.min(1, dt * 0.02); });
      if (modeT >= HOLD) { mode = 'shuffle'; shuffleDir = 'out'; modeT = 0; }
    } else { // idle
      edges.forEach(e => { e.p += (0 - e.p) * Math.min(1, dt * 0.006); });
    }

    // Data pulses only flow while hovered and aligned.
    if (hoverTarget && assembly > 0.9) {
      edges.forEach(e => { e.phase = (e.phase + e.speed * dt * 0.001) % 1; });
    }
  }

  function draw(t) {
    updatePositions(t);
    ctx.clearRect(0, 0, w, h);
    drawGrid();

    // Links with arrowheads, drawn node-by-node (behind the nodes).
    if (opacity > 0.02) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 1.4;
      edges.forEach(e => {
        if (e.p <= 0.001) return;
        const p = linkPoints(e);
        ctx.strokeStyle = p.color;
        strokeLink(p, e.p);

        if (e.p > 0.98) {
          const tip = bezAt(p, 1), tail = bezAt(p, 0.85);
          const ang = Math.atan2(tip.y - tail.y, tip.x - tail.x);
          const ah = 7;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(tip.x, tip.y);
          ctx.lineTo(tip.x - ah * Math.cos(ang - 0.42), tip.y - ah * Math.sin(ang - 0.42));
          ctx.lineTo(tip.x - ah * Math.cos(ang + 0.42), tip.y - ah * Math.sin(ang + 0.42));
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // Nodes.
    if (opacity > 0.02) {
      ctx.save();
      ctx.globalAlpha = opacity;
      nodes.forEach(node => {
        ctx.fillStyle = node.skin.fill;
        roundRect(node.x, node.y, node.w, node.h, node.w * 0.14);
        ctx.fill();
        ctx.strokeStyle = node.skin.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();

        drawIcon(node.skin.icon, node.x + node.w / 2, node.y + node.h / 2, node.h * 0.5);

        const fs = Math.max(7, Math.round(node.h * 0.19));
        ctx.font = `${fs}px "Segoe UI", Inter, sans-serif`;
        ctx.textBaseline = 'middle';

        // Input port + label (outside, on the left).
        const iy = portY(node, 0, 1);
        dot(node.x, iy, PORT_IN);
        ctx.fillStyle = LABEL;
        ctx.textAlign = 'right';
        ctx.fillText('input', node.x - 6, iy);

        // Output ports + labels (outside, on the right).
        const on = node.outLabels.length;
        node.outLabels.forEach((label, i) => {
          const oy = portY(node, i, on);
          dot(node.x + node.w, oy, PORT_OUT);
          ctx.fillStyle = LABEL;
          ctx.textAlign = 'left';
          ctx.fillText(label, node.x + node.w + 6, oy);
        });
      });
      ctx.restore();
    }

    // Build-head glow on the link currently drawing, plus pulses on completed links.
    if (opacity > 0.02) {
      ctx.save();
      ctx.globalAlpha = opacity;
      edges.forEach(e => {
        const p = linkPoints(e);
        if (e.p > 0.02 && e.p < 0.99) glowAt(bezAt(p, e.p).x, bezAt(p, e.p).y, 7, PULSE);
        if (e.p > 0.99) glowAt(bezAt(p, e.phase).x, bezAt(p, e.phase).y, 6, PULSE);
      });
      ctx.restore();
    }
  }

  function tick(ts) {
    const dt = Math.min((ts - last) || 0, 50);
    last = ts;
    update(dt);
    draw(ts);
    raf = requestAnimationFrame(tick);
  }

  function onEnter() {
    if (hoverTarget === 1) return;
    hoverTarget = 1;
    if (assembly < 0.2) randomizeArrangement(); // safe: nodes are still scattered
    mode = 'build'; modeT = 0;
  }
  function onLeave() {
    hoverTarget = 0;
    if (mode !== 'idle') { mode = 'idle'; modeT = 0; }
  }

  hero.addEventListener('pointerenter', onEnter);
  hero.addEventListener('mouseenter', onEnter);
  hero.addEventListener('pointerleave', onLeave);
  hero.addEventListener('mouseleave', onLeave);
  hero.addEventListener('touchstart', onEnter, { passive: true });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      mode = hoverTarget ? 'build' : 'idle';
      modeT = 0;
    }, 200);
  });

  function start() {
    build();
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  start();
})();

// "Frontier-model capability": a system-chain graph draws itself — worker chains and the
// entry node converge on a central router, which feeds an LLM node — then crossfades
// into the agent window. Each coworker system chain has its OWN conversation, so the
// cursor switches between them and drives a realistic task in each. Loops on screen.
(function () {
  const card = document.getElementById('agent-card');
  const canvas = document.getElementById('agent-canvas');
  const stage = document.getElementById('agent-stage');
  const winEl = document.getElementById('agent-window');
  const titleEl = document.getElementById('agent-title');
  const messagesEl = document.getElementById('agent-messages');
  const hintEl = document.getElementById('agent-hint');
  const phEl = document.getElementById('agent-ph');
  const typedEl = document.getElementById('agent-typed');
  const inputEl = document.querySelector('.agent-inputtext');
  const sendEl = document.getElementById('agent-send');
  const cursorEl = document.getElementById('agent-cursor');
  if (!card || !canvas || !stage || !winEl || !messagesEl || !inputEl || !sendEl || !cursorEl || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, raf = null, last = 0, running = false;
  let phase = 'graph', phaseT = 0, canvasAlpha = 0;
  let nodes = [], edges = [], timers = [], typeTimer = null, typingEl = null;

  // Node skins lifted from the editor: steel-blue entry, green worker chains, a dark
  // router, and the brown LLM node — joined by orange links, exactly as in the canvas.
  const SKINS = {
    start:  { fill: 'rgba(41,102,143,.96)', stroke: 'rgba(120,180,220,.85)', icon: 'start'  },
    worker: { fill: 'rgba(52,148,108,.96)', stroke: 'rgba(120,210,170,.85)', icon: 'worker' },
    router: { fill: 'rgba(30,24,18,.97)',   stroke: 'rgba(96,78,52,.9)',     icon: 'router' },
    llm:    { fill: 'rgba(96,66,30,.95)',   stroke: 'rgba(150,106,54,.85)',  icon: 'llm'    },
  };
  const LINK = 'rgba(214,138,52,.62)';
  const PULSE = 'rgba(246,196,120,.95)';
  const PORT_IN = 'rgba(96,192,226,.95)';
  const PORT_OUT = 'rgba(64,206,142,.95)';
  const LABEL = 'rgba(226,232,240,.5)';
  const GRID = 'rgba(255,255,255,.03)';

  const GRAPH_BUILD = 2200, GRAPH_HOLD = 950, GRAPH_OUT = 700, CHAT = 12600, CHAT_OUT = 600;

  // Each system chain is its own agent with its own conversation and its own kind of
  // work — scraping the web, applying to jobs, coding and driving desktop apps.
  const AGENTS = [
    { key: 'scout', name: 'Scout', role: 'research', initials: 'SC',
      ask: "Scrape our 3 competitors' pricing pages.",
      reply: 'Pulled all three pages and diffed them against last month — two prices moved.' },
    { key: 'quill', name: 'Quill', role: 'writing', initials: 'QU',
      ask: 'Apply to the 5 saved roles and message the recruiter.',
      reply: 'Tailored and submitted all five, then messaged the recruiter. Tracker updated.' },
    { key: 'forge', name: 'Forge', role: 'code', initials: 'FO',
      ask: 'Fix the failing test and export the invoices from the desktop app.',
      reply: 'Patched the rounding bug — the suite is green and PR #142 is open. Drove the invoicing app and saved the PDFs.' },
  ];
  function agentByKey(key) { for (let i = 0; i < AGENTS.length; i++) if (AGENTS[i].key === key) return AGENTS[i]; return null; }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function portY(node, i, n) { return n <= 1 ? node.y + node.h / 2 : node.y + node.h * ((i + 1) / (n + 1)); }

  // ----- system-chain graph -----
  function build() {
    const rect = card.getBoundingClientRect();
    w = rect.width; h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Size nodes from the card width, then shrink them if the vertical span cannot
    // hold all workers plus gaps — so they never overlap on wide viewports.
    const workers = 5;
    const top = h * 0.20, bottom = h * 0.94, cy = (top + bottom) / 2;
    const avail = bottom - top;
    const gapMin = Math.max(8, h * 0.02);
    const maxNh = (avail - gapMin * (workers - 1)) / workers;
    const baseW = clamp(w / 11, 46, 78);
    const nh = Math.min(baseW * 0.78, maxNh);
    const nw = nh / 0.78;
    const mk = (x, y, ww, hh, skin, inL, outL) => ({ x, y, w: ww, h: hh, skin, inLabels: inL, outLabels: outL });

    nodes = [];
    // entry node (blue) tucked above the worker column
    nodes.push(mk(w * 0.30 - nw / 2, top - nh * 1.35, nw, nh, SKINS.start, ['input'], ['output', 'data']));
    // worker chains (green) — evenly spaced so they never overlap
    const spanW = avail - nh;
    for (let i = 0; i < workers; i++) {
      const y = top + (workers === 1 ? spanW / 2 : (i / (workers - 1)) * spanW);
      nodes.push(mk(w * 0.19 - nw / 2, y, nw, nh, SKINS.worker, ['input'], ['output']));
    }
    // router (dark) at the hub
    const rw = nw * 1.15, rh = nh * 1.7;
    const routerI = nodes.length;
    nodes.push(mk(w * 0.55 - rw / 2, cy - rh / 2, rw, rh, SKINS.router, ['input', 'prompts', 'context', 'tools'], ['output', 'data_out', 'mini_brain', 'model']));
    // llm node (brown)
    nodes.push(mk(w * 0.80 - nw / 2, cy - rh * 0.28, nw, nh, SKINS.llm, ['input', 'data_in'], ['output']));

    edges = [];
    // every worker chain feeds the router's "tools" port
    for (let i = 0; i < workers; i++) edges.push({ a: 1 + i, b: routerI, out: 0, in: 3, p: 0, phase: Math.random() });
    // the entry chain drives the router's "input" and "prompts"
    edges.push({ a: 0, b: routerI, out: 0, in: 0, p: 0, phase: Math.random() });
    edges.push({ a: 0, b: routerI, out: 1, in: 1, p: 0, phase: Math.random() });
    // the router's "output" and "data_out" feed the LLM node
    edges.push({ a: routerI, b: routerI + 1, out: 0, in: 0, p: 0, phase: Math.random() });
    edges.push({ a: routerI, b: routerI + 1, out: 1, in: 1, p: 0, phase: Math.random() });
  }

  function linkPoints(e) {
    const a = nodes[e.a], b = nodes[e.b];
    const sx = a.x + a.w, sy = portY(a, e.out, a.outLabels.length);
    const tx = b.x, ty = portY(b, e.in, b.inLabels.length);
    const bend = Math.max(30, Math.abs(tx - sx) * 0.5);
    return { p0: { x: sx, y: sy }, p1: { x: sx + bend, y: sy }, p2: { x: tx - bend, y: ty }, p3: { x: tx, y: ty } };
  }
  function bezAt(p, t) {
    const mt = 1 - t;
    const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
    return { x: a * p.p0.x + b * p.p1.x + c * p.p2.x + d * p.p3.x, y: a * p.p0.y + b * p.p1.y + c * p.p2.y + d * p.p3.y };
  }
  function strokeLink(p, prog) {
    if (prog <= 0.001) return;
    const end = Math.min(1, prog);
    const steps = Math.max(2, Math.round(28 * end));
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) { const pt = bezAt(p, (s / steps) * end); if (s === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); }
    ctx.stroke();
  }
  function roundRect(x, y, ww, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
  }
  function dot(x, y, color) {
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(10,10,10,.8)'; ctx.stroke();
  }
  function pulseAt(x, y, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, PULSE); g.addColorStop(1, 'rgba(246,196,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function drawGrid() {
    ctx.strokeStyle = GRID; ctx.lineWidth = 1; const step = 28; ctx.beginPath();
    for (let x = step; x < w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
    for (let y = step; y < h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
    ctx.stroke();
  }
  function drawIcon(kind, cx, cy, s) {
    ctx.lineWidth = Math.max(1, s * 0.11);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    // every editor node carries a rounded "canvas" glyph…
    roundRect(cx - s * 0.5, cy - s * 0.42, s, s * 0.84, s * 0.16);
    ctx.stroke();
    if (kind === 'start' || kind === 'worker') {
      // …with an inner panel for the sequence / chain nodes
      roundRect(cx - s * 0.24, cy - s * 0.19, s * 0.48, s * 0.38, s * 0.08);
      ctx.stroke();
    } else if (kind === 'router') {
      // a routing chevron through the middle
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.2, cy - s * 0.18);
      ctx.lineTo(cx + s * 0.06, cy);
      ctx.lineTo(cx - s * 0.2, cy + s * 0.18);
      ctx.stroke();
    } else {
      // llm node: stacked text lines
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.24, cy - s * 0.14); ctx.lineTo(cx + s * 0.24, cy - s * 0.14);
      ctx.moveTo(cx - s * 0.24, cy + s * 0.02); ctx.lineTo(cx + s * 0.24, cy + s * 0.02);
      ctx.moveTo(cx - s * 0.24, cy + s * 0.18); ctx.lineTo(cx, cy + s * 0.18);
      ctx.stroke();
    }
  }

  function drawGraph() {
    ctx.clearRect(0, 0, w, h);
    if (canvasAlpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = canvasAlpha;
    drawGrid();

    ctx.lineWidth = 1.4;
    edges.forEach(e => {
      if (e.p <= 0.001) return;
      const p = linkPoints(e);
      ctx.strokeStyle = LINK;
      strokeLink(p, e.p);
      if (e.p > 0.98) {
        const tip = bezAt(p, 1), tail = bezAt(p, 0.85);
        const ang = Math.atan2(tip.y - tail.y, tip.x - tail.x), ah = 7;
        ctx.fillStyle = LINK; ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - ah * Math.cos(ang - 0.42), tip.y - ah * Math.sin(ang - 0.42));
        ctx.lineTo(tip.x - ah * Math.cos(ang + 0.42), tip.y - ah * Math.sin(ang + 0.42));
        ctx.closePath(); ctx.fill();
      }
    });

    nodes.forEach(n => {
      ctx.fillStyle = n.skin.fill; roundRect(n.x, n.y, n.w, n.h, n.w * 0.14); ctx.fill();
      ctx.strokeStyle = n.skin.stroke; ctx.lineWidth = 1; ctx.stroke();
      drawIcon(n.skin.icon, n.x + n.w / 2, n.y + n.h / 2, n.h * 0.5);
      const fs = Math.max(6, Math.round(n.h * 0.17));
      ctx.font = `${fs}px "Segoe UI", Inter, sans-serif`;
      ctx.textBaseline = 'middle';
      const inn = n.inLabels.length;
      n.inLabels.forEach((lab, i) => {
        const y = portY(n, i, inn);
        dot(n.x, y, PORT_IN);
        ctx.fillStyle = LABEL; ctx.textAlign = 'right'; ctx.fillText(lab, n.x - 6, y);
      });
      const on = n.outLabels.length;
      n.outLabels.forEach((lab, i) => {
        const y = portY(n, i, on);
        dot(n.x + n.w, y, PORT_OUT);
        ctx.fillStyle = LABEL; ctx.textAlign = 'left'; ctx.fillText(lab, n.x + n.w + 6, y);
      });
    });

    edges.forEach(e => {
      const p = linkPoints(e);
      if (e.p > 0.02 && e.p < 0.99) { const b = bezAt(p, e.p); pulseAt(b.x, b.y, 7); }
      else if (e.p > 0.99) { const b = bezAt(p, e.phase); pulseAt(b.x, b.y, 6); }
    });
    ctx.restore();
  }

  // ----- timeline -----
  function setPhase(p) {
    phase = p; phaseT = 0;
    if (p === 'graph') { build(); canvasAlpha = 0; winEl.classList.remove('show'); resetChat(); }
    else if (p === 'graphOut') { winEl.classList.add('show'); runChat(); }
    else if (p === 'chatOut') { winEl.classList.remove('show'); }
  }

  function update(dt) {
    phaseT += dt;
    if (phase === 'graph') {
      canvasAlpha = clamp(phaseT / 400, 0, 1);
      const t = Math.min(phaseT, GRAPH_BUILD);
      edges.forEach((e, i) => { const start = i * 220; e.p = t <= start ? 0 : Math.min(1, (t - start) / 320); });
      if (phaseT >= GRAPH_BUILD + GRAPH_HOLD) setPhase('graphOut');
    } else if (phase === 'graphOut') {
      canvasAlpha = clamp(1 - phaseT / GRAPH_OUT, 0, 1);
      if (phaseT >= GRAPH_OUT) setPhase('chat');
    } else if (phase === 'chat') {
      canvasAlpha = 0;
      edges.forEach(e => { e.phase = (e.phase + 0.00035 * dt) % 1; });
      if (phaseT >= CHAT) setPhase('chatOut');
    } else {
      canvasAlpha = clamp(phaseT / CHAT_OUT, 0, 1);
      if (phaseT >= CHAT_OUT) setPhase('graph');
    }
  }

  // ----- chat choreography -----
  function posInStage(el) {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }
  function moveCursor(x, y) { cursorEl.style.transform = `translate(${x}px, ${y}px)`; }
  function placeCursor(x, y) {
    cursorEl.style.transition = 'none';
    cursorEl.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(() => { cursorEl.style.transition = ''; });
  }
  function avatar(who) {
    const s = document.createElement('span'); s.className = 'agent-av';
    const a = agentByKey(who);
    s.textContent = a ? a.initials : '';
    return s;
  }
  function nameEl(who) {
    const d = document.createElement('div'); d.className = 'agent-name';
    const a = agentByKey(who);
    d.textContent = a ? a.name + ' · ' + a.role : '';
    return d;
  }
  function scrollMsgs() { messagesEl.scrollTop = messagesEl.scrollHeight; }
  function addMessage(who, text) {
    const wrap = document.createElement('div');
    wrap.className = 'agent-msg' + (who === 'user' ? ' agent-msg-user' : '');
    if (who !== 'user') wrap.appendChild(avatar(who));
    const col = document.createElement('div'); col.className = 'agent-col';
    if (who !== 'user') col.appendChild(nameEl(who));
    const bub = document.createElement('div'); bub.className = 'agent-bubble'; bub.textContent = text;
    col.appendChild(bub); wrap.appendChild(col);
    messagesEl.appendChild(wrap); scrollMsgs();
  }
  function typingBubble(who) {
    if (typingEl) typingEl.remove();
    const wrap = document.createElement('div'); wrap.className = 'agent-msg';
    wrap.appendChild(avatar(who));
    const col = document.createElement('div'); col.className = 'agent-col';
    col.appendChild(nameEl(who));
    const bub = document.createElement('div'); bub.className = 'agent-bubble';
    bub.innerHTML = '<span class="agent-typing"><span></span><span></span><span></span></span>';
    col.appendChild(bub); wrap.appendChild(col);
    messagesEl.appendChild(wrap); scrollMsgs();
    typingEl = wrap;
  }
  function clearTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }
  function highlight(who) {
    document.querySelectorAll('.agent-coworker').forEach(c => c.classList.toggle('active', c.dataset.cw === who));
  }
  function typeText(text, speed) {
    phEl.style.display = 'none';
    typedEl.textContent = '';
    let i = 0;
    if (typeTimer) clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      i++; typedEl.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(typeTimer); typeTimer = null; }
    }, speed || 24);
  }
  function clickCursor() {
    cursorEl.classList.add('click');
    setTimeout(() => cursorEl.classList.remove('click'), 180);
  }
  // Switch to a coworker: highlight it in the sidebar and swap to ITS own conversation.
  function selectAgent(key) {
    highlight(key);
    const a = agentByKey(key);
    titleEl.textContent = 'agent — ' + (a ? a.name : '');
    if (typingEl) { typingEl.remove(); typingEl = null; }
    messagesEl.querySelectorAll('.agent-msg').forEach(m => m.remove());
    hintEl.style.display = 'none';
    typedEl.textContent = '';
    phEl.style.display = '';
  }
  function resetChat() {
    timers.forEach(clearTimeout); timers = [];
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    typingEl = null;
    messagesEl.querySelectorAll('.agent-msg').forEach(m => m.remove());
    hintEl.style.display = '';
    typedEl.textContent = '';
    phEl.style.display = '';
    cursorEl.classList.remove('show', 'click');
    cursorEl.style.transition = 'none';
    cursorEl.style.transform = 'translate(0px, 0px)';
    highlight(null);
    titleEl.textContent = 'agent — scout';
  }
  function runChat() {
    resetChat();
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const s = stage.getBoundingClientRect();
    const pInput = posInStage(inputEl);
    const pSend = posInStage(sendEl);

    cursorEl.classList.add('show');
    placeCursor(s.width * 0.5, s.height - 2);

    // Visit every coworker in turn; each click opens a fresh conversation in the
    // sidebar selection, the request is typed, and the agent reports its own result.
    let t = 250;
    AGENTS.forEach(a => {
      const el = document.querySelector('.agent-coworker[data-cw="' + a.key + '"]');
      const pA = el ? posInStage(el) : pInput;

      at(t, () => moveCursor(pA.x + 62, pA.y + 14));
      at(t + 350, () => { clickCursor(); selectAgent(a.key); });
      at(t + 620, () => moveCursor(pInput.x + 26, pInput.y + 19));
      at(t + 900, () => typeText(a.ask, 12));

      const tSend = t + 900 + a.ask.length * 12 + 150;
      at(tSend, () => moveCursor(pSend.x + 16, pSend.y + 9));
      at(tSend + 320, () => {
        clickCursor(); sendEl.classList.add('click');
        setTimeout(() => sendEl.classList.remove('click'), 180);
        typedEl.textContent = '';
        phEl.style.display = '';
        addMessage('user', a.ask);
      });
      at(tSend + 800, () => typingBubble(a.key));
      at(tSend + 1700, () => { clearTyping(); addMessage(a.key, a.reply); });

      t = tSend + 1700 + 520;
    });

    at(t + 100, () => moveCursor(s.width * 0.5, s.height * 0.42));
  }

  // ----- loop & lifecycle -----
  function tick(ts) {
    const dt = Math.min((ts - last) || 0, 50);
    last = ts;
    update(dt);
    drawGraph();
    raf = requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (phase === 'graph') build(); }, 200);
  });

  setPhase('graph');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) start(); else stop(); });
    }, { threshold: 0.15 });
    io.observe(card);
  } else {
    start();
  }
})();
