export default function TrustStep({ onNext }) {
  const [creating, setCreating] = useState(false);

  async function handleCreatePasskey() {
    setCreating(true);
    try {
      const opts = await fetch("/api/webauthn/options").then(r => r.json());
      const cred = await navigator.credentials.create({ publicKey: opts });
      await fetch("/api/webauthn/verify", {
        method: "POST",
        body: JSON.stringify(cred),
        headers: { "Content-Type": "application/json" }
      });
      toast.success("Your voice is now sealed to this device 🌿");
      onNext();
    } catch (e) {
      console.error(e);
      toast.error("Couldn’t create passkey. You can use OTP next time.");
      onNext();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-6">
      <h1 className="text-3xl font-bold mb-4">🌳 Welcome under the tree</h1>
      <p className="text-gray-300 mb-8 max-w-md">
        You’ve spoken your <b>name</b>, shared your <b>roots</b>, and offered your <b>skills</b>.
        <br/><br/>
        Now, shall we <b>seal your voice</b> to this device?
      </p>
      <button
        disabled={creating}
        onClick={handleCreatePasskey}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition"
      >
        {creating ? "Creating Passkey..." : "Yes, create my passkey 🔐"}
      </button>
      <button
        onClick={onNext}
        className="mt-4 text-gray-400 underline hover:text-gray-200"
      >
        Not now → I’ll use OTP next time
      </button>
    </div>
  );
}
