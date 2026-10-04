import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/motion/hero-webgl.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

async function setup({ hasContext = true, allowed = true } = {}) {
  const callbacks = new Map(), handlers = new Map(), observers = [];
  let id = 0, draws = 0, reads = 0, deleted = 0, attached = false;
  const classes = new Set();
  const gl = new Proxy({}, { get: (_, key) => {
    if (key === 'drawArrays') return () => { draws++; };
    if (key.startsWith('create') || key === 'getUniformLocation') return () => ({});
    if (key === 'getAttribLocation') return () => 0;
    if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
    if (key.startsWith('delete')) return () => { deleted++; };
    if (/^[A-Z_0-9]+$/.test(key)) return 1;
    return () => {};
  } });
  const target = {
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: name => handlers.delete(name),
  };
  const mount = {
    ...target, clientWidth: 1440, clientHeight: 900,
    getAttribute: () => '/uploads/test.png',
    appendChild: () => { attached = true; },
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    getBoundingClientRect: () => { reads++; return { left: 0, top: 0 }; },
  };
  const canvas = { ...target, getContext: () => hasContext ? gl : null, remove: () => { attached = false; } };
  const document = { ...target, hidden: false, querySelector: () => mount, createElement: () => canvas };
  const context = vm.createContext({
    exports: {}, require: name => name === './env' ? { allowHeavyMotion: () => allowed } : { heroFragmentShader: '' },
    Image: class { naturalWidth = 1536; naturalHeight = 1024; decode() { return Promise.resolve(); } },
    document, window: target, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
    performance: { now: () => 0 },
    requestAnimationFrame: fn => { callbacks.set(++id, fn); return id; },
    cancelAnimationFrame: key => callbacks.delete(key),
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    },
  });
  vm.runInContext(compiled, context);
  await context.exports.initHeroWebGL();
  return {
    document, canvas, classes,
    stats: () => ({ draws, reads, deleted, attached, pending: callbacks.size }),
    visible: value => observers[0].fn([{ isIntersecting: value }]),
    emit: (name, event = {}) => handlers.get(name)?.(event),
    frame: time => {
      const queued = [...callbacks.values()]; callbacks.clear();
      queued.forEach(fn => fn(time));
    },
  };
}

test('background draws at 30fps and schedules nothing outside the viewport', async () => {
  const page = await setup();
  assert.equal(page.stats().pending, 0);
  page.visible(true);
  for (let i = 0; i <= 60; i++) page.frame(i * 1000 / 60);
  assert.ok(page.stats().draws >= 29 && page.stats().draws <= 32);
  page.visible(false);
  assert.equal(page.stats().pending, 0);
  const draws = page.stats().draws;
  page.frame(2000);
  assert.equal(page.stats().draws, draws);
  page.visible(true);
  assert.equal(page.stats().pending, 1);
  assert.equal(page.canvas.width, 2160); // Original 1.5 DPR cap retained.
});

test('hidden tabs and back/forward cache suspend and resume the renderer', async () => {
  const page = await setup(); page.visible(true);
  page.document.hidden = true; page.emit('visibilitychange');
  assert.equal(page.stats().pending, 0);
  page.document.hidden = false; page.emit('visibilitychange');
  assert.equal(page.stats().pending, 1);
  page.emit('pagehide', { persisted: true });
  assert.equal(page.stats().pending, 0);
  assert.equal(page.stats().attached, true);
  page.emit('pageshow'); assert.equal(page.stats().pending, 1);
  page.emit('pagehide', { persisted: false });
  assert.equal(page.stats().pending, 0);
  assert.equal(page.stats().attached, false);
  assert.ok(page.stats().deleted >= 5);
});

test('pointer events are coalesced into one layout read per drawn frame', async () => {
  const page = await setup(); page.visible(true);
  for (let i = 0; i < 100; i++) page.emit('pointermove', { clientX: i, clientY: i });
  assert.equal(page.stats().reads, 0);
  page.frame(34);
  assert.equal(page.stats().reads, 1);
});

test('unsupported devices and context loss keep the CSS fallback', async () => {
  for (const options of [{ hasContext: false }, { allowed: false }]) {
    const page = await setup(options);
    assert.equal(page.stats().attached, false);
    assert.equal(page.stats().pending, 0);
    assert.equal(page.classes.has('hero-gl-ready'), false);
  }
  const page = await setup(); page.visible(true); page.emit('webglcontextlost');
  assert.equal(page.stats().attached, false);
  assert.equal(page.stats().pending, 0);
  assert.equal(page.classes.has('hero-gl-ready'), false);
});
