import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

const baseClasses =
  "rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-black/30 backdrop-blur";

type OwnProps<T extends ElementType> = {
  as?: T;
  padding?: string;
  className?: string;
  children?: ReactNode;
};

type GlassCardProps<T extends ElementType> = OwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof OwnProps<T>>;

export default function GlassCard<T extends ElementType = "div">({
  as,
  padding = "p-6",
  className = "",
  children,
  ...rest
}: GlassCardProps<T>) {
  const Component = as ?? "div";
  const classes = [baseClasses, padding, className].filter(Boolean).join(" ");

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}