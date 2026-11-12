// Editing mode: draw, move and reshape the details of an image.

import { t } from './i18n.js';
import { confirmDialog, h, iconButton, iconPath, popupMenu, s, toast } from './ui.js';
import { getDocument, saveDocument } from './store.js';
import { isComplete, newDetail } from './model.js';
import { SHAPE_ELLIPSE, SHAPE_POLYGON, SHAPE_RECTANGLE, bounds, clamp, constrainedPoints, shapePath } from './shapes.js';
import { applyMetadata, editDetailDialog, ensureUnlocked, exportDialog, metadataDialog } from './dialogs.js';

// Sizes in CSS pixels, whatever the scale of the image.
const HANDLE_RADIUS = 7;
const MIDPOINT_RADIUS = 5;
const HIT_RADIUS = 18;
const MIDPOINT_HIT_RADIUS = 12;
const MIN_EDGE_FOR_MIDPOINT = 44;
const TAP_SLOP = 6;
const DOUBLE_TAP_MS = 400;
const DOUBLE_TAP_DISTANCE = 24;
const SAVE_DELAY_MS = 300;

export async function mountEditor(root, { id, navigate }) {
  const record = await getDocument(id);
  if (!record) {
    throw new Error(t('notFound'));
  }
  const { doc } = record;
  if (!await ensureUnlocked(doc)) {
    navigate(`#/play/${id}`);
    return { destroy() {} };
  }

  const { width, height } = doc.image;
  const imageUrl = URL.createObjectURL(record.image);
  const state = { selected: null, creating: false };
  let drag = null;
  let pointerStart = null;
  let lastTap = null;
  let saveTimer = null;

  const layer = s('g', {});
  const stage = s('svg', { class: 'stage', viewBox: `0 0 ${width} ${height}` },
    s('image', { href: imageUrl, width, height, class: 'stage-image' }), layer);
  const toolbar = h('header', { className: 'toolbar' });
  const hint = h('p', { className: 'hint' });
  const view = h('div', { className: 'editor' }, toolbar, h('div', { className: 'stage-wrap' }, stage), hint);

  const current = () => doc.details.find((detail) => detail.tag === state.selected) || null;

  // --- Persistence -------------------------------------------------------

  async function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      // Unfinished polygons are never stored.
      await saveDocument({ ...doc, details: doc.details.filter(isComplete) });
    } catch (error) {
      toast(t('saveFailed', error.message), 'error');
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY_MS);
  }

  // --- Rendering ---------------------------------------------------------

  /** Size of one CSS pixel in image units. */
  function unit() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return 1;
    }
    return 1 / Math.min(rect.width / width, rect.height / height);
  }

  function handle(point, index, kind, u) {
    const mid = kind === 'mid';
    return [
      s('circle', {
        cx: point[0],
        cy: point[1],
        r: (mid ? MIDPOINT_RADIUS : HANDLE_RADIUS) * u,
        class: mid ? 'ed-handle ed-handle-mid' : 'ed-handle',
      }),
      s('circle', {
        cx: point[0],
        cy: point[1],
        r: (mid ? MIDPOINT_HIT_RADIUS : HIT_RADIUS) * u,
        class: 'ed-hit',
        [`data-${kind}`]: index,
      }),
    ];
  }

  function draw() {
    const u = unit();
    const shapes = [];
    const front = [];
    const locks = [];
    for (const detail of doc.details) {
      const selected = detail.tag === state.selected;
      if (detail.points.length >= 2) {
        const classes = ['ed-detail'];
        if (selected) {
          classes.push('is-selected');
        }
        if (detail.locked) {
          classes.push('is-locked');
        }
        if (detail.hidden) {
          classes.push('is-hidden');
        }
        const path = s('path', { d: shapePath(detail), class: classes.join(' '), 'data-tag': detail.tag });
        (selected ? front : shapes).push(path);
      }
      if (detail.locked && isComplete(detail)) {
        const box = bounds(detail.points);
        locks.push(s('g', {
          class: 'ed-lock',
          transform: `translate(${box.x + box.w / 2} ${box.y + box.h / 2}) scale(${u * 1.5}) translate(-12 -12)`,
        }, s('path', { d: iconPath('lock') })));
      }
    }

    const handles = [];
    const detail = current();
    if (detail && !detail.locked) {
      const points = detail.points;
      if (detail.shape === SHAPE_POLYGON && !state.creating && points.length >= 3) {
        // Virtual points in the middle of long edges, to insert new vertices.
        points.forEach((point, index) => {
          const next = points[(index + 1) % points.length];
          if (Math.hypot(next[0] - point[0], next[1] - point[1]) / u > MIN_EDGE_FOR_MIDPOINT) {
            handles.push(...handle([(point[0] + next[0]) / 2, (point[1] + next[1]) / 2], index, 'mid', u));
          }
        });
      }
      points.forEach((point, index) => handles.push(...handle(point, index, 'handle', u)));
    }
    layer.replaceChildren(...shapes, ...front, ...locks, ...handles);
  }

  function renderToolbar() {
    const detail = current();
    const drawing = state.creating;
    toolbar.classList.toggle('is-creating', drawing);
    hint.textContent = drawing ? t('polygonHint') : t('editorHint');

    const title = doc.title || t('untitled');
    const right = [];
    if (!drawing) {
      const add = iconButton('plus', t('addDetail'), () => popupMenu(add, [
        { icon: 'rectangle', label: t('rectangle'), onSelect: () => addDetail(SHAPE_RECTANGLE) },
        { icon: 'ellipse', label: t('ellipse'), onSelect: () => addDetail(SHAPE_ELLIPSE) },
        { icon: 'polygon', label: t('polygon'), onSelect: () => addDetail(SHAPE_POLYGON) },
      ]));
      right.push(add);
    }
    if (drawing && detail && detail.points.length) {
      right.push(iconButton('undo', t('undoPoint'), undoPoint));
    }
    if (detail && !detail.locked) {
      right.push(iconButton('trash', t('deleteDetail'), deleteSelected));
    }
    if (drawing) {
      right.push(iconButton('check', t('finishPolygon'), finishCreation, { text: t('ok') }));
    } else {
      if (detail) {
        right.push(iconButton('pencil', t('editDetail'), editSelected));
      }
      right.push(iconButton('export', t('exportDoc'), async () => {
        await save();
        exportDialog(doc, record.image);
      }));
      right.push(iconButton('play', t('play'), () => navigate(`#/play/${id}`)));
    }

    toolbar.replaceChildren(
      iconButton('back', t('collection'), () => navigate('#/'), { text: t('collection') }),
      h('button', {
        type: 'button',
        className: 'toolbar-title',
        title: t('metadata'),
        disabled: drawing,
        on: { click: editMetadata },
      }, title),
      h('div', { className: 'toolbar-group' }, right),
    );
    document.title = `${title} – ${t('appName')}`;
  }

  function update() {
    draw();
    renderToolbar();
  }

  // --- Actions -----------------------------------------------------------

  function addDetail(shape) {
    const detail = newDetail(doc, shape);
    doc.details.push(detail);
    state.selected = detail.tag;
    state.creating = shape === SHAPE_POLYGON;
    if (!state.creating) {
      scheduleSave();
    }
    update();
  }

  function finishCreation() {
    const detail = current();
    state.creating = false;
    if (detail && !isComplete(detail)) {
      doc.details.splice(doc.details.indexOf(detail), 1);
      state.selected = null;
    }
    scheduleSave();
    update();
  }

  function undoPoint() {
    const detail = current();
    if (state.creating && detail) {
      detail.points.pop();
      update();
    }
  }

  async function deleteSelected() {
    const detail = current();
    if (!detail || detail.locked) {
      return;
    }
    // An empty polygon being drawn is discarded without asking.
    if (detail.points.length && !await confirmDialog(t('confirmDeleteDetail'), { danger: true })) {
      return;
    }
    state.creating = false;
    doc.details.splice(doc.details.indexOf(detail), 1);
    state.selected = null;
    scheduleSave();
    update();
  }

  async function editSelected() {
    const detail = current();
    if (!detail || state.creating) {
      return;
    }
    const changes = await editDetailDialog(detail);
    if (changes) {
      Object.assign(detail, changes);
      scheduleSave();
      update();
    }
  }

  async function editMetadata() {
    const changes = await metadataDialog(doc);
    if (changes) {
      applyMetadata(doc, changes);
      scheduleSave();
      update();
    }
  }

  function removeVertex(detail, index) {
    if (detail.shape === SHAPE_POLYGON && !detail.locked && detail.points.length > 3) {
      detail.points.splice(index, 1);
      scheduleSave();
      update();
    }
  }

  // --- Pointer interactions ----------------------------------------------

  function toImage(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(stage.getScreenCTM().inverse());
    return { x: point.x, y: point.y };
  }

  function inImage(point) {
    return [clamp(point.x, 0, width), clamp(point.y, 0, height)];
  }

  function startHandleDrag(detail, index) {
    if (detail.shape === SHAPE_POLYGON) {
      return { type: 'vertex', index };
    }
    // Constrained shapes are resized from the point opposite to the handle.
    // Ellipse handles (top, right, bottom, left) only move along one axis.
    const axis = detail.shape === SHAPE_RECTANGLE ? 'both' : index % 2 === 0 ? 'y' : 'x';
    return { type: 'box', axis, anchor: detail.points[(index + 2) % 4], box: bounds(detail.points) };
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    const target = event.target;
    const point = toImage(event);
    const handleIndex = target.dataset.handle;
    const midIndex = target.dataset.mid;
    const tag = target.dataset.tag;
    pointerStart = { x: event.clientX, y: event.clientY, moved: false, handle: null, tag: null };
    stage.setPointerCapture(event.pointerId);
    drag = null;

    let detail = current();
    if (state.creating && detail) {
      if (handleIndex !== undefined) {
        drag = { type: 'vertex', index: Number(handleIndex) };
      } else {
        detail.points.push(inImage(point));
        drag = { type: 'vertex', index: detail.points.length - 1 };
      }
    } else if (detail && !detail.locked && handleIndex !== undefined) {
      pointerStart.handle = Number(handleIndex);
      drag = startHandleDrag(detail, Number(handleIndex));
    } else if (detail && !detail.locked && midIndex !== undefined) {
      const index = Number(midIndex) + 1;
      detail.points.splice(index, 0, inImage(point));
      drag = { type: 'vertex', index, changed: true };
    } else if (tag !== undefined) {
      state.selected = Number(tag);
      pointerStart.tag = state.selected;
      detail = current();
      if (detail && !detail.locked) {
        drag = { type: 'move', last: point };
      }
    } else {
      state.selected = null;
    }
    update();
  }

  function onPointerMove(event) {
    if (!pointerStart) {
      return;
    }
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > TAP_SLOP) {
      pointerStart.moved = true;
    }
    const detail = current();
    if (!drag || !detail || (!pointerStart.moved && !state.creating)) {
      return;
    }
    const point = toImage(event);
    if (drag.type === 'vertex') {
      detail.points[drag.index] = inImage(point);
    } else if (drag.type === 'box') {
      const [px, py] = inImage(point);
      const box = { ...drag.box };
      if (drag.axis !== 'y') {
        box.x = Math.min(drag.anchor[0], px);
        box.w = Math.max(Math.abs(px - drag.anchor[0]), 1);
      }
      if (drag.axis !== 'x') {
        box.y = Math.min(drag.anchor[1], py);
        box.h = Math.max(Math.abs(py - drag.anchor[1]), 1);
      }
      detail.points = constrainedPoints(detail.shape, box);
    } else {
      // Move the whole detail, keeping it inside the image.
      const box = bounds(detail.points);
      const dx = clamp(point.x - drag.last.x, -box.x, width - box.x - box.w);
      const dy = clamp(point.y - drag.last.y, -box.y, height - box.y - box.h);
      detail.points = detail.points.map(([x, y]) => [x + dx, y + dy]);
      drag.last = { x: drag.last.x + dx, y: drag.last.y + dy };
    }
    drag.changed = true;
    draw();
  }

  function onPointerUp(event) {
    if (!pointerStart) {
      return;
    }
    const start = pointerStart;
    const changed = drag && drag.changed;
    pointerStart = null;
    drag = null;
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    if (state.creating) {
      update();
      return;
    }
    if (changed) {
      scheduleSave();
    }
    if (start.moved || event.type === 'pointercancel') {
      lastTap = null;
      update();
      return;
    }
    // Double click / double tap, detected here to behave the same with touch.
    const tap = { time: event.timeStamp, x: event.clientX, y: event.clientY, handle: start.handle, tag: start.tag };
    const double = lastTap
      && tap.time - lastTap.time < DOUBLE_TAP_MS
      && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < DOUBLE_TAP_DISTANCE;
    lastTap = double ? null : tap;
    const detail = current();
    if (double && detail) {
      if (tap.handle !== null) {
        removeVertex(detail, tap.handle);
        return;
      }
      editSelected();
    }
    update();
  }

  function onKeyDown(event) {
    if (document.querySelector('dialog[open]') || /^(?:INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) {
      return;
    }
    const detail = current();
    if (event.key === 'Escape') {
      if (state.creating) {
        finishCreation();
      } else if (detail) {
        state.selected = null;
        update();
      }
    } else if (event.key === 'Enter' && detail && event.target === document.body) {
      event.preventDefault();
      if (state.creating) {
        finishCreation();
      } else {
        editSelected();
      }
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && detail) {
      event.preventDefault();
      if (state.creating) {
        undoPoint();
      } else {
        deleteSelected();
      }
    } else if (event.key.startsWith('Arrow') && detail && !detail.locked && !state.creating) {
      event.preventDefault();
      const step = (event.shiftKey ? 10 : 1) * unit();
      const box = bounds(detail.points);
      const dx = { ArrowLeft: -step, ArrowRight: step }[event.key] || 0;
      const dy = { ArrowUp: -step, ArrowDown: step }[event.key] || 0;
      const moveX = clamp(dx, -box.x, width - box.x - box.w);
      const moveY = clamp(dy, -box.y, height - box.y - box.h);
      detail.points = detail.points.map(([x, y]) => [x + moveX, y + moveY]);
      scheduleSave();
      draw();
    }
  }

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('keydown', onKeyDown);
  // Handles keep a constant size on screen: redraw when the stage is resized.
  const resizeObserver = new ResizeObserver(draw);
  resizeObserver.observe(stage);

  root.append(view);
  update();

  return {
    async destroy() {
      document.removeEventListener('keydown', onKeyDown);
      resizeObserver.disconnect();
      doc.details = doc.details.filter(isComplete);
      await save();
      view.remove();
      URL.revokeObjectURL(imageUrl);
    },
  };
}
