import { resolveAsset } from "@/lib/api";

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const url = resolveAsset(src ?? undefined);
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const style = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt={name || "avatar"}
        style={style}
        className={`object-cover border-2 border-brand-black bg-white ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`grid place-items-center border-2 border-brand-black bg-brand-acid font-display font-bold text-brand-black ${className}`}
    >
      {initials}
    </div>
  );
}
