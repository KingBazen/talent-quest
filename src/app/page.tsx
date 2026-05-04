import { Hero } from "@/components/home/Hero";
import { HowItWorksTeaser } from "@/components/home/HowItWorksTeaser";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { Showcase } from "@/components/home/Showcase";
import { Testimonials } from "@/components/home/Testimonials";
import { CTA } from "@/components/home/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorksTeaser />
      <CategoryGrid />
      <Showcase />
      <Testimonials />
      <CTA />
    </>
  );
}
