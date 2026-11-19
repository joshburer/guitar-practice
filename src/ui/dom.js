// Tiny DOM builders. h('div', { class: 'x', onclick }, child, ...) and s(...) for SVG.
const SVG_NS = 'http://www.w3.org/2000/svg';

function fill(el, props, kids) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'style') Object.assign(el.style, value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : String(kid));
  }
  return el;
}

export const h = (tag, props, ...kids) => fill(document.createElement(tag), props, kids);
export const s = (tag, props, ...kids) => fill(document.createElementNS(SVG_NS, tag), props, kids);
