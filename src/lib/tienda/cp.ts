/**
 * Código postal → estado y ciudad sugerida, por los dos primeros dígitos (rangos de SEPOMEX).
 * Es una aproximación: la ciudad es la principal del rango y la persona puede corregirla.
 */
const RANGOS: [desde: number, hasta: number, estado: string, ciudad: string][] = [
  [1, 16, "CDMX", "Ciudad de México"],
  [20, 20, "AGS", "Aguascalientes"],
  [21, 22, "BC", "Tijuana"],
  [23, 23, "BCS", "La Paz"],
  [24, 24, "CAMP", "Campeche"],
  [25, 27, "COAH", "Saltillo"],
  [28, 28, "COL", "Colima"],
  [29, 30, "CHIS", "Tuxtla Gutiérrez"],
  [31, 33, "CHIH", "Chihuahua"],
  [34, 35, "DGO", "Durango"],
  [36, 38, "GTO", "León"],
  [39, 41, "GRO", "Acapulco"],
  [42, 43, "HGO", "Pachuca"],
  [44, 49, "JAL", "Guadalajara"],
  [50, 57, "MEX", "Toluca"],
  [58, 61, "MICH", "Morelia"],
  [62, 62, "MOR", "Cuernavaca"],
  [63, 63, "NAY", "Tepic"],
  [64, 67, "NL", "Monterrey"],
  [68, 71, "OAX", "Oaxaca de Juárez"],
  [72, 75, "PUE", "Puebla"],
  [76, 76, "QRO", "Querétaro"],
  [77, 77, "QROO", "Cancún"],
  [78, 79, "SLP", "San Luis Potosí"],
  [80, 82, "SIN", "Culiacán"],
  [83, 85, "SON", "Hermosillo"],
  [86, 86, "TAB", "Villahermosa"],
  [87, 89, "TAMPS", "Ciudad Victoria"],
  [90, 90, "TLAX", "Tlaxcala"],
  [91, 96, "VER", "Xalapa"],
  [97, 97, "YUC", "Mérida"],
  [98, 99, "ZAC", "Zacatecas"],
];

export function cpAEstado(cp: string): { estado: string; ciudad: string } | null {
  if (!/^\d{5}$/.test(cp)) return null;
  const pref = Number(cp.slice(0, 2));
  const r = RANGOS.find(([a, b]) => pref >= a && pref <= b);
  return r ? { estado: r[2], ciudad: r[3] } : null;
}

/** RFC de persona moral (12) o física (13), validación de forma. */
export function rfcValido(rfc: string): boolean {
  return /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/.test(rfc.trim().toUpperCase());
}
