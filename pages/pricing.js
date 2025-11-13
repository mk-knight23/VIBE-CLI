export default function Pricing() {
  return (
    <main className="container">
      <h1>Pricing</h1>
      <div className="card">
        <h2>Free — $0/mo</h2>
        <ul>
          <li>OpenRouter free models</li>
          <li>Terminal usage, basic features</li>
          <li>Community support</li>
        </ul>
      </div>
      <div className="card">
        <h2>Pro — $12/mo</h2>
        <ul>
          <li>Priority features and extended limits</li>
          <li>Preview integrations</li>
          <li>Email support</li>
        </ul>
      </div>
      <div className="card">
        <h2>Enterprise — Contact us</h2>
        <ul>
          <li>SSO/SAML, policy controls</li>
          <li>Admin analytics and audit logs</li>
          <li>Dedicated support</li>
        </ul>
      </div>
    </main>
  );
}
