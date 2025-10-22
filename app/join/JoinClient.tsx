
"use client";

import { useState } from "react";

type Mode = "email" | "phone";

async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isNepalE164(v: string) {
  return /^\+977\d{9,10}$/.test(v);
}

export default function JoinClient() {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const clear = () => { setMsg(null); setErr(null); };

  async function sendEmail() {
    clear();
    if (!isEmail(email)) { setErr("Enter a valid email."); return; }
    setSending(true);
    const { ok, data } = await postJSON("/api/otp/email/send", {
      email,
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/onboard?src=join" : undefined
    });
    setSending(false);
    if (!ok) { setErr(data?.message || data?.error || "Failed to send email OTP."); return; }
    setMsg("Check your email for a 6-digit code or magic link.");
    setSent(true);
  }

  async function verifyEmail() {
    clear();
    if (!isEmail(email) || !emailCode) { setErr("Enter email and the 6-digit code."); return; }
    setVerifying(true);
    const { ok, data } = await postJSON("/api/otp/email/verify", { email, token: emailCode });
    setVerifying(false);
    if (!ok) { setErr(data?.message || data?.error || "Email code invalid."); return; }
    setMsg("Email verified. Redirecting...");
    window.location.href = "/onboard?src=join";
  }

  async function sendPhone() {
    clear();
    if (!isNepalE164(phone)) { setErr("Enter Nepal number in +97797/98… format."); return; }
    setSending(true);
    const { ok, data, status } = await postJSON("/api/otp/phone/send", { phone });
    setSending(false);
    if (status === 429) {
      const wait = data?.wait ?? 30;
      setErr(`Please wait ${wait}s before requesting another code.`);
      return;
    }
    if (!ok) { setErr(data?.message || data?.error || "Failed to send SMS OTP."); return; }
    setMsg("SMS sent. Enter the 6-digit code.");
    setSent(true);
  }

  async function verifyPhone() {
    clear();
    if (!isNepalE164(phone) || !phoneCode) { setErr("Enter phone and the 6-digit code."); return; }
    setVerifying(true);
    const { ok, data } = await postJSON("/api/otp/phone/verify", { phone, code: phoneCode });
    setVerifying(false);
    if (!ok) { setErr(data?.message || data?.error || "SMS code invalid."); return; }
    setMsg("Phone verified. Redirecting...");
    window.location.href = "/dashboard";
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Join Gatishil Nepal</h1>

      <div className="flex gap-2">
        <button
          className={"px-3 py-2 rounded " + (mode === "email" ? "bg-black text-white" : "bg-gray-200")}
          onClick={() => { setMode("email"); setSent(false); setErr(null); setMsg(null); }}
        >
          Email
        </button>
        <button
          className={"px-3 py-2 rounded " + (mode === "phone" ? "bg-black text-white" : "bg-gray-200")}
          onClick={() => { setMode("phone"); setSent(false); setErr(null); setMsg(null); }}
        >
          Phone (+977)
        </button>
      </div>

      {mode === "email" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />
          </label>

          {!sent ? (
            <button
              onClick={sendEmail}
              disabled={sending}
              className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send code"}
            </button>
          ) : (
            <>
              <label className="block">
                <span className="text-sm">6-digit code</span>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />
              </label>
              <button
                onClick={verifyEmail}
                disabled={verifying}
                className="w-full px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify email"}
              </button>
            </>
          )}
        </div>
      )}

      {mode === "phone" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Nepal Phone (+97797/98…)</span>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+97798XXXXXXXX"
              inputMode="tel"
            />
          </label>

          {!sent ? (
            <button
              onClick={sendPhone}
              disabled={sending}
              className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send SMS"}
            </button>
          ) : (
            <>
              <label className="block">
                <span className="text-sm">6-digit code</span>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={phoneCode}
                  onChange={e => setPhoneCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />
              </label>
              <button
                onClick={verifyPhone}
                disabled={verifying}
                className="w-full px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify phone"}
              </button>
            </>
          )}
        </div>
      )}

      {msg && <div className="text-sm text-green-700">{msg}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <p className="text-xs text-gray-500">
        By continuing you agree to Gatishil Nepal’s Terms and Privacy Policy.
      </p>
    </div>
  );
}
