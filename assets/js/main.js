/* Plumbing sites: site interactions */
(function () {
  "use strict";
  var d = document;

  /* ---- Sticky header shadow ---- */
  var header = d.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile nav ---- */
  var toggle = d.querySelector(".nav-toggle");
  var nav = d.querySelector(".nav");
  var backdrop = d.querySelector(".nav-backdrop");

  /* The menu hangs below the header; at the top of the page the family bar pushes the
     header down, so size the panel from the header's real bottom edge. */
  function fitNav() {
    if (nav && header) nav.style.setProperty("--nav-top", Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + "px");
  }
  function setNav(open) {
    if (!nav || !toggle) return;
    if (open) fitNav();
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (backdrop) backdrop.classList.toggle("show", open);
    /* Lock scroll on <html>, not <body>: locking body turns it into a nested
       scroll container and the viewport jump-clamps the scroll position when
       the menu opens (header + drawer flew offscreen on scrolled pages). */
    d.documentElement.style.overflow = open && window.innerWidth <= 1000 ? "hidden" : "";
    if (window.innerWidth <= 1000) {
      if (open) requestAnimationFrame(function () { var first = nav.querySelector("a,button"); if (first) first.focus(); });
      else if (nav.contains(d.activeElement)) toggle.focus();
    }
  }
  if (toggle) toggle.addEventListener("click", function () {
    setNav(!nav.classList.contains("open"));
  });
  if (backdrop) backdrop.addEventListener("click", function () { setNav(false); });

  d.querySelectorAll(".has-dropdown").forEach(function (dropdown) {
    var button = dropdown.querySelector("button.nav__link");
    function open(state) { dropdown.classList.toggle("open", state); button.setAttribute("aria-expanded", String(state)); }
    button.addEventListener("click", function () { open(!dropdown.classList.contains("open")); });
    dropdown.addEventListener("mouseenter", function () { if (innerWidth > 1000) open(true); });
    dropdown.addEventListener("mouseleave", function () { if (innerWidth > 1000 && !dropdown.contains(d.activeElement)) open(false); });
    dropdown.addEventListener("focusout", function (event) { if (!dropdown.contains(event.relatedTarget)) open(false); });
    dropdown.addEventListener("keydown", function (event) { if (event.key === "Escape" && dropdown.classList.contains("open")) { open(false); button.focus(); event.stopPropagation(); } });
  });
  d.addEventListener("keydown", function (event) { if (event.key === "Escape" && nav && nav.classList.contains("open")) { setNav(false); toggle.focus(); } });

  /* Close nav on link tap + on resize to desktop */
  d.querySelectorAll(".nav a:not(.has-dropdown > .nav__link)").forEach(function (a) {
    a.addEventListener("click", function () { setNav(false); });
  });
  window.addEventListener("resize", function () {
    if (nav && nav.classList.contains("open")) fitNav();
    if (window.innerWidth > 1000) {
      setNav(false);
      d.querySelectorAll(".has-dropdown").forEach(function (dd) {
        dd.classList.remove("open");
        var l = dd.querySelector(".nav__link");
        if (l) l.setAttribute("aria-expanded", "false");
      });
    }
  });

  /* FAQ motion and scroll reveal live in the template helpers below. */

  /* ---- Hide sticky mobile call bar while a quote form is on screen ---- */
  var mbar = d.querySelector(".mobile-bar");
  var qform = d.querySelector("form[data-quote-form]");
  if (mbar && qform && "IntersectionObserver" in window) {
    var mbio = new IntersectionObserver(function (entries) {
      mbar.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { threshold: 0.2 });
    mbio.observe(qform);
  }

  /* ---- Footer year ---- */
  d.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

})();

/* Template helpers: symptom shortcuts, service and area picks fill the quote form;
   FAQ answers slide open; sections below the fold fade up once. Nothing here submits. */
(function () {
  "use strict";
  var d = document;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var form = d.getElementById("quote");
  var lastPrefill = "";
  function field(name) { return form ? form.querySelector('[name="' + name + '"]') : null; }
  function clearInvalid(input) {
    if (!input) return;
    var holder = input.closest("[data-field]");
    if (holder) holder.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  }
  function setService(slug) {
    var select = field("service");
    if (!select) return;
    var known = Array.prototype.some.call(select.options, function (o) { return o.value === slug; });
    select.value = known ? slug : "";
  }
  function goTo(input) {
    if (!input) return;
    var header = d.querySelector(".site-header");
    var top = header ? header.getBoundingClientRect().bottom : 0;
    var box = input.getBoundingClientRect();
    var visible = box.top >= top + 8 && box.bottom <= window.innerHeight - 8;
    if (!visible) input.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setTimeout(function () {
      input.focus({ preventScroll: true });
      if (input.tagName === "TEXTAREA") { try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {} }
    }, visible || reduce ? 0 : 450);
  }
  function nameOrMessage() {
    var name = field("name");
    return name && name.value.trim() ? field("message") : name;
  }
  function toContact() { window.location.href = "/contact/#quote"; }

  var symptoms = d.querySelectorAll(".chip[data-msg]");
  symptoms.forEach(function (chip) {
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", function () {
      if (!form) return toContact();
      symptoms.forEach(function (other) { other.setAttribute("aria-pressed", String(other === chip)); });
      var message = field("message");
      var text = chip.getAttribute("data-msg") || "";
      if (message && (!message.value.trim() || message.value === lastPrefill)) { message.value = text; lastPrefill = text; }
      if (chip.hasAttribute("data-service")) setService(chip.getAttribute("data-service"));
      clearInvalid(message);
      goTo(message);
    });
  });
  d.querySelectorAll("[data-pick-service]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!form) return toContact();
      setService(button.getAttribute("data-pick-service"));
      goTo(nameOrMessage());
    });
  });
  d.querySelectorAll(".chip[data-city]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      if (!form) return toContact();
      var city = field("city");
      if (city) { city.value = chip.getAttribute("data-city"); clearInvalid(city); }
      goTo(nameOrMessage());
    });
  });

  /* FAQ: slide answers open and closed (native <details> without motion) */
  d.querySelectorAll(".faq__item").forEach(function (item) {
    var summary = item.querySelector("summary");
    var answer = item.querySelector(".faq__a");
    if (!summary || !answer || !item.animate) return;
    var run = null;
    summary.addEventListener("click", function (event) {
      if (reduce) return;
      event.preventDefault();
      /* Read the current (possibly mid-animation) height and fade before cancelling,
         so a quick second click reverses from where the panel is instead of jumping. */
      var startHeight = item.offsetHeight;
      var from = null;
      if (run) {
        var now = getComputedStyle(answer);
        from = { opacity: parseFloat(now.opacity), transform: now.transform };
        run.h.cancel(); run.f.cancel(); run = null;
      }
      var cs = getComputedStyle(item);
      var closedHeight = summary.offsetHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      var opening = !item.open || item.hasAttribute("data-closing");
      item.style.overflow = "hidden";
      if (opening) {
        item.removeAttribute("data-closing");
        item.open = true;
        var endHeight = item.offsetHeight;
        run = {
          h: item.animate({ height: [startHeight + "px", endHeight + "px"] }, { duration: 340, easing: "cubic-bezier(.2,.7,.2,1)" }),
          f: answer.animate([from || { opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: "ease-out" })
        };
        run.h.onfinish = function () { item.style.overflow = ""; run = null; };
      } else {
        item.setAttribute("data-closing", "1");
        run = {
          h: item.animate({ height: [startHeight + "px", closedHeight + "px"] }, { duration: 280, easing: "cubic-bezier(.4,0,.2,1)" }),
          f: answer.animate([from || { opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px)" }], { duration: 200, easing: "ease-in", fill: "forwards" })
        };
        run.h.onfinish = function () {
          item.open = false; item.removeAttribute("data-closing"); item.style.overflow = "";
          if (run) run.f.cancel();
          run = null;
        };
      }
    });
  });

  /* Fade-up on scroll, only for things that start below the fold, so the first screen is complete at rest. */
  if (!reduce && "IntersectionObserver" in window) {
    var groups = [".svc-grid > *", ".steps > li", ".photo-list > li", ".plan__list > li", ".faq > details", ".footer-grid > *"];
    var singles = [".alert__card", ".section-head > *", ".cta-band > *", ".areas-box .chips > li"];
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("in");
        reveal.unobserve(el);
        var delay = parseInt(el.style.getPropertyValue("--d"), 10) || 0;
        setTimeout(function () { el.classList.remove("rv", "in"); el.style.removeProperty("--d"); }, 900 + delay);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    var arm = function (el, delay) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("rv");
      if (delay) el.style.setProperty("--d", delay + "ms");
      reveal.observe(el);
    };
    groups.forEach(function (selector) {
      d.querySelectorAll(selector).forEach(function (el, index) {
        var columns = getComputedStyle(el.parentElement).gridTemplateColumns.split(" ").length || 1;
        arm(el, (index % columns) * 90);
      });
    });
    singles.forEach(function (selector) {
      d.querySelectorAll(selector).forEach(function (el, index) { arm(el, selector.indexOf("chips") > -1 ? index * 40 : 0); });
    });
  }
})();

