"use client";

import Image from "next/image";
import { Card, CardContent } from "../ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { PlaceHolderImages } from "../../lib/placeholder-images";

/**
 * TestimonialsSection
 * Dark redesign: elevated card & gradient heading. Single testimonial retained.
 * No new functional features.
 */
const testimonialAuthorImage = PlaceHolderImages.find((p) => p.id === "testimonial-author");

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden py-24 sm:py-40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.07),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.06),transparent_65%)]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.4rem] md:text-[3rem]">
          What developers say
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Trusted by developers who transformed their workflow.
        </p>
      </div>

      <div className="mt-20">
        <Carousel
          className="mx-auto w-full max-w-2xl"
          opts={{
            align: "center",
            loop: true,
          }}
        >
          <CarouselContent>
            <CarouselItem>
              <div className="p-2">
                <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm px-2 py-2 ease-smooth hover:-translate-y-2 hover:border-accent/50 glow-border ambient">
                  <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                    <div className="mb-6 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-8 w-8 text-accent"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <p className="mb-8 text-2xl font-medium italic leading-relaxed text-foreground">
                      “I ship PRs faster without leaving my shell.”
                    </p>
                    <div className="mt-4 flex flex-col items-center gap-4">
                      {testimonialAuthorImage && (
                        <Image
                          src={testimonialAuthorImage.imageUrl}
                          alt={testimonialAuthorImage.description}
                          data-ai-hint={testimonialAuthorImage.imageHint}
                          width={72}
                          height={72}
                          className="rounded-full border border-accent/40 shadow-[0_0_0_2px_rgba(255,255,255,0.05),0_8px_30px_-6px_rgba(34,211,238,0.35)]"
                        />
                      )}
                      <div className="text-center">
                        <p className="font-semibold tracking-wide">Lena Ortiz</p>
                        <p className="text-sm text-muted-foreground">Staff Engineer</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-card/60 backdrop-blur-sm border border-border/40 p-3 hover:bg-primary/15 ease-smooth" />
          <CarouselNext className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-card/60 backdrop-blur-sm border border-border/40 p-3 hover:bg-primary/15 ease-smooth" />
        </Carousel>
      </div>
    </section>
  );
}