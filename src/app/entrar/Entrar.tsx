"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { estados } from "@/lib/catalogo";
import { CLAVE_DEMO, entrar, ErrorTienda, pedirRecuperacion, registrar, restablecerClave, useTienda } from "@/lib/tienda/almacen";
import { rfcValido } from "@/lib/tienda/cp";

type Modo = "entrar" | "crear" | "recuperar";

export function Entrar() {
  useTienda(); // carga la tienda de demostración
  const params = useSearchParams();
  const router = useRouter();
  const [modo, setModo] = useState<Modo>(params.get("modo") === "crear" ? "crear" : "entrar");
  const [rol, setRol] = useState<"comprador" | "proveedor">(params.get("rol") === "proveedor" ? "proveedor" : "comprador");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [enviaA, setEnviaA] = useState<string[]>(estados.map((e) => e.clave));
  const volver = params.get("volver") || null;

  const destino = (email: string) => {
    if (volver) return volver;
    if (email.startsWith("admin")) return "/admin";
    return "/";
  };

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    setError("");
    setOk("");
    setOcupado(true);
    try {
      if (modo === "entrar") {
        await entrar(v("email"), v("clave"));
        router.push(destino(v("email")));
      } else if (modo === "crear") {
        if (rol === "proveedor" && !rfcValido(v("rfc"))) throw new ErrorTienda("El RFC no tiene un formato válido (12 o 13 caracteres).");
        await registrar({
          nombre: v("nombre"),
          email: v("email"),
          clave: v("clave"),
          rol,
          negocio:
            rol === "proveedor"
              ? {
                  nombre: v("negocio"),
                  rfc: v("rfc"),
                  estado: v("estado"),
                  ciudad: v("ciudad"),
                  diasPreparacion: Number(v("dias") || 2),
                  enviaA,
                  cobraIva: f.get("iva") === "on",
                  descripcion: v("descripcion"),
                }
              : undefined,
        });
        router.push(rol === "proveedor" ? "/panel/verificacion" : volver || "/catalogo");
      } else if (!codigoEnviado) {
        const codigo = pedirRecuperacion(v("email"));
        setCodigoEnviado(true);
        setOk(
          codigo
            ? `Modo demostración: el correo no sale de Provana, así que te mostramos el código aquí: ${codigo}.`
            : "Si el correo tiene cuenta, te enviamos un código.",
        );
      } else {
        await restablecerClave(v("email"), v("codigo"), v("clave"));
        setOk("Listo. Ya puedes entrar con tu nueva contraseña.");
        setModo("entrar");
        setCodigoEnviado(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function demo(email: string) {
    setError("");
    setOcupado(true);
    try {
      await entrar(email, CLAVE_DEMO);
      router.push(volver ?? (email.startsWith("admin") ? "/admin" : email.startsWith("proveedor") ? "/panel" : "/catalogo"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="pagina-cabecera">
        <div>
          <h1>{modo === "crear" ? "Crea tu cuenta" : modo === "recuperar" ? "Cambia tu contraseña" : "Entra a Provana"}</h1>
          <p>Modo demostración: las cuentas viven en este navegador. No uses contraseñas reales.</p>
        </div>
      </div>

      <div className="pestanas" role="tablist" aria-label="Acceso">
        {(["entrar", "crear"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => { setModo(m); setError(""); setOk(""); }}>
            {m === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form className="tarjeta" onSubmit={enviar} noValidate>
        {modo === "crear" && (
          <fieldset className="pila" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="etiqueta" style={{ fontWeight: 600, marginBottom: 8 }}>¿Qué vas a hacer en Provana?</legend>
            <div className="opciones">
              <label className="opcion">
                <input type="radio" name="rol" checked={rol === "comprador"} onChange={() => setRol("comprador")} />
                <span className="opcion-texto"><strong>Comprar para mi negocio</strong><span className="chico suave">Busca, compara y compra a proveedores verificados.</span></span>
              </label>
              <label className="opcion">
                <input type="radio" name="rol" checked={rol === "proveedor"} onChange={() => setRol("proveedor")} />
                <span className="opcion-texto"><strong>Vender como proveedor</strong><span className="chico suave">Tu tienda aparece cuando la verifiquemos.</span></span>
              </label>
            </div>
          </fieldset>
        )}

        {modo === "crear" && (
          <div className="campo">
            <label htmlFor="nombre">Tu nombre</label>
            <input id="nombre" name="nombre" autoComplete="name" required />
          </div>
        )}
        <div className="campo">
          <label htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        {modo === "recuperar" && codigoEnviado && (
          <div className="campo">
            <label htmlFor="codigo">Código de 6 dígitos</label>
            <input id="codigo" name="codigo" inputMode="numeric" maxLength={6} required />
          </div>
        )}
        {(modo !== "recuperar" || codigoEnviado) && (
          <div className="campo">
            <label htmlFor="clave">{modo === "recuperar" ? "Nueva contraseña" : "Contraseña"}</label>
            <input id="clave" name="clave" type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} minLength={8} required />
            {modo !== "entrar" && <p className="ayuda">Al menos 8 caracteres.</p>}
          </div>
        )}

        {modo === "crear" && rol === "proveedor" && (
          <div className="pila">
            <hr className="separador" />
            <h2>Tu negocio</h2>
            <div className="campos-2">
              <div className="campo"><label htmlFor="negocio">Nombre del negocio</label><input id="negocio" name="negocio" required /></div>
              <div className="campo"><label htmlFor="rfc">RFC</label><input id="rfc" name="rfc" autoCapitalize="characters" required /></div>
              <div className="campo">
                <label htmlFor="estado">Estado de origen</label>
                <select id="estado" name="estado" required defaultValue="">
                  <option value="" disabled>Elige…</option>
                  {estados.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="campo"><label htmlFor="ciudad">Ciudad</label><input id="ciudad" name="ciudad" /></div>
              <div className="campo"><label htmlFor="dias">Días para preparar un pedido</label><input id="dias" name="dias" type="number" min={0} max={15} defaultValue={2} /></div>
            </div>
            <div className="campo"><label htmlFor="descripcion">¿Qué vendes?</label><textarea id="descripcion" name="descripcion" /></div>
            <label className="casilla"><input type="checkbox" name="iva" defaultChecked /> <span>Cobro IVA (16 %) en mis productos</span></label>
            <details>
              <summary className="chico" style={{ cursor: "pointer", minHeight: 32 }}>Envío a {enviaA.length} estados · cambiar</summary>
              <div className="fila" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEnviaA(estados.map((e) => e.clave))}>Todos</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEnviaA([])}>Ninguno</button>
              </div>
              <div className="campos-2" style={{ marginTop: 8 }}>
                {estados.map((e) => (
                  <label key={e.clave} className="casilla">
                    <input type="checkbox" checked={enviaA.includes(e.clave)} onChange={(ev) => setEnviaA((a) => (ev.target.checked ? [...a, e.clave] : a.filter((x) => x !== e.clave)))} />
                    <span>{e.nombre}</span>
                  </label>
                ))}
              </div>
            </details>
            <p className="ayuda">Después te pediremos tu constancia del RFC, identificación oficial, comprobante de domicilio en México y fotos de tu taller o bodega.</p>
          </div>
        )}

        {error && <p className="error-form" role="alert">{error}</p>}
        {ok && <p className="ok-form" role="status">{ok}</p>}

        <div className="fila-entre">
          <button type="submit" className="btn btn-primary" disabled={ocupado}>
            {ocupado ? "Un momento…" : modo === "entrar" ? "Entrar" : modo === "crear" ? "Crear cuenta" : codigoEnviado ? "Cambiar contraseña" : "Enviarme un código"}
          </button>
          {modo === "entrar" && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setModo("recuperar"); setOk(""); setError(""); }}>
              Olvidé mi contraseña
            </button>
          )}
        </div>
        <p className="ayuda">Entrar con Google necesita configurar una cuenta de Google Cloud; está pendiente para cuando conectemos la base de datos.</p>
      </form>

      <section className="tarjeta" aria-labelledby="t-demo">
        <h2 id="t-demo">Cuentas de demostración</h2>
        <p className="suave chico">Contraseña de todas: <code>{CLAVE_DEMO}</code></p>
        <div className="fila">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => demo("comprador@demo.provana.mx")} disabled={ocupado}>Entrar como comprador</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => demo("proveedor@demo.provana.mx")} disabled={ocupado}>Entrar como proveedor</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => demo("admin@demo.provana.mx")} disabled={ocupado}>Entrar como administración</button>
        </div>
        <p className="ayuda">Cada proveedor de ejemplo tiene cuenta: su identificador + @demo.provana.mx (por ejemplo finca-los-cerros@demo.provana.mx).</p>
      </section>
    </>
  );
}
