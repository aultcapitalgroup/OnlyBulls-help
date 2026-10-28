(function () {
  var API_URL = "https://onlybulls-help-chat.ops-22b.workers.dev/";
  var TURNSTILE_SITE_KEY = "0x4AAAAAAFp9X745rus4_ZaT";
  var history = [];
  var turnstileToken = "";

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text) node.textContent = text;
    return node;
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
      var href = m[2].charAt(0) === "/" ? "/help" + m[2] : m[2];
      if (/^(\/|https:\/\/onlybulls\.com|mailto:support@onlybulls\.com)/.test(href)) {
        container.appendChild(el("a", { href: href }, m[1]));
      } else {
        container.appendChild(document.createTextNode(m[1]));
      }
      last = re.lastIndex;
    }
    renderInline(container, text.slice(last));
  }

  function addMessage(log, role, text) {
    var msg = el("div", { class: "ob-chat-msg ob-chat-" + role });
    if (role === "bot") renderAnswer(msg, text); else msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  function build() {
    var button = el("button", { class: "ob-chat-toggle", "aria-label": "Ask a question" }, "Ask AI");
    var panel = el("div", { class: "ob-chat-panel", hidden: "" });
    var head = el("div", { class: "ob-chat-head" });
    head.appendChild(el("span", {}, "OnlyBulls help"));
    head.appendChild(el("span", { class: "ob-chat-badge" }, "AI"));
    var log = el("div", { class: "ob-chat-log", "aria-live": "polite" });
    var form = el("form", { class: "ob-chat-form" });
    var input = el("input", { type: "text", maxlength: "500", placeholder: "Ask a question...", "aria-label": "Your question" });
    var send = el("button", { type: "submit" }, "Send");
    var tsBox = el("div", { class: "ob-chat-turnstile" });
    var foot = el("div", { class: "ob-chat-foot" });
    foot.appendChild(document.createTextNode("AI answers can be wrong. "));
    foot.appendChild(el("a", { href: "/help/contact-support" }, "Contact support"));
    form.appendChild(input); form.appendChild(send);
    [head, log, tsBox, form, foot].forEach(function (n) { panel.appendChild(n); });
    document.body.appendChild(panel); document.body.appendChild(button);

    addMessage(log, "bot", "Hi! Ask me anything about using OnlyBulls.");

    button.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) input.focus();
    });

    var s = el("script", { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async: "", defer: "" });
    s.onload = function () {
      window.turnstile.render(tsBox, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "flexible",
        callback: function (t) { turnstileToken = t; },
        "expired-callback": function () { turnstileToken = ""; },
      });
    };
    document.head.appendChild(s);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      if (!turnstileToken) { addMessage(log, "bot", "Verifying you're human. Try again in a moment."); return; }
      input.value = ""; send.disabled = true;
      addMessage(log, "user", q);
      var pending = addMessage(log, "bot", "Thinking...");
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: history, turnstileToken: turnstileToken }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (r) {
          pending.textContent = "";
          if (r.ok) {
            renderAnswer(pending, r.d.answer);
            history.push({ role: "user", content: q }, { role: "assistant", content: r.d.answer });
          } else {
            pending.textContent = r.d.error || "Something went wrong. Contact support.";
          }
        })
        .catch(function () { pending.textContent = "Something went wrong. Contact support."; })
        .then(function () {
          send.disabled = false; turnstileToken = "";
          if (window.turnstile) window.turnstile.reset(tsBox);
        });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
