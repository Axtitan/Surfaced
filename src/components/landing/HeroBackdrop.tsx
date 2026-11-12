import { getImageProps } from "next/image";
import hero from "@/assets/hero.webp";
import heroSm from "@/assets/hero-sm.webp";

/* The hero illustration through the Next image pipeline (F-21): sized variants in AVIF/WebP, a blur placeholder while
   it loads, and a smaller crop on phones via <picture>. Decorative, so empty alt. */
export function HeroBackdrop() {
  const common = { alt: "", sizes: "100vw", placeholder: "blur" as const };
  const { props: { srcSet: desktop } } = getImageProps({ ...common, src: hero });
  const { props: { srcSet: mobile } } = getImageProps({ ...common, src: heroSm });
  // Faded behind a white gradient and never the main content, so it loads straight away but after the text and fonts:
  // no preload, low fetch priority.
  const { props: rest } = getImageProps({ ...common, src: hero, loading: "eager", fetchPriority: "low" });
  return (
    <div className="absolute inset-0 -z-10">
      <picture>
        <source media="(max-width: 640px)" srcSet={mobile} />
        <source media="(min-width: 641px)" srcSet={desktop} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt="" comes from the props above */}
        <img {...rest} className="h-full w-full object-cover object-[50%_75%]" style={{ ...rest.style, width: "100%", height: "100%" }} />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/85 via-40% to-white/0 to-75%" />
    </div>
  );
}

/** The closing call-to-action band uses the small crop, lazily. */
export function BandBackdrop() {
  const { props } = getImageProps({ alt: "", src: heroSm, sizes: "(max-width: 1152px) 100vw, 1152px", placeholder: "blur" });
  // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element -- alt="" is in props; getImageProps output
  return <img {...props} className="absolute inset-0 -z-10 h-full w-full object-cover object-bottom" style={{ ...props.style, width: "100%", height: "100%" }} />;
}
