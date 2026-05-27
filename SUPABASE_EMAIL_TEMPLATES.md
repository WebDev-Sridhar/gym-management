# Supabase Auth Email Templates — Gymmobius

Phase 4 (item 13) of [AUTH_ARCHITECTURE_AUDIT.md](AUTH_ARCHITECTURE_AUDIT.md):

> Update email templates so links match the originating surface.

The link routing is already correct in code — every `signUpWithEmail` /
`resendEmailVerification` / `resetPasswordForEmail` call passes a surface-
appropriate `emailRedirectTo` (e.g. `/auth/callback?gym=<slug>` for gym join
flows, plain `/auth/callback` for SaaS signup). What's left is the **email
body copy**, which lives in the Supabase Dashboard, not in this repo.

These are drop-in replacements. Paste each one into:

> **Supabase Dashboard → Authentication → Email Templates → {template name}**

The HTML body is rendered with Go templates. Anything in `{{ .Variable }}`
gets replaced server-side. Available variables (per template):

| Variable               | What it is                                                  |
| ---------------------- | ----------------------------------------------------------- |
| `{{ .ConfirmationURL }}` | The full link the user must click — includes token + redirect |
| `{{ .Email }}`           | The recipient's email address                               |
| `{{ .SiteURL }}`         | The project's Site URL (set in URL Configuration)          |
| `{{ .Token }}`           | The raw 6-digit OTP (for magic-link / OTP flows)           |
| `{{ .TokenHash }}`       | URL-safe hash form of the token                            |

**Why not per-gym branded emails?** The Supabase template body doesn't have
access to the gym name/logo/colors at render time — those live in our DB,
not in Supabase's `auth.users`. Branded per-gym emails would require a
[Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
that resolves the gym from `redirect_to` and renders via Resend. That's
Phase 5 scope; for Phase 4 we use one Gymmobius-branded template per type
that works for both SaaS owners and gym members.

---

## 1. Confirm Signup

**Subject:** `Confirm your Gymmobius account`

**Message body (HTML):**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <tr>
    <td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#0a0a0f;letter-spacing:-0.02em;">Gymmobius</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0a0a0f;line-height:1.3;">Confirm your email to get started</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
              We just need to verify that <strong style="color:#0a0a0f;">{{ .Email }}</strong> is really yours.
              Click the button below to activate your account.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;text-align:center;">
            <a href="{{ .ConfirmationURL }}"
               style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.25);">
              Confirm Email
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.5;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;line-height:1.5;">
              <a href="{{ .ConfirmationURL }}" style="color:#7c3aed;text-decoration:underline;">{{ .ConfirmationURL }}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
              If you didn't sign up for Gymmobius, you can safely ignore this email — no account will be created.
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa;line-height:1.5;">
              Gym members: this confirmation activates your access to your gym's portal.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 2. Reset Password

**Subject:** `Reset your Gymmobius password`

**Message body (HTML):**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <tr>
    <td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#0a0a0f;letter-spacing:-0.02em;">Gymmobius</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0a0a0f;line-height:1.3;">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
              We received a request to reset the password for <strong style="color:#0a0a0f;">{{ .Email }}</strong>.
              Click below to choose a new one — the link is valid for one hour.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;text-align:center;">
            <a href="{{ .ConfirmationURL }}"
               style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.25);">
              Reset Password
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.5;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;line-height:1.5;">
              <a href="{{ .ConfirmationURL }}" style="color:#7c3aed;text-decoration:underline;">{{ .ConfirmationURL }}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
              Didn't request a reset? You can safely ignore this email — your current password stays in place.
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa;line-height:1.5;">
              For security, this link can only be used once.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 3. Magic Link

> Not currently used by the app (we ship email/password + Google OAuth only).
> Included here so the template doesn't show the Supabase default if someone
> enables the magic-link provider later.

**Subject:** `Your Gymmobius sign-in link`

**Message body (HTML):**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <tr>
    <td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#0a0a0f;letter-spacing:-0.02em;">Gymmobius</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0a0a0f;line-height:1.3;">Your sign-in link</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
              Click below to sign in to Gymmobius as <strong style="color:#0a0a0f;">{{ .Email }}</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;text-align:center;">
            <a href="{{ .ConfirmationURL }}"
               style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.25);">
              Sign In
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">
              Didn't request this link? You can safely ignore this email.
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#a1a1aa;line-height:1.5;">
              For security, this link can only be used once and expires in one hour.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

---

## 4. Subject-line conventions

Keep them short, prefixed with the verb. Match the dashboard "Subject heading"
field for each template:

| Template          | Subject                              |
| ----------------- | ------------------------------------ |
| Confirm signup    | `Confirm your Gymmobius account`     |
| Magic link        | `Your Gymmobius sign-in link`        |
| Reset password    | `Reset your Gymmobius password`      |
| Change email      | `Confirm your new Gymmobius email`   |
| Invite user       | `You've been invited to Gymmobius`   |

---

## 5. Verification checklist

After pasting each template, send yourself a test email through the app:

1. **Confirm signup** — sign up at `/signup` (SaaS) and at `/{slug}/join` (gym).
   Both emails should look identical. Both confirmation links should resolve
   to `/auth/callback` (with `?gym=<slug>` on the tenant flow).
2. **Reset password** — trigger from `/login` and from `/{slug}/login`. Reset
   links should resolve to `/reset-password` (with `?gym=<slug>` on tenant).
3. Inbox preview: confirm the violet gradient button renders in Gmail / Outlook
   / iOS Mail. The fallback plain-text URL is included for clients that strip
   styled buttons.

---

## 6. Future: per-gym branded emails

For each gym to have their own brand (logo, primary color, gym name in the
subject), we'd need to:

1. Enable Supabase's [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
2. Add an Edge Function that:
   - Parses `redirect_to` from the payload to extract the gym slug
   - Looks up the gym row (name, logo_url, theme_color)
   - Renders the email via Resend (already configured) with gym branding
3. Fall back to the generic Gymmobius template above when no gym slug is present
   (SaaS owner flows)

Out of scope for Phase 4. Track as a follow-up if/when a gym owner asks for it.
