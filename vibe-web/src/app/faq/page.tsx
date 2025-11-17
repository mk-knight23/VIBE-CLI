"use client";

import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { HelpCircle, Shield, User, Code, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";

const faqCategories = [
  {
    icon: HelpCircle,
    title: "Getting Started",
    questions: [
      {
        question: "What is Vibe CLI?",
        answer: "Vibe CLI is a free, open-source command-line interface that brings AI-powered development workflows to your terminal. It integrates with your editor and Git for a focused, defensive-only workflow."
      },
      {
        question: "How do I install Vibe CLI?",
        answer: "You can install Vibe CLI using npm: 'npm i -g github:mk-knight23/vibe-cli' or using curl: 'curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash'. Both methods are quick and easy."
      },
      {
        question: "Do I need an account to use Vibe?",
        answer: "No, Vibe is designed to be anonymous. You bring your own OpenRouter API key, and we don't require any account creation or personal information."
      }
    ]
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    questions: [
      {
        question: "Is my code safe with Vibe?",
        answer: "Yes, your code stays local. Vibe only sends the necessary context to OpenRouter's free models. We don't collect or store your code, and all communications are encrypted."
      },
      {
        question: "What data does Vibe collect?",
        answer: "Vibe collects minimal anonymized usage data for improving the tool. We don't collect your code, personal information, or API keys. You can review our privacy policy for full details."
      },
      {
        question: "Can I use Vibe offline?",
        answer: "Vibe requires an internet connection to communicate with AI models through OpenRouter. However, all processing and decision-making happens locally on your machine."
      }
    ]
  },
  {
    icon: User,
    title: "Usage & Features",
    questions: [
      {
        question: "Which programming languages are supported?",
        answer: "Vibe works with all major programming languages including JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, Ruby, PHP, Swift, and many more."
      },
      {
        question: "How does the defensive workflow work?",
        answer: "Vibe requires explicit approval for all changes. It suggests improvements and modifications but never makes changes without your consent, ensuring you maintain full control over your codebase."
      },
      {
        question: "Can I customize Vibe's behavior?",
        answer: "Yes, Vibe is highly configurable. You can customize prompts, set preferences, and integrate it with your existing development workflow through various configuration options."
      }
    ]
  },
  {
    icon: Code,
    title: "Technical",
    questions: [
      {
        question: "What models does Vibe use?",
        answer: "Vibe routes to free community models available on OpenRouter, including models from various providers. This ensures you get access to quality AI assistance without any cost."
      },
      {
        question: "How do I update Vibe CLI?",
        answer: "You can update Vibe CLI by running 'npm update github:mk-knight23/vibe-cli' or reinstalling using the curl command. We recommend checking for updates regularly."
      },
      {
        question: "Is Vibe open source?",
        answer: "Yes! Vibe is completely open source. You can view the source code, contribute to development, and even fork it for your own use. Visit our GitHub repository to learn more."
      }
    ]
  },
  {
    icon: DollarSign,
    title: "Pricing & Future",
    questions: [
      {
        question: "Is Vibe really free?",
        answer: "Yes, Vibe is completely free to use. We route to free models on OpenRouter and don't charge any fees. In the future, we may offer optional paid tiers with additional features, but the core functionality will remain free."
      },
      {
        question: "What are the future plans for Vibe?",
        answer: "We're working on extended context limits, priority support, advanced features, and more integrations. However, our commitment to keeping the core features free remains unchanged."
      },
      {
        question: "How can I support Vibe?",
        answer: "You can support Vibe by using it, providing feedback, contributing to the open source project, or donating to help sustain development. Community support is what makes Vibe possible."
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      {/* Hero Section */}
      <motion.div
        className="mx-auto max-w-3xl text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.8rem] md:text-[3.5rem] leading-[1.1]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Frequently Asked Questions
        </motion.h1>
        <motion.p
          className="mt-6 text-xl leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Everything you need to know about Vibe CLI
        </motion.p>
      </motion.div>

      {/* FAQ Categories */}
      <div className="space-y-12">
        {faqCategories.map((category, categoryIndex) => (
          <motion.div
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <category.icon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold">{category.title}</h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {category.questions.map((faq, questionIndex) => (
                <AccordionItem key={faq.question} value={`item-${categoryIndex}-${questionIndex}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        ))}
      </div>

      {/* CTA Section */}
      <motion.div
        className="mx-auto mt-16 max-w-2xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
        <p className="text-muted-foreground mb-8">
          We're here to help. Reach out to our community or check out our documentation for more information.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent">
            <Link href="/docs">View Documentation</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="https://github.com/mk-knight23/vibe-cli/discussions" target="_blank" rel="noopener noreferrer">
              Join Community
            </a>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}