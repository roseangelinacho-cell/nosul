const API_BASE = "/api";

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "API 요청이 실패했습니다.");
  }
  return response.json();
}

export async function saveLog(entry) {
  const response = await fetch(`${API_BASE}/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });
  return handleResponse(response);
}

export async function fetchSummary() {
  const response = await fetch(`${API_BASE}/summary`);
  return handleResponse(response);
}
