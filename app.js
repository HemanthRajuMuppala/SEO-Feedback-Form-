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
      if (!el.checked && inputs.filter((item) => item.checked).length >= max) {
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

form.addEventListener("submit", (event) => {
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

  if (
    !payload.preferredDays.length &&
    !payload.fruits.length &&
    !payload.dryFruits.length &&
    !payload.diwaliHamper &&
    !payload.chooseMoreOften.length
  ) {
    errorEl.textContent = "Please tap at least one answer.";
    errorEl.classList.add("is-on");
    return;
  }

  saveResponse(payload);
  form.hidden = true;
  thanksEl.classList.add("is-on");
});
