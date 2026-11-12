/** Template buyer questions, used when Claude isn't connected to write them. */
export function templateQuestions(category: string, competitors: string[]) {
  const c = category.trim().replace(/[.?!]+$/, "") || "this kind of product";
  const a = /^[aeiou]/i.test(c) ? "an" : "a";
  return [
    `What is the best ${c}?`,
    `Can you recommend a good ${c}?`,
    `What ${c} options do people like right now?`,
    `I need ${a} ${c}. What should I use and why?`,
    ...competitors.slice(0, 4).map((x) => `What are the best alternatives to ${x}?`),
    `What is a cheaper or simpler option than the usual ${c}?`,
  ];
}
