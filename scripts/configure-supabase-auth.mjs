/**
 * One-time Auth config via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   node scripts/configure-supabase-auth.mjs
 */

const projectRef = "velpssdaienuuqymutdy";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN to a personal access token from the Supabase dashboard.");
  process.exit(1);
}

const redirectUrls = [
  "http://localhost:**/**",
  "http://127.0.0.1:**/**",
  "https://elc.github.io/syllabus-pps/**",
].join(",");

const body = {
  site_url: "https://elc.github.io/syllabus-pps/",
  uri_allow_list: redirectUrls,
  external_email_enabled: true,
  hook_before_user_created_enabled: true,
  hook_before_user_created_uri: "pg-functions://postgres/public/hook_restrict_signup_by_allowed_email",
};

const skipTemplate = process.argv.includes("--skip-template");
const magicLinkTemplate = `<h2>Your sign-in code</h2>
<p>Enter this code: {{ .Token }}</p>`;

if (!skipTemplate) {
  body.mailer_templates_magic_link_content = magicLinkTemplate;
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  const needsTemplateSkip =
    response.status === 400 && text.includes("Email template modification is not available");
  if (needsTemplateSkip && !skipTemplate) {
    console.warn("Email template update blocked on free tier with default SMTP. Retrying without template…");
    const retry = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site_url: body.site_url,
        uri_allow_list: body.uri_allow_list,
        external_email_enabled: body.external_email_enabled,
        hook_before_user_created_enabled: body.hook_before_user_created_enabled,
        hook_before_user_created_uri: body.hook_before_user_created_uri,
      }),
    });
    const retryText = await retry.text();
    if (!retry.ok) {
      console.error(`Auth config update failed (${retry.status}):\n${retryText}`);
      process.exit(1);
    }
    console.log("Supabase Auth configured (hook + URLs). Email template skipped — see README.");
    console.log(JSON.stringify(JSON.parse(retryText), null, 2));
    process.exit(0);
  }
  console.error(`Auth config update failed (${response.status}):\n${text}`);
  process.exit(1);
}

console.log("Supabase Auth configured:");
console.log(JSON.stringify(JSON.parse(text), null, 2));
