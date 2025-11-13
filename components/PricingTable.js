export default function PricingTable() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <h2 className="text-2xl md:text-3xl font-bold">Pricing</h2>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-lg border border-gray-800 bg-black/20">
          <h3 className="text-xl font-semibold">Free</h3>
          <p className="text-3xl font-bold mt-2">$0<span className="text-base font-normal text-gray-400">/mo</span></p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            <li>OpenRouter free models</li>
            <li>Terminal usage</li>
            <li>Community support</li>
          </ul>
        </div>
        <div className="p-6 rounded-lg border border-gray-700 bg-black/30 outline outline-2 outline-primary/40">
          <h3 className="text-xl font-semibold">Pro</h3>
          <p className="text-3xl font-bold mt-2">$12<span className="text-base font-normal text-gray-400">/mo</span></p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            <li>Priority features</li>
            <li>Extended context limits</li>
            <li>Email support</li>
          </ul>
        </div>
        <div className="p-6 rounded-lg border border-gray-800 bg-black/20">
          <h3 className="text-xl font-semibold">Enterprise</h3>
          <p className="text-3xl font-bold mt-2">Contact</p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            <li>SSO/SAML</li>
            <li>Policy controls</li>
            <li>Admin analytics</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
