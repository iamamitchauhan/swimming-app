import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { TryoutFAQ } from "./types";

interface Props {
  faqs: TryoutFAQ[];
}

export function TryoutFAQ({ faqs }: Props) {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Frequently Asked Questions
      </h2>
      <div className="rounded-2xl border bg-card p-2 shadow-sm sm:p-4">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="last:border-b-0">
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
