const form = document.querySelector("#registration-form");
const registrationView = document.querySelector("[data-registration-view]");
const successView = document.querySelector("[data-success-view]");
const announcement = document.querySelector("#form-announcement");
const submitButton = document.querySelector("[data-submit-button]");
const termsInput = document.querySelector("#terms");
const passwordInput = document.querySelector("#password");
const confirmInput = document.querySelector("#confirm-password");
const strengthMeter = document.querySelector(".strength-meter");
const strengthOutput = document.querySelector("#password-strength");
const fieldGroups = new Map(
  [...document.querySelectorAll("[data-field-group]")].map((group) => [
    group.dataset.fieldGroup,
    group,
  ]),
);

const fieldInputs = {
  callsign: document.querySelector("#callsign"),
  email: document.querySelector("#email"),
  password: passwordInput,
  confirm: confirmInput,
};

const checkedFields = new Set();
let submitAttempted = false;
let submitting = false;
let provisioned = false;

const errorMessages = {
  callsign: {
    required: "Enter a callsign",
    tooShort: "Use at least 3 characters",
    tooLong: "Use 20 characters or fewer",
    badCharacter: "Use letters, numbers, _ or - only",
  },
  email: {
    required: "Enter your email",
    malformed: "Enter a valid email, like you@example.com",
  },
  password: {
    required: "Enter a password",
    tooShort: "Use at least 8 characters",
  },
  confirm: {
    required: "Confirm your password",
    mismatch: "Passwords don't match",
  },
};

const progressCodes = {
  required: "Missing",
  tooShort: "Too short",
  tooLong: "Too long",
  badCharacter: "Bad character",
  malformed: "Malformed",
  mismatch: "Mismatch",
};

function getErrorCode(name) {
  const input = fieldInputs[name];
  const value = name === "password" || name === "confirm"
    ? input.value
    : input.value.trim();

  if (!value) {
    return "required";
  }

  if (name === "callsign") {
    if (value.length < 3) {
      return "tooShort";
    }
    if (value.length > 20) {
      return "tooLong";
    }
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return "badCharacter";
    }
  }

  if (name === "email" && !input.validity.valid) {
    return "malformed";
  }

  if (name === "password" && value.length < 8) {
    return "tooShort";
  }

  if (name === "confirm" && value !== passwordInput.value) {
    return "mismatch";
  }

  return "";
}

function isFieldValid(name) {
  return getErrorCode(name) === "";
}

function renderField(name) {
  const group = fieldGroups.get(name);
  const input = fieldInputs[name];
  const error = group.querySelector(".field-error");
  const validIcon = group.querySelector(".valid-icon");
  const isChecked = checkedFields.has(name);
  const errorCode = isChecked ? getErrorCode(name) : "";

  group.dataset.state = !isChecked ? "idle" : errorCode ? "invalid" : "valid";
  input.setAttribute("aria-invalid", errorCode ? "true" : "false");
  error.textContent = errorCode ? errorMessages[name][errorCode] : "";
  error.hidden = !errorCode;
  validIcon.hidden = !isChecked || Boolean(errorCode);
}

function getPasswordStrength(value) {
  if (!value) {
    return { score: 0, label: "" };
  }
  if (value.length < 8) {
    return { score: 1, label: "Weak" };
  }

  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  score = Math.min(score, 4);
  return { score, label: labels[score] };
}

function renderPasswordStrength() {
  const { score, label } = getPasswordStrength(passwordInput.value);
  const strength = label.toLowerCase();

  strengthMeter.dataset.strength = strength || "empty";
  strengthOutput.textContent = label;
  strengthOutput.dataset.strength = strength;
}

function getStatus(name) {
  if (provisioned) {
    return { state: "locked", label: "Locked" };
  }

  if (name === "terms") {
    if (!termsInput.checked) {
      return {
        state: submitAttempted ? "invalid" : "idle",
        label: "Required",
      };
    }
    return { state: "valid", label: "OK" };
  }

  if (!checkedFields.has(name)) {
    return { state: "idle", label: "Pending" };
  }

  const errorCode = getErrorCode(name);
  return errorCode
    ? { state: "invalid", label: progressCodes[errorCode] }
    : { state: "valid", label: "OK" };
}

