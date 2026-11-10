"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavEnlace({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const activo = !href.includes("#") && ruta === href;
  return (
    <Link href={href} className={className} aria-current={activo ? "page" : undefined}>
      {children}
    </Link>
  );
}
