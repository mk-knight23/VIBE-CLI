import { Globe, FileCode, Zap, Target, Shield, Cpu, Layers, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

const architecture = [
  {
    name: "OpenRouter",
    models: "6 models",
    context: "1M Context",
    color: "bg-blue-50 text-blue-700",
    border: "border-blue-100"
  },
  {
    name: "MegaLLM",
    models: "12 models",
    context: "200k Context",
    color: "bg-purple-50 text-purple-700",
    border: "border-purple-100"
  },
  {
    name: "AgentRouter",
    models: "7 models",
    context: "200k Context",
    color: "bg-green-50 text-green-700",
    border: "border-green-100"
  },
  {
    name: "Routeway",
    models: "6 models",
    context: "200k Context",
    color: "bg-orange-50 text-orange-700",
    border: "border-orange-100"
  }
];

const features = [
  {
    icon: Globe,
    title: "Multi-Provider",
    description: "4 providers with automatic fallback ensuring high availability."
  },
  {
    icon: FileCode,
    title: "Auto Files",
    description: "AI creates and modifies files automatically based on your prompt."
  },
  {
    icon: Zap,
    title: "Zero Config",
    description: "Works instantly out of the box, no complex setup required."
  },
  {
    icon: Target,
    title: "Smart Fallback",
    description: "Never fails. If one model is down, Vibe switches to the next."
  },
  {
    icon: Cpu,
    title: "40+ Models",
    description: "Free access to a diverse range of top-tier AI models."
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "No data retention. Your code stays yours, always."
  }
];

export function Features() {
  return (
    <div id="features" className="bg-background">
      {/* Architecture Section */}
      <section className="py-20 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-serif text-foreground mb-4">Multi-Provider Architecture</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              VIBE v4.0 orchestrates multiple AI providers to guarantee uptime and performance.
              <br/>40+ free AI models with automatic fallback.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {architecture.map((provider, i) => (
              <div key={i} className={`p-6 rounded-2xl border ${provider.border} bg-white shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`w-12 h-12 rounded-xl ${provider.color} flex items-center justify-center mb-4`}>
                  <Server size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1 text-foreground">{provider.name}</h3>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
                  <span>{provider.models}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{provider.context}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grid Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <span>What's New in v4.0</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-serif">
              Powerful Features, Zero Complexity
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group p-8 rounded-2xl bg-secondary/30 hover:bg-secondary/60 transition-colors border border-transparent hover:border-primary/10">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 font-serif">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}