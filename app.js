const form = document.getElementById("survey-form");
const errorEl = document.getElementById("form-error");
const thanksEl = document.getElementById("thanks");
const submitBtn = document.getElementById("submit-btn");

function selectedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
}

function bindLimit(name, max, countId) {
  const inputs = [...form.querySelectorAll(`input[name="${name}"]`)];
  const countEl = document.getElementById(countId);

  function refresh() {
    const checked = inputs.filter((el) => el.checked);
    if (countEl) countEl.textContent = `${checked.length} of ${max} selected`;
    inputs.forEach((el) => {
      el.closest(".pill").classList.toggle("is-locked", checked.length >= max && !el.checked);
    });
  }

  inputs.forEach((el) => {
    el.addEventListener("click", (event) => {
      const checked = inputs.filter((item) => item.checked);
      if (!el.checked && checked.length >= max) {
        event.preventDefault();
      }
    });
    el.addEventListener("change", refresh);
  });

  refresh();
}

function bindOther(name, inputId) {
  const other = form.querySelector(`input[name="${name}"][value="Other"], input[name="${name}"][value="Something else"]`);
  const field = document.getElementById(inputId);
  if (!other || !field) return;
  other.addEventListener("change", () => {
    field.classList.toggle("is-open", other.checked);
    if (other.checked) field.focus();
    else field.value = "";
  });
}

bindLimit("fruits", 5, "fruit-count");
bindLimit("chooseMoreOften", 2, "reason-count");
bindOther("fruits", "fruits-other");
bindOther("dryFruits", "dry-fruits-other");
bindOther("chooseMoreOften", "reason-other");

function apiUrl(path) {
  const onSurveyServer = location.protocol === "http:" && location.port === "3000";
  return onSurveyServer ? path : "http://localhost:3000" + path;
}

async function readJson(res) {
  const text = await res.text();
  if (!text) {
    throw new Error("Could not reach the survey server. Run node server.js and open http://localhost:3000");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Could not reach the survey server. Run node server.js and open http://localhost:3000");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.classList.remove("is-on");
  errorEl.textContent = "";

  const payload = {
    preferredDays: selectedValues("days"),
    fruits: selectedValues("fruits"),
    fruitsOther: document.getElementById("fruits-other").value.trim(),
    dryFruits: selectedValues("dryFruits"),
    dryFruitsOther: document.getElementById("dry-fruits-other").value.trim(),
    diwaliHamper: (form.querySelector('input[name="hamper"]:checked') || {}).value || "",
    chooseMoreOften: selectedValues("chooseMoreOften"),
    chooseMoreOftenOther: document.getElementById("reason-other").value.trim(),
  };

  submitBtn.disabled = true;
  try {
    const res = await fetch(apiUrl("/api/feedback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Could not save your feedback.");
    form.hidden = true;
    thanksEl.classList.add("is-on");
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add("is-on");
    submitBtn.disabled = false;
  }
});
