import Hero from '../components/Hero';
import FeatureGrid from '../components/FeatureGrid';
import Integrations from '../components/Integrations';
import Testimonials from '../components/Testimonials';
import PricingTable from '../components/PricingTable';
import FAQ from '../components/FAQ';

export default function Home() {
  return (
    <div>
      <Hero />
      <FeatureGrid />
      <Integrations />
      <Testimonials />
      <PricingTable />
      <FAQ />
    </div>
  );
}
