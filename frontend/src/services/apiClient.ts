export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  options.credentials = "include"; // crucial for session cookies
  if (!(options.body instanceof FormData)) {
    options.headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };
  }

  const response = await fetch(path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/api/upload", {
    method: "POST",
    body: formData,
  });
}
