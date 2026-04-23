import { useEffect, useMemo, useState } from "react";

type UserInfo = {
  sub: string;
  email: string;
  name?: string;
};

const API_BASE = "http://localhost:3000";
const CLIENT_SECRET_STORAGE_KEY = "todo_client_secret";

function CallbackPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const code = params.get("code");
  const state = params.get("state");
  const [clientSecret, setClientSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const savedClientSecret = localStorage.getItem(CLIENT_SECRET_STORAGE_KEY);
    if (savedClientSecret) {
      setClientSecret(savedClientSecret);
    }
  }, []);

  function saveClientSecret() {
    if (!clientSecret) {
      setError("Enter client secret before saving");
      return;
    }
    localStorage.setItem(CLIENT_SECRET_STORAGE_KEY, clientSecret);
    setError("");
    setNotice("Client secret saved in browser storage");
  }

  async function exchangeCode() {
    if (!code || !clientSecret) {
      setError("Code and client secret are required");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const tokenRes = await fetch(`${API_BASE}/o/tokeninfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, client_secret: clientSecret }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson?.data?.access_token) {
        throw new Error(tokenJson?.message ?? "Token exchange failed");
      }

      const token = tokenJson.data.access_token as string;
      setAccessToken(token);

      const userRes = await fetch(`${API_BASE}/o/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userJson = await userRes.json();
      if (!userRes.ok || !userJson?.data?.sub) {
        throw new Error(userJson?.message ?? "Failed to fetch user info");
      }

      const signedInUser = userJson.data as UserInfo;
      setUserInfo(signedInUser);
      localStorage.setItem("todo_access_token", token);
      localStorage.setItem("todo_user_info", JSON.stringify(signedInUser));
      setNotice("Success. Redirecting to homepage...");
      window.setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error happened";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing">
      <section className="callback-card">
        <h1>Callback</h1>
        <p className="subtitle">
          This page proves true sign-in only after token exchange and userinfo.
        </p>
        <p>
          <strong>code:</strong> {code ?? "missing"}
        </p>
        <p>
          <strong>state:</strong> {state ?? "none"}
        </p>
        <label className="input-label" htmlFor="client-secret">
          Client Secret
        </label>
        <input
          id="client-secret"
          className="input"
          value={clientSecret}
          onChange={(e) => {
            setClientSecret(e.target.value);
            setNotice("");
          }}
          placeholder="Paste client_secret here"
        />
        <button type="button" className="secondary" onClick={saveClientSecret}>
          Save client secret for next time
        </button>
        <button
          type="button"
          className="primary"
          onClick={exchangeCode}
          disabled={loading}
        >
          {loading ? "Processing..." : "Exchange code and verify user"}
        </button>

        {accessToken ? (
          <p className="ok">
            Access token received: {accessToken.slice(0, 20)}...
          </p>
        ) : null}
        {userInfo ? (
          <p className="ok">
            Signed in as {userInfo.name ?? userInfo.email} ({userInfo.sub})
          </p>
        ) : null}
        {userInfo ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go to Home
          </button>
        ) : null}
        {notice ? <p className="note">{notice}</p> : null}
        {error ? <p className="err">{error}</p> : null}
      </section>
    </main>
  );
}

function LandingPage() {
  return (
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">Simple. Secure. Personal.</p>
        <h1>Todo App</h1>
        <p className="subtitle">
          Organize your day with a clean checklist experience powered by OIDC
          sign-in.
        </p>
        <div className="actions">
          <button type="button" className="primary">
            Get Started
          </button>
          <button type="button" className="secondary">
            Learn More
          </button>
        </div>
      </section>

      <section className="steps">
        <h2>How it works</h2>
        <div className="step-grid">
          <article className="step-card">
            <h3>1. Sign in</h3>
            <p>Login with your account through the OIDC provider.</p>
          </article>
          <article className="step-card">
            <h3>2. Plan tasks</h3>
            <p>Create your to-do list for work, study, or personal goals.</p>
          </article>
          <article className="step-card">
            <h3>3. Stay focused</h3>
            <p>Track completion and keep your day organized.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

function App() {
  if (window.location.pathname === "/callback") {
    return <CallbackPage />;
  }

  return <LandingPage />;
}

export default App;
