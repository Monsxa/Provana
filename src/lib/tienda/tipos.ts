/**
 * Tipos de la tienda en modo demostración.
 * Todo el dinero en centavos (MXN). Precios de productos SIN IVA.
 */
import type { Producto, Proveedor } from "@/lib/esquemas";

export type Rol = "comprador" | "proveedor" | "admin";

export interface Direccion {
  id: string;
  alias: string;
  nombre: string;
  calle: string;
  colonia: string;
  cp: string;
  ciudad: string;
  estado: string;
  telefono: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** Hash SHA-256 de la contraseña (solo demostración; nunca la contraseña en claro). */
  claveHash: string;
  correoVerificado: boolean;
  proveedorId?: string;
  direcciones: Direccion[];
  creado: string;
  preferencias: Record<TipoAviso, boolean>;
}

export type TipoAviso =
  | "cuenta"
  | "pedido"
  | "pago"
  | "envio"
  | "entrega"
  | "mensaje"
  | "cotizacion"
  | "disputa"
  | "precio"
  | "verificacion";

export interface Aviso {
  id: string;
  usuarioId: string;
  tipo: TipoAviso;
  asunto: string;
  cuerpo: string;
  enlace?: string;
  fecha: string;
  leido: boolean;
}

export type EstadoVerificacion = "en_revision" | "verificado" | "rechazado";

export interface DocumentoProveedor {
  tipo: "rfc" | "identificacion" | "domicilio" | "taller" | "permiso";
  nombreArchivo: string;
  subido: string;
}

export type ProveedorTienda = Proveedor & {
  rfc?: string;
  documentos: DocumentoProveedor[];
  motivoRechazo?: string;
  condiciones: string;
};

export type ProductoTienda = Producto & {
  /** Imágenes subidas por el proveedor (data URL reducida). */
  fotos: string[];
};

export interface LineaCarrito {
  productoId: string;
  cantidad: number;
}

export type EstadoPedido =
  | "pendiente_pago"
  | "confirmado"
  | "preparando"
  | "enviado"
  | "entregado"
  | "completado"
  | "cancelado"
  | "en_disputa"
  | "reembolsado";

export type EstadoPago = "pendiente" | "retenido" | "detenido" | "liberado" | "reembolsado" | "reembolso_parcial";

export type MetodoPago = "tarjeta" | "oxxo" | "spei";

export interface LineaPedido {
  productoId: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface EventoPedido {
  estado: EstadoPedido;
  fecha: string;
  nota: string;
}

export interface Pedido {
  id: string;
  folio: string;
  grupoCompra: string;
  compradorId: string;
  proveedorId: string;
  lineas: LineaPedido[];
  productos: number;
  descuento: number;
  cupon?: string;
  ivaProductos: number;
  envio: { servicio: string; costo: number; iva: number; diasMin: number; diasMax: number; guia?: string; paqueteria?: string };
  total: number;
  comisionTasa: number;
  comision: number;
  /** Lo que recibe el proveedor al liberarse: productos − descuento + IVA de productos − comisión. */
  montoProveedor: number;
  pago: { metodo: MetodoPago; estado: EstadoPago; referencia: string; ultimos4?: string; reembolsado?: number; liberadoEn?: string };
  estado: EstadoPedido;
  eventos: EventoPedido[];
  direccion: Direccion;
  factura: { solicitada: boolean; rfc?: string; razonSocial?: string; usoCfdi?: string; xml?: string; pdf?: string };
  creado: string;
}

export interface Resena {
  id: string;
  pedidoId: string;
  proveedorId: string;
  compradorId: string;
  compradorNombre: string;
  estrellas: number;
  texto: string;
  fotos: string[];
  respuesta?: string;
  reportada?: string;
  oculta: boolean;
  fecha: string;
}

export interface Disputa {
  id: string;
  pedidoId: string;
  motivo: string;
  estado: "abierta" | "resuelta";
  resolucion?: "a_favor_proveedor" | "reembolso_total" | "reembolso_parcial";
  montoReembolso?: number;
  historial: { autor: string; texto: string; fecha: string }[];
  creada: string;
}

export interface Mensaje {
  id: string;
  hilo: string; // `${compradorId}:${proveedorId}`
  autorId: string;
  texto: string;
  fecha: string;
}

export interface Cotizacion {
  id: string;
  tipo: "cotizacion" | "muestra";
  compradorId: string;
  proveedorId: string;
  productoId: string;
  cantidad: number;
  mensaje: string;
  estado: "pendiente" | "respondida";
  respuesta?: string;
  precioOfrecido?: number;
  fecha: string;
}

export interface Cupon {
  codigo: string;
  proveedorId: string;
  porcentaje: number;
  minimo: number;
  activo: boolean;
}

export interface Ajustes {
  comision: number;
  diasLiberacion: number;
  confianzaMinima: number;
  pesosRiesgo: { ahorro: number; equilibrado: number; confianza: number };
  planDestacado: { activo: boolean; precioMensual: number };
}

export interface EstadoTienda {
  version: 1;
  usuarios: Usuario[];
  sesion: string | null;
  proveedores: ProveedorTienda[];
  productos: ProductoTienda[];
  carritos: Record<string, LineaCarrito[]>; // "anonimo" o id de usuario
  pedidos: Pedido[];
  resenas: Resena[];
  disputas: Disputa[];
  mensajes: Mensaje[];
  favoritos: Record<string, { productoId: string; precioAlGuardar: number; existenciasAlGuardar: number }[]>;
  listas: Record<string, { id: string; nombre: string; lineas: LineaCarrito[] }[]>;
  avisos: Aviso[];
  cotizaciones: Cotizacion[];
  cupones: Cupon[];
  ajustes: Ajustes;
  /** Días simulados que se adelantó el reloj (para probar la liberación automática). */
  diasAdelantados: number;
  folio: number;
}