function updateProgress() {
  const validCount = Object.keys(fieldInputs).filter(isFieldValid).length
    + Number(termsInput.checked);

  document.querySelectorAll("[data-ready-count]").forEach((count) => {
    count.textContent = String(provisioned ? 5 : validCount);
  });

  document.querySelectorAll("[data-overall-status]").forEach((status) => {
    status.textContent = provisioned ? "Provisioned" : "Ready";
  });

  document.querySelectorAll(".readout-heading strong, .mobile-ready").forEach((status) => {
    status.classList.toggle("is-complete", !provisioned && validCount === 5);
    status.classList.toggle("is-provisioned", provisioned);
  });

  document.querySelectorAll("[data-callsign]").forEach((readout) => {
    readout.textContent = isFieldValid("callsign")
      ? fieldInputs.callsign.value.trim()
      : "Unassigned";
  });

  document.querySelectorAll("[data-progress-row]").forEach((row) => {
    const name = row.dataset.progressRow;
    const status = getStatus(name);
    row.dataset.state = status.state;
    row.querySelector("[data-progress-status]").textContent = status.label;
  });
}

function renderAll() {
  for (const name of Object.keys(fieldInputs)) {
    renderField(name);
  }
  renderPasswordStrength();
  updateProgress();
}

for (const [name, input] of Object.entries(fieldInputs)) {
  input.addEventListener("blur", () => {
    if (input.value.trim() || submitAttempted) {
      checkedFields.add(name);
      renderField(name);
    }
    updateProgress();
  });

  input.addEventListener("input", () => {
    if (checkedFields.has(name) || submitAttempted) {
      checkedFields.add(name);
      renderField(name);
    }

    if (name === "password") {
      renderPasswordStrength();
      if (checkedFields.has("confirm") || submitAttempted) {
        checkedFields.add("confirm");
        renderField("confirm");
      }
    }

    updateProgress();
  });
}

termsInput.addEventListener("change", () => {
  const group = fieldGroups.get("terms");
  const error = group.querySelector(".field-error");
  const invalid = submitAttempted && !termsInput.checked;

  group.dataset.state = invalid ? "invalid" : termsInput.checked ? "valid" : "idle";
  termsInput.setAttribute("aria-invalid", invalid ? "true" : "false");
  error.hidden = !invalid;
  error.textContent = invalid ? "Accept the terms to continue" : "";
  updateProgress();
});

document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const input = document.getElementById(toggle.dataset.passwordToggle);
    const showing = input.type === "password";

    input.type = showing ? "text" : "password";
    toggle.setAttribute("aria-label", showing ? "Hide password" : "Show password");
    toggle.querySelector("img").src = showing
      ? "./assets/images/icon-eye-off.svg"
      : "./assets/images/icon-eye.svg";
    input.focus();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (submitting || provisioned) return;

  submitAttempted = true;
  for (const name of Object.keys(fieldInputs)) {
    checkedFields.add(name);
  }
  renderAll();

  const invalidNames = Object.keys(fieldInputs).filter((name) => !isFieldValid(name));
  const termsInvalid = !termsInput.checked;

  if (termsInvalid) {
    const group = fieldGroups.get("terms");
    const error = group.querySelector(".field-error");
    group.dataset.state = "invalid";
    termsInput.setAttribute("aria-invalid", "true");
    error.textContent = "Accept the terms to continue";
    error.hidden = false;
  }

  const invalidCount = invalidNames.length + Number(termsInvalid);
  if (invalidCount > 0) {
    announcement.textContent = `${invalidCount} ${invalidCount === 1 ? "field needs" : "fields need"} attention`;
    const firstInvalid = invalidNames.length
      ? fieldInputs[invalidNames[0]]
      : termsInput;
    firstInvalid.focus();
    return;
  }

  submitting = true;
  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    const input = document.getElementById(toggle.dataset.passwordToggle);
    input.type = "password";
    toggle.setAttribute("aria-label", "Show password");
    toggle.querySelector("img").src = "./assets/images/icon-eye.svg";
  });

  form.querySelectorAll("input, button").forEach((control) => {
    control.disabled = true;
  });
  submitButton.textContent = "Transmitting_";
  submitButton.setAttribute("aria-busy", "true");
  announcement.textContent = "Registration valid. Transmitting.";

  window.setTimeout(() => {
    provisioned = true;
    submitting = false;
    const callsign = fieldInputs.callsign.value.trim();
    document.querySelector("[data-success-callsign]").textContent = callsign;
    registrationView.hidden = true;
    successView.hidden = false;
    renderAll();
    document.querySelector("#success-title").focus();
  }, 900);
});

document.querySelector("[data-continue]").addEventListener("click", () => {
  document.querySelector("[data-success-note]").textContent =
    "A separate login flow is not included in this demo.";
});

renderAll();