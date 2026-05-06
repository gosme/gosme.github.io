const GITHUB_API_BASE = "https://api.github.com";
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, env),
      });
    }

    if (url.pathname !== "/track") {
      return jsonResponse({ error: "Not found" }, 404, request, env);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, request, env);
    }

    if (!isAllowedRequest(request, env)) {
      return jsonResponse({ error: "Forbidden" }, 403, request, env);
    }

    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }

    const ip = getClientIp(request);
    if (!ip) {
      return jsonResponse({ error: "Unable to determine client IP" }, 400, request, env);
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const dateKey = timestamp.slice(0, 10);
    const path = typeof requestBody.path === "string" && requestBody.path.trim()
      ? requestBody.path.trim().slice(0, 256)
      : "/";
    const userAgent = (request.headers.get("User-Agent") || "").slice(0, 512);

    const logEntry = JSON.stringify({
      timestamp,
      ip,
      path,
      userAgent,
    }) + "\n";

    const logPath = `logs/${dateKey}.jsonl`;
    const summaryPath = "summary/visitor-count.json";
    const commitMessage = `track visit: ${timestamp}`;

    await appendToFile(env, logPath, logEntry, commitMessage);

    const count = await updateSummaryCount(env, summaryPath, timestamp, commitMessage);

    return jsonResponse({ count }, 200, request, env);
  },
};

function isAllowedRequest(request, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || "";
  const allowedRefererPrefix = env.ALLOWED_REFERER_PREFIX || "";
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";

  if (!allowedOrigin || !origin || origin !== allowedOrigin) {
    return false;
  }

  if (!allowedRefererPrefix || !referer || !referer.startsWith(allowedRefererPrefix)) {
    return false;
  }

  return true;
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    ""
  );
}

async function appendToFile(env, path, entry, commitMessage) {
  await updateFileWithRetry(env, path, commitMessage, (currentText) => `${currentText}${entry}`);
}

async function updateSummaryCount(env, path, timestamp, commitMessage) {
  let updatedCount = 0;

  await updateFileWithRetry(env, path, commitMessage, (currentText) => {
    const current = safeParseJson(currentText, {
      count: 0,
      updatedAt: null,
    });

    updatedCount = Number(current.count || 0) + 1;

    return JSON.stringify(
      {
        count: updatedCount,
        updatedAt: timestamp,
      },
      null,
      2
    ) + "\n";
  });

  return updatedCount;
}

async function updateFileWithRetry(env, path, commitMessage, transformFn) {
  const attempts = 3;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const existing = await getRepoFile(env, path);
    const nextContent = transformFn(existing.content);
    const putResponse = await putRepoFile(
      env,
      path,
      nextContent,
      commitMessage,
      existing.sha
    );

    if (putResponse.ok) {
      return;
    }

    if (attempt === attempts - 1 || !isRetryableGitHubStatus(putResponse.status)) {
      const errorText = await putResponse.text();
      throw new Error(`GitHub write failed for ${path}: ${putResponse.status} ${errorText}`);
    }
  }
}

function isRetryableGitHubStatus(status) {
  return status === 409 || status === 422;
}

async function getRepoFile(env, path) {
  const response = await fetch(githubContentUrl(env, path), {
    method: "GET",
    headers: githubHeaders(env),
  });

  if (response.status === 404) {
    return { content: "", sha: null };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub read failed for ${path}: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const content = decodeBase64ToText(payload.content || "");

  return {
    content,
    sha: payload.sha,
  };
}

async function putRepoFile(env, path, content, message, sha) {
  const body = {
    message,
    content: encodeTextToBase64(content),
    branch: env.GITHUB_REPO_BRANCH || "main",
  };

  if (sha) {
    body.sha = sha;
  }

  return fetch(githubContentUrl(env, path), {
    method: "PUT",
    headers: githubHeaders(env),
    body: JSON.stringify(body),
  });
}

function githubContentUrl(env, path) {
  return `${GITHUB_API_BASE}/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${path}`;
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_PAT}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...JSON_HEADERS,
  };
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = origin && origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN || "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(payload, status, request, env) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...buildCorsHeaders(request, env),
      "Cache-Control": "no-store",
    },
  });
}

function safeParseJson(text, fallbackValue) {
  try {
    return JSON.parse(text);
  } catch {
    return fallbackValue;
  }
}

function encodeTextToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64ToText(base64Content) {
  const normalized = base64Content.replace(/\n/g, "");
  if (!normalized) {
    return "";
  }

  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
