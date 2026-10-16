// Contact form: client-side validation, inline errors, submit to /api/contact.
// The server validates again; these rules mirror api/contact.js.
(function () {
  "use strict";

  var FALLBACK_EMAIL = "matthewfriedler@gmail.com";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("form-status");
  var success = document.getElementById("form-success");
  var button = form.querySelector('button[type="submit"]');
  var buttonLabel = button.textContent;
  var attempted = false;

  var rules = {
    name: function (v) {
      if (!v) return "Please enter your name.";
      if (v.length > 100) return "Please keep your name under 100 characters.";
      return "";
    },
    email: function (v) {
      if (!v) return "Please enter your email address.";
      if (v.length > 254 || !EMAIL_RE.test(v)) return "Please enter a valid email address.";
      return "";
    },
    message: function (v) {
      if (!v) return "Please enter a message.";
      if (v.length < 10) return "Please write at least 10 characters.";
      if (v.length > 5000) return "Please keep your message under 5,000 characters.";
      return "";
    },
  };

  function setError(name, msg) {
    var input = form.elements[name];
    var el = document.getElementById(name + "-error");
    el.textContent = msg;
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function validateField(name) {
    var msg = rules[name](form.elements[name].value.trim());
    setError(name, msg);
    return !msg;
  }

  function validateAll() {
    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
    });
    return firstInvalid;
  }

  // After the first submit attempt, re-check fields as the visitor fixes them.
  Object.keys(rules).forEach(function (name) {
    form.elements[name].addEventListener("input", function () {
      if (attempted) validateField(name);
    });
    form.elements[name].addEventListener("blur", function () {
      if (attempted) validateField(name);
    });
  });

  function showFailure(text) {
    status.className = "notice notice--error";
    status.innerHTML = "";
    var p = document.createElement("p");
    p.textContent = text + " You can email me directly at ";
    var a = document.createElement("a");
    a.href = "mailto:" + FALLBACK_EMAIL;
    a.className = "break-anywhere";
    a.textContent = FALLBACK_EMAIL;
    p.appendChild(a);
    p.appendChild(document.createTextNode("."));
    status.appendChild(p);
  }

  function setSending(sending) {
    button.disabled = sending;
    button.textContent = sending ? "Sending…" : buttonLabel;
    form.setAttribute("aria-busy", sending ? "true" : "false");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempted = true;
    status.className = "";
    status.textContent = "";

    var firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value,
    };

    setSending(true);
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          return { status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (res.status === 200 && res.data.ok) {
          form.hidden = true;
          success.hidden = false;
          success.focus();
          return;
        }
        if (res.status === 400 && res.data.fields) {
          var first = null;
          Object.keys(rules).forEach(function (name) {
            setError(name, res.data.fields[name] || "");
            if (res.data.fields[name] && !first) first = form.elements[name];
          });
          if (first) first.focus();
          return;
        }
        showFailure("Sorry, your message couldn’t be sent.");
      })
      .catch(function () {
        showFailure("Sorry, your message couldn’t be sent — the connection failed.");
      })
      .then(function () {
        setSending(false);
      });
  });
})();
