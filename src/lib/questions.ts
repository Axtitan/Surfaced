/** Template buyer questions, used when Claude isn't connected to write them. Each one is a fixed intent (§9.2), so results
    compare across time: best in category, recommendation, need, alternatives to each competitor, cheaper or simpler.
    With a location (local businesses) the questions use the place. */
export function templateQuestions(category: string, competitors: string[], location = "") {
  const c = category.trim().replace(/[.?!]+$/, "") || "this kind of product";
  const a = /^[aeiou]/i.test(c) ? "an" : "a";
  const place = location.trim();
  if (place && !c.toLowerCase().includes(place.toLowerCase())) {
    return [
      `What is the best ${c} in ${place}?`,
      `Can you recommend a good ${c} in ${place}?`,
      `Which ${c} in ${place} do people rate highly?`,
      `I need ${a} ${c} near ${place}. Who should I go to and why?`,
      ...competitors.slice(0, 3).map((x) => `What are good alternatives to ${x} in ${place}?`),
      `Is there an affordable ${c} in ${place}?`,
    ];
  }
  return [
    `What is the best ${c}?`,
    `Can you recommend a good ${c}?`,
    `What ${c} options do people like right now?`,
    `I need ${a} ${c}. What should I use and why?`,
    ...competitors.slice(0, 4).map((x) => `What are the best alternatives to ${x}?`),
    `What is a cheaper or simpler option than the usual ${c}?`,
  ];
}
