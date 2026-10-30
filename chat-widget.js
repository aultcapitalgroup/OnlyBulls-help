(function () {
  var API_URL = "https://onlybulls-help-chat.ops-22b.workers.dev/";
  var FEEDBACK_URL = API_URL + "feedback";
  var lastChatId = "";
  var TURNSTILE_SITE_KEY = "0x4AAAAAAFp9X745rus4_ZaT";
  var history = [];
  var turnstileToken = "";
  var turnstileFailed = false;

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

  function addRating(log, id) {
    var row = el("div", { class: "ob-chat-rate" });
    var up = el("button", { type: "button", "aria-label": "Helpful" }, "\u{1F44D}");
    var down = el("button", { type: "button", "aria-label": "Not helpful" }, "\u{1F44E}");
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
    foot.appendChild(document.createTextNode("AI answers can be wrong and aren't financial advice. Questions are saved to improve help. "));
    var mail = el("a", { class: "ob-chat-mail", href: "mailto:support@onlybulls.com?subject=" + encodeURIComponent("Help request") }, "Email support");
    foot.appendChild(mail);
    mail.addEventListener("click", function () { sendFeedback(lastChatId, "email"); });
    form.appendChild(input); form.appendChild(send);
    [head, log, tsBox, form, foot].forEach(function (n) { panel.appendChild(n); });
    document.body.appendChild(panel); document.body.appendChild(button);

    addMessage(log, "bot", "Hi! Ask me anything about using OnlyBulls.");

    var turnstileLoaded = false;
    function failTurnstile() {
      turnstileFailed = true;
      turnstileToken = "";
      addMessage(log, "bot", "The human check didn't load, so I can't answer right now. Use the Email support button below and we'll help.");
    }
    function loadTurnstile() {
      if (turnstileLoaded) return;
      turnstileLoaded = true;
      var s = el("script", { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async: "", defer: "" });
      s.onload = function () {
        window.turnstile.render(tsBox, {
          sitekey: TURNSTILE_SITE_KEY,
          size: "flexible",
          callback: function (t) { turnstileToken = t; },
          "expired-callback": function () { turnstileToken = ""; },
          "error-callback": function () { failTurnstile(); return true; },
        });
      };
      s.onerror = failTurnstile;
      document.head.appendChild(s);
    }

    button.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) { loadTurnstile(); input.focus(); }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      if (turnstileFailed) { failTurnstile(); return; }
      if (!turnstileToken) { addMessage(log, "bot", "Verifying you're human. Try again in a moment."); return; }
      input.value = ""; send.disabled = true;
      mail.href = "mailto:support@onlybulls.com?subject=" + encodeURIComponent("Help request") +
        "&body=" + encodeURIComponent("My question:\n" + q + "\n\nMy OnlyBulls account email:\n");
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
            lastChatId = r.d.id || "";
            if (lastChatId) addRating(log, lastChatId);
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
