import { Fragment, type ReactNode } from "react";

/* Answer-shaped content (§17.3): the question as the heading, a direct answer of one or two sentences first, then the
   detail. The same `q` and `a` feed the page's FAQPage structured data, so what machines read matches the page. */

export type Answer = { q: string; a: string; more?: ReactNode };

export function Answers({ items }: { items: Answer[] }) {
  return items.map((it) => (
    <Fragment key={it.q}>
      <h2>{it.q}</h2>
      <p>{it.a}</p>
      {it.more}
    </Fragment>
  ));
}
