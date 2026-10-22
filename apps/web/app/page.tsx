export default function Home() {
  return (
    <div className="card">
      <h1>🚿 Car Wash</h1>
      <p>
        Scan the QR code on the bay screen to begin. Each bay shows a fresh code when it is free
        and ready to wash.
      </p>
      <p className="muted">
        This page is the customer entry point. Scanning opens <code>/b/&#123;bayId&#125;</code>.
      </p>
    </div>
  );
}
