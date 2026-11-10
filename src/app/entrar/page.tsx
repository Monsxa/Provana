import type { Metadata } from "next";
import { Suspense } from "react";
import { Entrar } from "./Entrar";

export const metadata: Metadata = { title: "Entrar o crear cuenta", robots: { index: false } };

export default function Pagina() {
  return (
    <div className="wrap pagina" style={{ maxWidth: 640 }}>
      <Suspense>
        <Entrar />
      </Suspense>
    </div>
  );
}
