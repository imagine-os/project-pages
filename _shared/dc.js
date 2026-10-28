// Renders a design-canvas board (.dc.html) as a plain page: copies its <helmet> into <head>,
// runs the board's Component.renderVals() and expands {{value}}, <sc-for> and <sc-if> templates.
(function () {
  class DCLogic { constructor(props) { this.props = props; } }

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), scope);
  }
  function interp(str, scope) {
    return str.replace(/\{\{([^}]+)\}\}/g, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function rawOf(attr, scope) {
    const m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(attr || '');
    return m ? lookup(m[1], scope) : attr;
  }
  function expand(node, scope, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = rawOf(node.getAttribute('list'), scope) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((item, i) => node.childNodes.forEach(c => expand(c, Object.assign({}, scope, { [as]: item, $index: i }), out)));
      return;
    }
    if (tag === 'sc-if') {
      if (rawOf(node.getAttribute('value'), scope)) node.childNodes.forEach(c => expand(c, scope, out));
      return;
    }
    const el = node.namespaceURI === 'http://www.w3.org/2000/svg'
      ? document.createElementNS(node.namespaceURI, node.tagName) : document.createElement(node.tagName);
    for (const a of node.attributes) if (!a.name.startsWith('hint-')) el.setAttribute(a.name, interp(a.value, scope));
    const kids = [];
    node.childNodes.forEach(c => expand(c, scope, kids));
    kids.forEach(k => el.appendChild(k));
    out.push(el);
  }

  async function render(src) {
    const text = await (await fetch(src)).text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const root = doc.querySelector('x-dc');
    const helmet = root.querySelector('helmet');
    if (helmet) { helmet.childNodes.forEach(n => document.head.appendChild(document.importNode(n, true))); helmet.remove(); }
    const script = doc.querySelector('script[data-dc-script]');
    const meta = JSON.parse(script.getAttribute('data-props') || '{}');
    const props = {};
    for (const k in meta) if (k !== '$preview' && meta[k] && 'default' in meta[k]) props[k] = meta[k].default;
    const Component = new Function('DCLogic', script.textContent + '\nreturn Component;')(DCLogic);
    const vals = new Component(props).renderVals() || {};
    const nodes = [];
    root.childNodes.forEach(c => expand(c, Object.assign({}, props, vals), nodes));
    nodes.forEach(n => document.body.appendChild(n));
    document.title = doc.title;
    return meta.$preview || {};
  }
  window.renderDC = render;
})();
