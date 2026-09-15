import { FormEvent, useEffect, useState } from "react";

import { readOAuthCallbackError, signInRedirectTo } from "./authRedirect";
import { createBrowserClient } from "./client";
import { isMissingConfig, readSupabaseConfig } from "./config";
import { LoginScreen } from "./LoginScreen";

function otpFailureFeedback(error: { code?: string; status?: number }): {
  kind: "error" | "notice";
  text: string;
} {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return {
      kind: "error",
      text: "Too many login emails were sent. Wait about an hour, then try again, check your inbox for an earlier link, or sign in with Google.",
    };
  }

  return {
    kind: "notice",
    text: "If your account is pre-approved, you will receive a link shortly.",
  };
}

function MagicLinkIcon() {
  return (
    <svg className="login__auth-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="login__auth-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm() {
  const configResult = readSupabaseConfig();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const oauthError = readOAuthCallbackError();
    if (oauthError) {
      setError(oauthError);
    }
  }, []);

  if (isMissingConfig(configResult)) {
    return (
      <LoginScreen>
        <h1 className="login__title">Configuration required</h1>
        <p className="login__error" role="alert">
          {configResult.message}
        </p>
      </LoginScreen>
    );
  }

  const { url, anonKey } = configResult;
  const authBusy = busy || oauthBusy;

  async function signInWithGoogle(): Promise<void> {
    setOauthBusy(true);
    setError("");
    setNotice("");

    const client = createBrowserClient({ url, anonKey });
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: signInRedirectTo(),
        scopes: "https://www.googleapis.com/auth/userinfo.email",
      },
    });

    if (oauthError) {
      setOauthBusy(false);
      setError("Could not start Google sign-in. Try again or use the email link instead.");
    }
  }

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
      <h1 className="login__title">Log in</h1>
      <p className="login__lead">
        Only pre-approved users can log in. Continue with Google or request a magic link.
      </p>

      {!linkSent ? (
        <>
          <button
            className="login__auth-button login__auth-button--google"
            type="button"
            disabled={authBusy}
            onClick={() => void signInWithGoogle()}
          >
            <GoogleIcon />
            {oauthBusy ? "Redirecting…" : "Sign in with Google"}
          </button>

          {!showMagicLinkForm ? (
            <button
              className="login__auth-button login__auth-button--magic-link"
              type="button"
              disabled={authBusy}
              onClick={() => setShowMagicLinkForm(true)}
            >
              <MagicLinkIcon />
              Sign in with Magic Link
            </button>
          ) : (
            <>
              <p className="login__divider" aria-hidden="true">
                <span>or</span>
              </p>

              <form className="login__form" onSubmit={(event) => void sendLink(event)}>
                <label className="login__label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  className="login__input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={authBusy}
                />
                <button className="login__button" type="submit" disabled={authBusy}>
                  {busy ? "Sending…" : "Send link"}
                </button>
              </form>
            </>
          )}
        </>
      ) : (
        <div className="login__form">
          <p className="login__notice login__notice--success" role="status">
            {message}
          </p>
          <button
            className="login__link-button"
            type="button"
            disabled={authBusy}
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
        <p className="login__notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="login__error" role="alert">
          {error}
        </p>
      ) : null}

      {showMagicLinkForm || linkSent ? (
        <p className="login__help">
          <span className="login__help-label">Didn&apos;t receive an email?</span> Contact the administrator if
          no link arrives within a few minutes, or sign in with Google instead.
        </p>
      ) : null}

      <p className="login__disclaimer">
        This system does not store passwords. We keep your email address and name from your Google profile or
        magic-link sign-in.
      </p>
    </LoginScreen>
  );
}
