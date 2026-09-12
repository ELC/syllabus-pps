import { FormEvent, useState } from "react";

import { createBrowserClient } from "./client";
import { isMissingConfig, readSupabaseConfig } from "./config";
import { LoginScreen } from "./LoginScreen";
import { readBrowserSiteRoot } from "./siteRoot";

function signInRedirectTo(): string {
  // Must match Supabase Auth redirect allow list (see README). Uses the current origin so
  // dev on :4322+ works when localhost:**/** is allowed; otherwise Supabase uses Site URL.
  const siteRoot = readBrowserSiteRoot();
  return new URL(siteRoot, window.location.origin).href;
}

function otpFailureFeedback(error: { code?: string; status?: number }): {
  kind: "error" | "notice";
  text: string;
} {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return {
      kind: "error",
      text: "Too many login emails were sent. Wait about an hour, then try again, or check your inbox for an earlier link.",
    };
  }

  return {
    kind: "notice",
    text: "If your account is pre-approved, you will receive a link shortly.",
  };
}

export function LoginForm() {
  const configResult = readSupabaseConfig();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (isMissingConfig(configResult)) {
    return (
      <LoginScreen>
        <h1 className="login-title">Configuration required</h1>
        <p className="login-error" role="alert">
          {configResult.message}
        </p>
      </LoginScreen>
    );
  }

  const { url, anonKey } = configResult;

  async function sendLink(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setMessage("");

    const client = createBrowserClient({ url, anonKey });
    const { error: otpError } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: signInRedirectTo(),
      },
    });

    setBusy(false);
    if (otpError) {
      const feedback = otpFailureFeedback(otpError);
      if (feedback.kind === "error") {
        setError(feedback.text);
      } else {
        setNotice(feedback.text);
      }
      return;
    }

    setLinkSent(true);
    setMessage("Check your inbox and click the link to log in.");
  }

  return (
    <LoginScreen>
      <h1 className="login-title">Log in</h1>
      <p className="login-lead">
        Only pre-approved users can log in. Enter your email and we will send you a one-time link.
      </p>

      {!linkSent ? (
        <form className="login-form" onSubmit={(event) => void sendLink(event)}>
          <label className="login-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="login-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <button className="login-button" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send link"}
          </button>
        </form>
      ) : (
        <div className="login-form">
          <p className="login-notice login-notice-success" role="status">
            {message}
          </p>
          <button
            className="login-link-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setLinkSent(false);
              setMessage("");
              setNotice("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </div>
      )}

      {!linkSent && notice ? (
        <p className="login-notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="login-help">
        <span className="login-help-label">Didn&apos;t receive an email?</span> Contact the administrator if
        no link arrives within a few minutes.
      </p>

      <p className="login-disclaimer">
        This system does not store passwords or other personal information beyond your email address and name.
      </p>
    </LoginScreen>
  );
}
