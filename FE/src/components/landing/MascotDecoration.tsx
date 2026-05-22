import { cn } from "@/lib/utils";

type MascotDecorationProps = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
};

export const MascotDecoration = ({ index, className }: MascotDecorationProps) => {
  return (
    <img
      src={`/mascot/animation-${index}.png`}
      alt="Invera mascot"
      width={240}
      height={260}
      loading="lazy"
      decoding="async"
      className={cn(
        "pointer-events-none select-none object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,0.12)]",
        className
      )}
    />
  );
};
