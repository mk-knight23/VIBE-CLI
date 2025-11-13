export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 right-0 w-[700px] h-[700px] bg-primary/20 blur-3xl rounded-full" />
        <div className="absolute top-40 -left-40 w-[600px] h-[600px] bg-accent/20 blur-3xl rounded-full" />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Your terminal. Your tools. Your workflow.<br/>Evolving at thought-speed.</h1>
        <p className="mt-6 text-lg md:text-xl text-gray-300">Terminal-first AI assistant built for developers. Uses free/open models via OpenRouter. Integrates with your editor and Git.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <a href="#install" className="px-5 py-2.5 rounded-md bg-primary text-white font-semibold">Install in 30 seconds</a>
          <a href="/docs" className="px-5 py-2.5 rounded-md border border-gray-700 hover:border-gray-500">View docs</a>
        </div>
        <div className="mt-6 text-sm text-gray-400">Built for developers • OpenRouter compatible • Git/GitHub ready</div>
      </div>
    </section>
  );
}
