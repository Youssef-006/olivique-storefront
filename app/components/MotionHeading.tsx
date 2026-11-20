import type { ReactNode } from "react";
export function MotionHeading({
  as: Tag = "h2",
  children,
}: {
  as?: "h1" | "h2";
  children: ReactNode;
}) {
  return (
    <Tag className="motion-heading" data-reveal="heading">
      <span>{children}</span>
    </Tag>
  );
}
