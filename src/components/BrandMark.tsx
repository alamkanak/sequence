import brandMark from "/brand/mark.svg?url";

/** The shared Sequence identity; Vite resolves the asset for either HTML entry. */
export function BrandMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={brandMark}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
    />
  );
}
