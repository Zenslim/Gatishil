 'use client';

 import { useRef, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import { supabase } from '@/lib/supabaseClient';

 export default function LoginClient() {
   const router = useRouter();
   const [identifier, setIdentifier] = useState(''); // email or phone
   const [password, setPassword] = useState('');
   const [showPw, setShowPw] = useState(false);
-  const [loading, setLoading] = useState(false);
+  const [loading, setLoading] = useState(false);
+  const [otpLoading, setOtpLoading] = useState(false);
   const [err, setErr] = useState<string | null>(null);
   const [msg, setMsg] = useState<string | null>(null);
   const pwRef = useRef<HTMLInputElement>(null);

   // --- Handle login ---
   async function doLogin(e: React.FormEvent) {
     e.preventDefault();
     setErr(null);
     setMsg(null);
     setLoading(true);
     try {
       const looksLikePhone = /^[0-9+()\s-]{6,}$/.test(identifier.trim());
       const { error } = await supabase.auth.signInWithPassword(
         looksLikePhone
           ? { phone: identifier.trim(), password }
           : { email: identifier.trim(), password }
       );

       if (error) throw error;

       // Cross-browser reliable redirect
       await supabase.auth.getSession();
       window.location.href = '/dashboard';
     } catch (e: any) {
-      setErr(e?.message ?? 'Login failed. Please try again.');
+      const m = String(e?.message || '');
+      // Nudge users toward setting a password if they never had one
+      if (/invalid login/i.test(m) || /invalid credentials/i.test(m)) {
+        setErr('That email/phone and password did not match. If you never set a password, tap “Forgot Password” to create one now, or use the Magic Link option below.');
+      } else {
+        setErr(m || 'Login failed. Please try again.');
+      }
     } finally {
       setLoading(false);
     }
   }

+  // --- Email Magic Link (no password needed) ---
+  async function sendMagicLink() {
+    setErr(null);
+    setMsg(null);
+    const id = identifier.trim();
+    // Require an email address for magic link
+    if (!id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id)) {
+      setErr('Enter your email above, then tap “Email me a magic link”.');
+      return;
+    }
+    try {
+      setOtpLoading(true);
+      const redirectTo =
+        typeof window !== 'undefined'
+          ? `${window.location.origin}/dashboard`
+          : undefined;
+      const { error } = await supabase.auth.signInWithOtp({
+        email: id,
+        options: { emailRedirectTo: redirectTo },
+      });
+      if (error) throw error;
+      setMsg('Magic link sent. Check your inbox to finish signing in.');
+    } catch (e: any) {
+      setErr(e?.message ?? 'Could not send magic link.');
+    } finally {
+      setOtpLoading(false);
+    }
+  }
+
   // --- Forgot Password ---
   async function forgotPassword() {
     setErr(null);
     setMsg(null);
     const id = identifier.trim();
     if (!id || /^[0-9+()\s-]{6,}$/.test(id)) {
       setErr('Enter your email above, then tap “Forgot Password”.');
       return;
     }
     try {
       const redirectTo =
         typeof window !== 'undefined'
           ? `${window.location.origin}/login`
           : undefined;
       const { error } = await supabase.auth.resetPasswordForEmail(id, {
         redirectTo,
       });
       if (error) throw error;
-      setMsg('Password reset email sent. Check your inbox.');
+      setMsg('Password reset email sent. Create a new password from the link in your inbox.');
     } catch (e: any) {
       setErr(e?.message ?? 'Could not send reset email.');
     }
   }

   // --- Biometric Autofill ---
   function useBiometric() {
     pwRef.current?.focus();
     setTimeout(() => pwRef.current?.focus(), 25);
   }

   return (
     <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white flex items-center justify-center p-6">
       <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 shadow-2xl p-8">
         <div className="flex items-center justify-between">
           <h1 className="text-2xl font-semibold tracking-tight">🔐 Member Login</h1>
           <a href="/join" className="text-sm text-emerald-300 hover:underline">
             New? Join →
           </a>
         </div>
         <p className="text-sm text-white/70 mt-1">
           Enter your <b>email or phone</b> and password. Tap <b>Use Biometric</b> if your device has a saved credential.
         </p>

         <form onSubmit={doLogin} className="mt-6 space-y-4">
           <label className="block">
             <span className="text-sm text-white/80">Email or Phone</span>
             <input
               inputMode="email"
               autoComplete="username"
               className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
               placeholder="you@example.com or +97798…"
               value={identifier}
               onChange={(e) => setIdentifier(e.target.value)}
               required
             />
           </label>

           <label className="block">
             <span className="text-sm text-white/80">Password</span>
             <div className="mt-1 relative">
               <input
                 ref={pwRef}
                 type={showPw ? 'text' : 'password'}
                 autoComplete="current-password"
                 className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-emerald-400"
                 placeholder="••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required
               />
               <button
                 type="button"
                 onClick={() => setShowPw((s) => !s)}
                 className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white/100 text-sm px-2 py-1"
                 aria-label={showPw ? 'Hide password' : 'Show password'}
               >
                 {showPw ? 'Hide' : 'Show'}
               </button>
             </div>
+            <p className="mt-1 text-xs text-white/60">
+              Don’t remember setting a password? Click <span className="underline underline-offset-2">Forgot Password</span> to create one now,
+              or use the magic link (no password).
+            </p>
           </label>

           {err && (
             <div className="text-sm text-rose-300 bg-rose-900/30 border border-rose-500/30 rounded-lg px-3 py-2">
               {err}
             </div>
           )}
           {msg && (
             <div className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 rounded-lg px-3 py-2">
               {msg}
             </div>
           )}

           <button
             type="submit"
             disabled={loading}
             className="w-full rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-black font-semibold py-3 transition disabled:opacity-60"
           >
             {loading ? 'Signing in…' : 'Login'}
           </button>

           <div className="flex items-center gap-3">
             <div className="h-px flex-1 bg-white/10" />
             <span className="text-xs text-white/50">or</span>
             <div className="h-px flex-1 bg-white/10" />
           </div>

           {/* Bank-like biometric quick login */}
           <button
             type="button"
             onClick={useBiometric}
             className="w-full rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 py-3 transition"
             aria-label="Use Biometric"
             title="Uses device’s saved password (FaceID/TouchID/Android biometrics may prompt)."
           >
             🖐️ Use Biometric
           </button>

+          {/* Passwordless via email magic link */}
+          <button
+            type="button"
+            onClick={sendMagicLink}
+            disabled={otpLoading}
+            className="w-full rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 py-3 transition"
+            aria-label="Email me a magic link"
+            title="We’ll email you a one-time link to sign in."
+          >
+            {otpLoading ? 'Sending…' : 'Email me a magic link'}
+          </button>
+
           <div className="text-xs text-white/60 flex items-center justify-between">
             <button
               type="button"
               onClick={forgotPassword}
               className="underline decoration-dotted underline-offset-4"
             >
               Forgot Password
             </button>
             <a href="/security" className="underline decoration-dotted underline-offset-4">
               Add a Passkey (one-tap)
             </a>
           </div>
         </form>

         <p className="text-[11px] text-white/45 mt-5">
           Tip: If your browser/phone already saved your password for this site, tapping
           <span className="font-medium"> Use Biometric</span> will open your password manager
           and may ask for fingerprint/FaceID to fill it automatically.
         </p>
       </div>
     </main>
   );
 }
