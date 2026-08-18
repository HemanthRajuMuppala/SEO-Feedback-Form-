const STORE_KEY = "society-essentials-responses";

function loadResponses() {
  try {
    const rows = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveResponse(payload) {
  const rows = loadResponses();
  const row = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  rows.push(row);
  localStorage.setItem(STORE_KEY, JSON.stringify(rows, null, 2));
  return row;
}

function downloadResponses() {
  const blob = new Blob([JSON.stringify(loadResponses(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "responses.json";
  link.click();
  URL.revokeObjectURL(link.href);
}
