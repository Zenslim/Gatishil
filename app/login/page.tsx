 import { redirect } from 'next/navigation';

 import LoginClient from './LoginClient';
 import { getServerSupabase } from '@/lib/supabaseServer';

 export default async function LoginPage() {
   const supabase = getServerSupabase();
   const { data } = await supabase.auth.getSession();
   if (data?.session) {
     redirect('/dashboard');
   }
-
-  return <LoginClient />;
+  return (
+    <>
+      <LoginClient />
+      {/* Gentle helper text to remove confusion about passwords vs. passkeys */}
+      <div className="px-4">
+        <div className="mx-auto max-w-md mt-4 text-center text-sm text-white/70">
+          <p>
+            <strong>Tip:</strong> If you never created a password for this account,
+            click <span className="underline underline-offset-2">Forgot Password</span> to set one now.
+            You can also tap <span className="whitespace-nowrap">🖐️ Use Biometric</span> to sign in with your passkey.
+          </p>
+        </div>
+      </div>
+    </>
+  );
 }
