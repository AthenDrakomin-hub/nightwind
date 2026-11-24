/* 夜风 · Nightwind — 交互层
   1. 双语切换  2. 滚动缩放字标（signature move）  3. 区段入场
   4. 账本悬停预览  5. 实时活动读数（live thing） */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 双语 ---------- */
  var KEY = "nightwind-lang";
  var btn = document.getElementById("langBtn");

  function applyLang(lang) {
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    document.title = lang === "zh" ? "夜风 · Nightwind — 一个人的交付线" : "Nightwind · 夜风 — one line, one hand";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (!saved) {
    saved = (navigator.language || "zh").toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
  }
  applyLang(saved);

  if (btn) {
    btn.addEventListener("click", function () {
      applyLang(html.getAttribute("data-lang") === "zh" ? "en" : "zh");
    });
  }

  /* ---------- 2. 滚动缩放字标 ---------- */
  var word = document.getElementById("heroWord");
  var ticking = false;

  function onScroll() {
    if (ticking || !word) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var h = window.innerHeight || 1;
      var p = Math.min(1, y / h);          /* 首屏滚出比例 */
      if (!reduce) word.style.transform = "scale(" + (1 - p * 0.06).toFixed(4) + ")";
      ticking = false;
    });
  }
  if (!reduce) window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 3. 区段入场 ---------- */
  var targets = document.querySelectorAll(
    ".hero-line, .hero-cta, .pulse, .plate, .work h2, .ledger li, .ledger-foot, .method-copy h2, .method-copy p, .slip, .slip-group, .about-text, .crow, .foot-top, .foot-mail, .foot-meta"
  );
  var seq = 0;
  Array.prototype.forEach.call(targets, function (el) {
    el.classList.add("reveal");
    el.style.transitionDelay = (seq % 7) * 70 + "ms";
    seq++;
  });

  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add("in"); });
  }

  /* 首屏元素立即显示，避免观察器漏触发导致内容不可见 */
  window.setTimeout(function () {
    Array.prototype.forEach.call(targets, function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
    });
  }, 260);

  /* ---------- 4. 账本悬停预览 ---------- */
  var ledger = document.querySelector(".ledger");
  if (ledger && window.matchMedia("(hover: hover) and (min-width: 821px)").matches) {
    var box = document.createElement("div");
    box.className = "preview";
    var im = document.createElement("img");
    im.alt = "";
    box.appendChild(im);
    document.body.appendChild(box);

    ledger.addEventListener("mouseover", function (ev) {
      var a = ev.target.closest("a[data-img]");
      if (!a) return;
      im.src = a.getAttribute("data-img");
      var r = a.getBoundingClientRect();
      box.style.left = Math.min(window.innerWidth - 320, r.right + 64) + "px";
      box.style.top = Math.max(8, r.top - 24) + "px";
      box.classList.add("on");
    });
    ledger.addEventListener("mouseleave", function () { box.classList.remove("on"); });
    ledger.addEventListener("focusin", function (ev) {
      var a = ev.target.closest("a[data-img]");
      if (!a) return;
      im.src = a.getAttribute("data-img");
      var r = a.getBoundingClientRect();
      box.style.left = Math.min(window.innerWidth - 320, r.right + 64) + "px";
      box.style.top = Math.max(8, r.top - 24) + "px";
      box.classList.add("on");
    });
    ledger.addEventListener("focusout", function () { box.classList.remove("on"); });
  }

  /* ---------- 5. 实时活动（live thing） ---------- */
  var val = document.getElementById("pulseValue");
  var note = document.getElementById("pulseNote");
  var USER = "AthenDrakomin-hub";

  function setNote(zh, en) {
    if (!note) return;
    note.innerHTML = '<span class="zh">' + zh + '</span><span class="en">' + en + "</span>";
  }

  function ago(iso) {
    var ms = Date.now() - new Date(iso).getTime();
    var m = Math.round(ms / 60000);
    if (m < 60) return [m + " 分钟前", m + " min ago"];
    var h = Math.round(m / 60);
    if (h < 24) return [h + " 小时前", h + " h ago"];
    var d = Math.round(h / 24);
    return [d + " 天前", d + " d ago"];
  }

  if (val) {
    fetch("https://api.github.com/users/" + USER + "/events/public?per_page=100", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) throw new Error("empty");
        var week = list.filter(function (e) {
          return Date.now() - new Date(e.created_at).getTime() < 7 * 864e5;
        });
        var pushes = week.filter(function (e) { return e.type === "PushEvent"; });
        var commits = 0;
        pushes.forEach(function (e) {
          commits += (e.payload && e.payload.size) || 1;
        });
        val.textContent = commits + " 次提交";
        var a = ago(list[0].created_at);
        setNote("近七天 · 最近一次 " + a[0], "last 7 days · last push " + a[1]);
      })
      .catch(function () {
        val.textContent = "50+";
        setNote(" Fifty repositories moving in the dark");
      });
  }
})();
