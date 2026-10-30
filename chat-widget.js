(function () {
  var API_URL = "https://onlybulls-help-chat.ops-22b.workers.dev/";
  var FEEDBACK_URL = API_URL + "feedback";
  var TURNSTILE_SITE_KEY = "0x4AAAAAAFp9X745rus4_ZaT";
  var SUPPORT_EMAIL = "support@onlybulls.com";
  var STARTERS = ["How do I add money to my wallet?", "What are the swap fees?", "How do I contact support?"];
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICONS = {
    up: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
    down: "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17",
    send: "M12 19V5M5 12l7-7 7 7",
    close: "M18 6L6 18M6 6l12 12",
  };
  var history = [];
  var lastChatId = "";
  var turnstileToken = "";
  var turnstileFailed = false;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text) node.textContent = text;
    return node;
  }

  function icon(name, size) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size || 16);
    svg.setAttribute("height", size || 16);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  // Render **bold** and [label](url) without ever using innerHTML
  function renderInline(container, text) {
    text.split(/(\*\*[^*]+\*\*)/).forEach(function (part) {
      if (/^\*\*[^*]+\*\*$/.test(part)) container.appendChild(el("strong", {}, part.slice(2, -2)));
      else if (part) container.appendChild(document.createTextNode(part));
    });
  }

  function renderAnswer(container, text) {
    text = text.replace(/\\\$/g, "$");
    var re = /\[([^\]]+)\]\(([^)\s]+)\)/g, last = 0, m;
    while ((m = re.exec(text))) {
      renderInline(container, text.slice(last, m.index));
      var href = m[2];
      if (/^(\/(?!\/)|https:\/\/onlybulls\.com(\/|$)|mailto:support@onlybulls\.com$)/.test(href)) {
        container.appendChild(el("a", { href: href }, m[1]));
      } else {
        container.appendChild(document.createTextNode(m[1]));
      }
      last = re.lastIndex;
    }
    renderInline(container, text.slice(last));
  }

  function sendFeedback(id, type) {
    if (!id) return;
    fetch(FEEDBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, type: type }),
      keepalive: true,
    }).catch(function () {});
  }

  function addMessage(log, role, text) {
    var msg = el("div", { class: "ob-chat-msg ob-chat-" + role });
    if (role === "bot") renderAnswer(msg, text); else msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  function addTyping(log) {
    var msg = el("div", { class: "ob-chat-msg ob-chat-bot ob-chat-typing", "aria-label": "Thinking" });
    for (var i = 0; i < 3; i++) msg.appendChild(el("span"));
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  function addRating(log, id) {
    var row = el("div", { class: "ob-chat-rate" });
    var up = el("button", { type: "button", "aria-label": "Helpful" });
    var down = el("button", { type: "button", "aria-label": "Not helpful" });
    up.appendChild(icon("up", 14));
    down.appendChild(icon("down", 14));
    function pick(type, chosen) {
      sendFeedback(id, type);
      chosen.classList.add("ob-chat-picked");
      up.disabled = true; down.disabled = true;
    }
    up.addEventListener("click", function () { pick("up", up); });
    down.addEventListener("click", function () { pick("down", down); });
    row.appendChild(up); row.appendChild(down);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function mailHref(question) {
    var href = "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent("Help request");
    if (question) {
      href += "&body=" + encodeURIComponent("My question:\n" + question + "\n\nMy OnlyBulls account email:\n");
    }
    return href;
  }

  function build() {
    var toggle = el("button", { class: "ob-chat-toggle", "aria-label": "Ask a question", "aria-expanded": "false" });
    var toggleLabel = el("span", {}, "Ask AI");
    toggle.appendChild(toggleLabel);
    toggle.appendChild(icon("send", 16));

    var panel = el("div", { class: "ob-chat-panel", role: "dialog", "aria-label": "OnlyBulls help chat", hidden: "" });
    var head = el("div", { class: "ob-chat-head" });
    head.appendChild(el("span", { class: "ob-chat-title" }, "Ask OnlyBulls"));
    var person = el("a", { class: "ob-chat-person", href: mailHref("") }, "Talk to a person");
    person.addEventListener("click", function () { sendFeedback(lastChatId, "email"); });
    var close = el("button", { type: "button", class: "ob-chat-close", "aria-label": "Close chat" });
    close.appendChild(icon("close", 18));
    head.appendChild(person);
    head.appendChild(close);

    var log = el("div", { class: "ob-chat-log", "aria-live": "polite" });
    var tsBox = el("div", { class: "ob-chat-turnstile" });
    var form = el("form", { class: "ob-chat-form" });
    var input = el("input", { type: "text", maxlength: "500", placeholder: "Ask a question...", "aria-label": "Your question", autocomplete: "off" });
    var send = el("button", { type: "submit", class: "ob-chat-send", "aria-label": "Send" });
    send.appendChild(icon("send", 18));
    form.appendChild(input); form.appendChild(send);
    var foot = el("div", { class: "ob-chat-foot" }, "AI answers can be wrong and aren't financial advice. Questions are saved to improve help.");

    [head, log, tsBox, form, foot].forEach(function (n) { panel.appendChild(n); });
    document.body.appendChild(panel); document.body.appendChild(toggle);

    addMessage(log, "bot", "Hi! Ask me anything about using OnlyBulls.");
    var chips = el("div", { class: "ob-chat-chips" });
    STARTERS.forEach(function (q) {
      var chip = el("button", { type: "button", class: "ob-chat-chip" }, q);
      chip.addEventListener("click", function () { ask(q); });
      chips.appendChild(chip);
    });
    log.appendChild(chips);

    // Where Mintlify's own assistant is still on, sit beside its button; otherwise show a bottom bar.
    function placeToggle() {
      var native = document.querySelector(".chat-assistant-floating-input, #assistant-entry");
      toggle.classList.toggle("ob-chat-bar", !native);
      panel.classList.toggle("ob-chat-panel-bar", !native);
      renderLabel();
    }
    function renderLabel() {
      var open = !panel.hidden;
      toggleLabel.textContent = open ? "Close" : toggle.classList.contains("ob-chat-bar") ? "Ask a question..." : "Ask AI";
    }
    placeToggle();
    var tries = 0;
    var timer = setInterval(function () { placeToggle(); if (++tries > 10) clearInterval(timer); }, 500);

    var turnstileLoaded = false;
    function failTurnstile() {
      turnstileFailed = true;
      turnstileToken = "";
      addMessage(log, "bot", "The human check didn't load, so I can't answer right now. Use Talk to a person above and we'll help.");
    }
    function loadTurnstile() {
      if (turnstileLoaded) return;
      turnstileLoaded = true;
      var s = el("script", { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async: "", defer: "" });
      s.onload = function () {
        window.turnstile.render(tsBox, {
          sitekey: TURNSTILE_SITE_KEY,
          size: "flexible",
          appearance: "interaction-only",
          callback: function (t) { turnstileToken = t; tsBox.classList.remove("ob-chat-ts-show"); },
          "before-interactive-callback": function () { tsBox.classList.add("ob-chat-ts-show"); },
          "after-interactive-callback": function () { tsBox.classList.remove("ob-chat-ts-show"); },
          "expired-callback": function () { turnstileToken = ""; },
          "error-callback": function () { failTurnstile(); return true; },
        });
      };
      s.onerror = failTurnstile;
      document.head.appendChild(s);
    }

    function setOpen(open) {
      panel.hidden = !open;
      toggle.classList.toggle("ob-chat-open", open);
      renderLabel();
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { loadTurnstile(); input.focus(); } else { toggle.focus(); }
    }
    toggle.addEventListener("click", function () { setOpen(panel.hidden); });
    close.addEventListener("click", function () { setOpen(false); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });

    function ask(q) {
      q = q.trim();
      if (!q || send.disabled) return;
      if (turnstileFailed) { failTurnstile(); return; }
      if (!turnstileToken) { addMessage(log, "bot", "Verifying you're human. Try again in a moment."); return; }
      if (chips.parentNode) chips.parentNode.removeChild(chips);
      input.value = ""; send.disabled = true;
      person.href = mailHref(q);
      addMessage(log, "user", q);
      var pending = addTyping(log);
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: history, turnstileToken: turnstileToken }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (r) {
          pending.classList.remove("ob-chat-typing");
          pending.textContent = "";
          if (r.ok) {
            renderAnswer(pending, r.d.answer);
            lastChatId = r.d.id || "";
            if (lastChatId) addRating(log, lastChatId);
            history.push({ role: "user", content: q }, { role: "assistant", content: r.d.answer });
          } else {
            pending.textContent = r.d.error || "Something went wrong. Use Talk to a person above.";
          }
        })
        .catch(function () {
          pending.classList.remove("ob-chat-typing");
          pending.textContent = "Something went wrong. Use Talk to a person above.";
        })
        .then(function () {
          send.disabled = false; turnstileToken = "";
          if (window.turnstile) window.turnstile.reset(tsBox);
          log.scrollTop = log.scrollHeight;
        });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