/* Receipt-confirmed enquiries. Keep field IDs compatible with the intake workflow. */
(function () {
  "use strict";
  var d = document;
  // A live site posts to its own forms.<domain> intake. Previews and local servers use the shared intake.
  var sharedIntake = "https://bc-turf-agent-pilot.tien-228.workers.dev/intake/hvac-form";
  function intakeUrl(form) {
    var domain = String(form.dataset.domain || "").toLowerCase();
    return domain && location.hostname.toLowerCase().replace(/^www\./, "") === domain ? "https://forms." + domain + "/" : sharedIntake;
  }
  var forms = d.querySelectorAll("form[data-quote-form], form[data-enquiry-form]");
  function sourceUrl(path, search) {
    var url = new URL(path || window.location.pathname, window.location.origin);
    var query = new URLSearchParams(search === undefined ? window.location.search : search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"].forEach(function (key) {
      if (query.has(key)) url.searchParams.set(key, query.get(key).slice(0, 512));
    });
    return url.href;
  }


  function focusQuote() {
    if (window.location.hash !== "#quote") return;
    var form = d.getElementById("quote");
    if (!form) return;
    var header = d.querySelector(".site-header");
    form.style.scrollMarginTop = Math.max(24, (header ? header.getBoundingClientRect().bottom : 0) + 24) + "px";
    form.scrollIntoView({ block: "start", behavior: "instant" });
    var first = form.querySelector('input[name="name"]');
    if (first) first.focus({ preventScroll: true });
  }
  d.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    var destination = new URL(link.href, window.location.href);
    if (destination.origin === window.location.origin && destination.hash === "#quote") {
      var source = window.location.pathname === "/wasagabeachplumbingpros.ca/contact/" && forms[0] && forms[0].dataset.sourceUrl ? forms[0].dataset.sourceUrl : sourceUrl();
      var sourcePath = new URL(source).pathname;
      var slug = sourcePath.match(/^\/services\/([a-z0-9-]+)\/$/);
      try { sessionStorage.setItem("quote-context", JSON.stringify({ path: sourcePath, search: new URL(source).search, service: slug ? slug[1] : "", time: Date.now() })); } catch (_) {}
      forms.forEach(function (form) { form.dataset.sourceUrl = source; });
      if (d.getElementById("quote")) {
        event.preventDefault(); window.location.hash = "quote"; requestAnimationFrame(focusQuote);
      }
    }
  });
  window.addEventListener("hashchange", focusQuote);
  window.addEventListener("load", focusQuote, { once: true });
  if (window.location.hash === "#quote") requestAnimationFrame(focusQuote);

  forms.forEach(function (form) {
    if (form.dataset.leadSubmitBound === "true") return;
    var busy = false;
    var received = false;
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    var preferred = form.querySelector('[name="preferred_contact"]');
    try {
      var context = JSON.parse(sessionStorage.getItem("quote-context") || "null");
      if (window.location.pathname === "/wasagabeachplumbingpros.ca/contact/" && context && Date.now() - context.time < 3600000 && /^\/(?:services|blog|locations)\/[a-z0-9-]+\/$/.test(context.path)) {
        form.dataset.sourceUrl = sourceUrl(context.path, context.search || "");
        var serviceField = form.querySelector('[name="service"]');
        if (serviceField && Array.from(serviceField.options).some(function (o) { return o.value === context.service; })) serviceField.value = context.service;
      }
    } catch (_) {}
    function contactChoice() {
      var choice = preferred ? preferred.value : "email";
      ["email", "phone"].forEach(function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        if (!input) return;
        input.disabled = preferred ? name !== choice : false;
        if (preferred) input.required = name === choice;
        var field = input.closest("[data-contact-field]");
        if (field) { field.hidden = preferred ? name !== choice : false; field.classList.remove("invalid"); }
        input.removeAttribute("aria-invalid");
      });
    }
    if (preferred) preferred.addEventListener("change", contactChoice);
    contactChoice();

    function fieldFor(input) { return input.closest("[data-field], .field > div, .field, label"); }
    function validInput(input) {
      if (input.disabled) return true;
      var value = input.value.trim();
      if (input.type === "checkbox") return !input.required || input.checked;
      if (input.required && !value) return false;
      if (!value) return true;
      if (input.type === "email") return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && input.checkValidity();
      if (input.type === "tel") return /^[+()\d\s.\-]+$/.test(value) && value.replace(/\D/g, "").length >= 10 && value.replace(/\D/g, "").length <= 15;
      if (input.name === "postal") return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ][ -]?\d[ABCEGHJ-NPRSTVWXYZ]\d$/i.test(value);
      return input.checkValidity();
    }
    form.querySelectorAll("input, textarea, select").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = fieldFor(input);
        if (field) field.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
      });
    });
    function showStatus(ok, text) {
      if (!status) return;
      status.className = "form-status " + (ok ? "ok" : "err error");
      status.textContent = text;
    }
    function accepted(ack) {
      if (!ack || typeof ack !== "object" || Array.isArray(ack)) return false;
      var negative = ack.accepted === false || ack.success === false || ack.ok === false || ack.failed === true || ack.rejected === true || ack.receipt === "not_confirmed"
        || Boolean(ack.error) || (Array.isArray(ack.errors) ? ack.errors.length > 0 : Boolean(ack.errors))
        || /^(error|failed|failure|rejected|denied)$/i.test(String(ack.status || ""));
      return !negative && (ack.accepted === true || ack.success === true);
    }
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy || received) return;
      var firstInvalid = null;
      form.querySelectorAll("input, textarea, select").forEach(function (input) {
        if (input.disabled || input.name === "website") return;
        var ok = validInput(input);
        var field = fieldFor(input);
        if (field) field.classList.toggle("invalid", !ok);
        input.setAttribute("aria-invalid", String(!ok));
        if (!ok && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        showStatus(false, "Please check the highlighted details before sending your request.");
        var details = firstInvalid.closest("details");
        if (details) details.open = true;
        firstInvalid.focus();
        return;
      }
      var value = function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        return input && !input.disabled ? input.value.trim() : "";
      };
      if (value("website")) return;
      var now = new Date();
      var pad = function (x) { return String(x).padStart(2, "0"); };
      var stamp = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
      var message = value("message");
      var electrical = form.hasAttribute("data-enquiry-form");
      var service = value("service");
      var interest = form.querySelector('[name="service"] option:checked');
      if (service) message = "Project interest: " + (interest ? interest.textContent.trim() : service) + "\n" + message;
      var submittedChannel = value("preferred_contact") || "email";
      var payload = new URLSearchParams({
        "1.3": value("name"), "2": value("email"), "3": message, "4": value("phone"),
        "5.1": value("address"), "5.3": value("city"), "5.5": value("postal"),
        source_url: form.dataset.sourceUrl || sourceUrl(), date_created: stamp, preferred_contact: submittedChannel
      });
      if (service) payload.append("service", service);
      if (form.querySelector('[name="consent"]')) payload.append("consent", "contact_and_provider_assessment_agreed");
      if (electrical) { payload.append("source_domain", form.dataset.domain); payload.append("trade", "Electrical"); payload.append("service", service); }
      try { sessionStorage.removeItem("quote-confirmation"); } catch (_) {}
      busy = true;
      if (button) button.disabled = true;
      form.setAttribute("aria-busy", "true");
      showStatus(true, "Sending your request. Please wait for receipt confirmation.");
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 90000);
      try {
        var response = await fetch(intakeUrl(form), {
          method: "POST", mode: "cors", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: payload.toString(), signal: controller.signal
        });
        if (!response.ok) throw new Error("Receipt unconfirmed");
        var ack = await response.json();
        if (!accepted(ack)) throw new Error("Receipt unconfirmed");
        received = true;
        form.dataset.receiptConfirmed = "true";
        showStatus(true, "Thank you. Your request has been received for review. Coverage, availability and any appointment require separate confirmation. " + (submittedChannel === "phone" ? "Watch for a phone call using the number you provided." : "Check the email address you provided for follow-up."));
        var confirmationStored = false;
        try { sessionStorage.removeItem("quote-context"); sessionStorage.setItem("quote-confirmation", JSON.stringify({ channel: submittedChannel, time: Date.now() })); confirmationStored = true; } catch (_) {}
        if (confirmationStored && form.dataset.redirectOnSuccess) window.location.href = form.dataset.redirectOnSuccess;
      } catch (error) {
        showStatus(false, "We could not confirm receipt. Your request may already have reached intake. Your details are still here. Email contact@" + (form.dataset.domain || window.location.hostname) + " to confirm before sending again.");
      } finally {
        clearTimeout(timer);
        busy = false;
        form.removeAttribute("aria-busy");
        if (button) button.disabled = received;
        if (status) status.focus({ preventScroll: true });
      }
    });
    form.dataset.leadSubmitBound = "true";
    if (button) button.disabled = false;
    var fallback = form.querySelector("[data-form-fallback]");
    if (fallback) fallback.hidden = true;
  });
})();
