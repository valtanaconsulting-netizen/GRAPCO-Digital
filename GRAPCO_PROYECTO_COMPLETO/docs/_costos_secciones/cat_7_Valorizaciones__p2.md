# CATEGORIA 7 — Valorizaciones (cont. 2) — Fichas detalladas

Chunk: `cat_7_Valorizaciones__p2.txt`
Proyecto: CREDITEX (PTARI "PTAR Planta 5" + NAVE "Estructura Metálica y Losa Colaborante").
Contratista: GRAPCO SAC · Supervisión: Diseños Racionales SAC (DIRAC).
Ubicación: Av. Los Hornos 185, URB. Vulcano, Ate.

Naturaleza del chunk: valorizaciones quincenales al CLIENTE (formato F07) por periodo, más sus carpetas de SUSTENTO DE METRADOS por especialidad (concreto, encofrado, acero, acarreo, cordón bentonítico, arquitectura, excavación/eliminación, nave industrial), y las valorizaciones de la NAVE + Adicionales.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\6. PTAR-VAL 06\GP-GCE-FOR-F07_VAL N°06.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** (Valorización Mensual/Quincenal de cliente). APUs nuevos internos usan **GP-GCE-FOR-F01**.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido:
  - **Carátula / 1. RESUMEN**: Obra "PTAR Planta 5", Cliente CREDITEX, Supervisión DIRAC, Residente Ing. Guido Gonzales, Valorización N°06, periodo FEBRERO 2026 (16–28 feb), plazo 130 D.C.
  - **2. PAGOS**: cronograma de pagos (F07, pág 1 de 5).
  - **3. RES.VAL**: resumen de valorizaciones; montos referenciales y costo directo acumulado.
  - **4. VAL** (A1:AD1052, +196 filas): cuerpo de valorización por ITEM/DESCRIPCIÓN con PRESUPUESTO (Und, Cant, P.U., Parcial), ACUMULADO ANTERIOR, ACTUAL, ACUMULADO y SALDO REFERENCIAL (Cantidad / % / Total cada uno).
  - **5. APUs Nuevos / 6. APUs Nuevos.**: análisis de precios unitarios nuevos (F01).
  - **5. RO**: vista interna costo de obra por FRENTE/PARTIDA (Ppto F1 PTARI, Valorización Quincenal, Acumulada).
- Números clave: Monto referencial 2'866,414.72 (inc. IGV) / 2'429,165.02 (no inc. IGV); Costo Directo 1'713,447.90; Presupuesto referencial 2'739,001.11. RO: Total Costo Obra 2'166,977.07 / quincenal 249,629.66 / acumulado 1'570,455.13; Costo Directo 1'713,447.90 / 197,384.38 / 1'241,772.74.
- Propósito: valorización oficial del avance al cliente del periodo (cobro) + control interno (RO).
- Origen -> Destino: metrados de campo (carpetas Sustento) + presupuesto contractual -> documento de cobro al cliente; la hoja "5. RO" alimenta control interno de avance vs presupuesto.
- Automatización: módulo **Valorizaciones (cliente)** de GRAPCO; importar hoja 4. VAL (partida, %, montos por periodo) + 5. RO al **RO/CR/F06 + EVM**. APUs nuevos (F01) -> Adicionales/Presupuesto. Importador genérico in-app sirve para 4. VAL y 5. RO.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\1. Concreto\Sustento_Concreto_Val07.xlsx
- Tipo / formato: xlsx · sustento de metrados, **PRO-GCE-FOR-F03** (Metrado/Sustento).
- Hojas: 1. Metrado | 2. Sustento | Met_COL | Met_MC | Met_VIG | 4. Report. de Guias | 5. Sust. Fotografico.
- Contenido: denominación CONCRETO. **1. Metrado** (ITEM/DESCRIPCIÓN/UND/CANT). **2. Sustento** (requerimiento de concreto, +62 filas). **Met_COL** (columnas: f'c 210/280/350/420, h, e, área, cant, m3 por resistencia). **Met_MC** (muros de contención: f'c, h, e, largo, m3). **Met_VIG** (vigas: a/h/l, m³ por f'c). **4. Report. de Guias** (sustento de llegada de concreto, guías). **5. Sust. Fotografico** (evidencia).
- Números clave: cabeceras de resistencia f'c 210/280/350/420; metrados por elemento (sin total global explícito en el volcado).
- Propósito: sustentar ante supervisión el metrado de concreto valorizado en VAL07.
- Origen -> Destino: guías de remisión de concreto + cómputo de elementos -> metrado que respalda partidas de concreto en GP-GCE-FOR-F07 VAL07.
- Automatización: GAP — sustentos de metrados detallados no tienen importador propio. Cargar como adjunto de respaldo de partida en Valorizaciones; las guías de concreto podrían alimentar Almacén/consumos (GAP de ingestión de guías).

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\2. Encofrado\01. Sustento_Encofrado_Val07.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_COL | Met_MC | Met_VIG | 5. Sust. Fotografico.
- Contenido: denominación ENCOFRADO. **2. Sustento** con columnas UND / METRADO ANTERIOR / METRADO ACUMULADO / METRADO ACTUAL. **Met_COL** (h, p, cara, cantidad, m2, curado; ej. C1 8.50/2.40 -> 40.80 m2). **Met_MC** (concreto+encofrado: 1 cara / 2 caras, curado, baranda; ej. muros perimetrales 793.48 m2). **Met_VIG** (encofrado simple/doble, curado; ej. V2 32.56 m2).
- Números clave: muros perimetrales 793.48 m2 encofrado; V2 32.56 m2.
- Propósito: respaldo del metrado de encofrado de VAL07 (m2 ejecutados anterior/actual/acumulado).
- Origen -> Destino: cómputo de elementos en obra -> partidas de encofrado en F07 VAL07.
- Automatización: GAP — adjunto de respaldo. La estructura ANTERIOR/ACUMULADO/ACTUAL es la base del avance; podría mapearse al RO si se normaliza por partida.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\3. Acero\01. Sustento_Acero_Val07.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Report. de Guias | 4. Sust. Fotografico | Met_VIG.
- Contenido: denominación ACERO. **2. Sustento** (sustento de campo, descripción/und/cantidad). **3. Report. de Guias** (sustento de guías de acero, A1:AJ1012). **Met_VIG** (tablas de habilitación: TRASLAPE y PESO Ø por diámetro 0.25/0.40/0.56/0.99/1.55/2.24/3.97/7.91 kg/m; longitudes L1..L6, empalmes, KG totales).
- Números clave: tabla de pesos por diámetro (kg/m) y traslapes; cantidades en KG.
- Propósito: respaldo del metrado de acero (kg) valorizado en VAL07.
- Origen -> Destino: guías de acero + planilla de fierros -> partidas de acero en F07 VAL07.
- Automatización: GAP — adjunto de respaldo. Las guías de acero podrían alimentar Almacén (materiales) si se digitalizan.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val07.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento Metrados | 3. Report. de Guias | 4. Sust. Fotografico.
- Contenido: denominación ACARREO C/CAMIÓN GRÚA. **2. Sustento Metrados** con FECHA / N° GUIA / DESCRIPCION / N° HORAS / UNIDAD / METRADO ANTERIOR / ACUMULADO / ACTUAL (medición por horas). **3. Report. de Guias** (guías de camión grúa).
- Números clave: medición en horas de servicio (no totales explícitos en volcado).
- Propósito: respaldo de la partida de acarreo con camión grúa (horas) en VAL07.
- Origen -> Destino: guías/partes de horas de equipo -> partida de acarreo en F07 VAL07.
- Automatización: GAP — adjunto. Horas de equipo podrían alimentar control de equipos/EV valorizado (no existe importador de equipos).

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\5. Cordon Bentonítico\01. Sustento_Cordon Bentonítico_Val07.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | Met_MC | 2. Sust. Fotografico.
- Contenido: denominación CORDÓN BENTONÍTICO (junta hidroexpansiva). **Met_MC**: ITEM / DESCRIPCIÓN / UND / N° DE VECES / DIMENSIONES (altura/ancho/largo/anillos) / PARCIAL; ej. "COLOCACIÓN DE JUNTA HIDRO EXPANSIVA" 338.14; "JUNTA HIDRO EXPANSIVA 13" 297.53 (ml en tanque de oxidación).
- Números clave: junta hidroexpansiva 338.14 (total) / 297.53 (parcial ml).
- Propósito: respaldo del metrado de cordón bentonítico/junta valorizado en VAL07.
- Origen -> Destino: cómputo de juntas -> partida correspondiente en F07 VAL07.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\1. Sustento Metrados\6. Nave Industrial\01. Sustento_Nave Industrial_Val07.xlsx
- Tipo / formato: xlsx · sustento metrados (estructura completa Nave: MOV/EST + elementos).
- Hojas (16): 3. MOV | 4. EST | Met_MOV | Met_FZ | Met_ZAP | Met_PED | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa.
- Contenido: metrados de la NAVE INDUSTRIAL. **3. MOV** (movimiento de tierras; nota: cabecera dice "PRECOTEX LAS MORERAS" — plantilla reutilizada). **4. EST** (estructuras: concreto simple, etc.). **Met_MOV** (excavaciones masivas: perfilado/excavación/elim m3; ej. CM-01 0.94/3.04/3.95). **Met_ZAP/Met_FZ/Met_PED/Placas/Camara/Sobrecimientos/Cimiento corridos/bases/pedestales/cimientos armados** (concreto+encofrado+acero por elemento, con tablas TRASLAPE/PESO Ø). **Escalera**, **losa rampa**, **relleno rampa** (volúmenes/áreas).
- Números clave: volúmenes por elemento (m3 excavación/concreto, m2 encofrado, KG acero); ej. escalera cisterna 37.58 KG, 5.40 m2.
- Propósito: respaldo de metrados de la NAVE para su valorización.
- Origen -> Destino: cómputo de estructuras de la nave -> valorizaciones NAVE (frente F2).
- Automatización: GAP — sustento detallado. Frentes F1/F2 son pendiente conocido del RO.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\7. PTAR-VAL 07\GP-GCE-FOR-F07_VAL N°07.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** (valorización cliente). APUs F01.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: igual estructura que VAL06. Periodo MARZO 2026 (01–15 mar), plazo 130 D.C. **4. VAL** (+218 filas), **5. RO** (+64 filas).
- Números clave: Monto referencial 2'866,414.72 (inc. IGV) / 2'429,165.02 (no inc.); Costo Directo 1'725,572.43; Presupuesto referencial 2'758,382.55. RO: Total Costo Obra 2'182,310.81 / quincenal 226,106.16 / acumulado 1'796,561.29; Costo Directo 1'725,572.43 / 178,784.13 / 1'420,556.87.
- Propósito: valorización quincenal de cobro VAL07 + RO interno.
- Origen -> Destino: sustentos de metrados VAL07 + presupuesto -> cobro al cliente; 5. RO -> control interno.
- Automatización: módulo **Valorizaciones (cliente)**; 4. VAL y 5. RO al **RO/CR/F06 + EVM** vía importador genérico.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\1. Concreto\Sustento_Concreto_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_COL | Met_MC | Met_VIG | Met_LOSA | 4. Report. de Guias | 5. Sust. Fotografico.
- Contenido: CONCRETO de VAL08 (periodo marzo). Igual que VAL07 + hoja **Met_LOSA** (losas macizas: malla inf / inf-sup, f'c por columnas X/280/X, m3). **2. Sustento** +76 filas (requerimiento de concreto). **Met_VIG** con f'c 280.
- Números clave: cabeceras f'c 280; metrados por elemento.
- Propósito: respaldo metrado concreto VAL08.
- Origen -> Destino: guías de concreto + cómputo -> partidas concreto F07 VAL08.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\2. Encofrado\01. Sustento_Encofrado_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_MC | Met_VIG | Met_Losa Maciza | 5. Sust. Fotografico.
- Contenido: ENCOFRADO VAL08. **2. Sustento** (ANTERIOR/ACUMULADO/ACTUAL). **Met_MC** (1 cara/2 caras, curado, baranda; muros perimetrales 793.48 m2). **Met_VIG** (simple/doble, curado; V1 23.86 m2). **Met_Losa Maciza** (encofrado losa, curado).
- Números clave: muros perimetrales 793.48 m2; V1 23.86 m2.
- Propósito: respaldo metrado encofrado VAL08.
- Origen -> Destino: cómputo de elementos -> partidas encofrado F07 VAL08.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\3. Acero\01. Sustento_Acero_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Sust. Fotografico | Met_VIG | Met_Losa Maciza.
- Contenido: ACERO VAL08. **2. Sustento** (HABILITADO Y COLOCADO DE ACERO, KG; ej. 5.24). **Met_VIG** y **Met_Losa Maciza** con tablas TRASLAPE / PESO Ø por diámetro y resultados en KG.
- Números clave: medición en KG (habilitado y colocado); tabla de pesos por Ø.
- Propósito: respaldo metrado acero VAL08.
- Origen -> Destino: guías/planilla de fierros -> partidas acero F07 VAL08.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\4. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento Metrados | 3. Report. de Guias | 4. Sust. Fotografico.
- Contenido: ACARREO C/CAMIÓN GRÚA VAL08. **2. Sustento Metrados** (FECHA/N°GUIA/DESCRIPCION/N° HORAS/UNIDAD/ANTERIOR/ACUMULADO/ACTUAL).
- Números clave: medición por horas (sin total explícito en volcado).
- Propósito: respaldo partida acarreo camión grúa VAL08.
- Origen -> Destino: partes de horas/guías -> partida acarreo F07 VAL08.
- Automatización: GAP — adjunto; horas de equipo (sin importador de equipos).

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\5. Arquitectura\Sustento_Arquitectura_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Met_ARQ | 5. Sust. Fotografico.
- Contenido: ARQUITECTURA VAL08 (etiquetada DENOMINACIÓN "CONCRETO" en cabecera). **3. Met_ARQ** (tipo/ubicación, # veces, ancho/largo/alto, Total mL/m2/m3; ítems SOLAQUEO EXTERIOR, OXIDACIÓN, LOSA DE FONDO).
- Números clave: cómputos de losa de fondo / solaqueo (m2/m3, sin total único en volcado).
- Propósito: respaldo metrado de arquitectura (acabados/impermeabilización) VAL08.
- Origen -> Destino: cómputo de arquitectura -> partidas de arquitectura F07 VAL08.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\6. Excavación\01. Sustento_Eliminacion de Excavacion_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03** (5 páginas).
- Hojas: 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida | 5. Sustento Fotografico.
- Contenido: MOVIMIENTO DE TIERRAS / ELIMINACIÓN VAL08. **2. Sustento Elim.** (Fecha / Descripcion / Vol. m3 — salida de volquetes). **3. Guias de Salida** (guías de salida de desmonte; nota cliente "PRECOTEX SAC" por plantilla).
- Números clave: volúmenes de eliminación en m3 (medición por volquetes).
- Propósito: respaldo metrado de eliminación de excavación VAL08.
- Origen -> Destino: guías de salida de volquetes -> partida de eliminación F07 VAL08.
- Automatización: GAP — adjunto; guías de salida (sin importador específico).

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\1. Sustento Metrados\7. Nave Industrial\01. Sustento_Nave Industrial_Val08.xlsx
- Tipo / formato: xlsx · sustento metrados Nave.
- Hojas (16): 3. MOV | 4. EST | Met_MOV | Met_FZ | Met_ZAP | Met_PED | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa.
- Contenido: igual estructura que el Nave de VAL07, esta vez con cabecera correcta "PTARI CREDITEX" y supervisión DIRAC; las hojas 3.MOV/4.EST ahora incluyen columnas METRADO ANTERIOR / ACUM / ACTUAL.
- Números clave: volúmenes por elemento (m3/m2/KG) — ej. CM-01 excavación 3.04 m3.
- Propósito: respaldo metrados de la NAVE para VAL08.
- Origen -> Destino: cómputo de estructuras nave -> valorización nave/frente F2.
- Automatización: GAP — sustento detallado; frentes F1/F2 pendiente del RO.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\8. PTAR-VAL 08\GP-GCE-FOR-F07_VAL N°08.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07**. APUs F01.
- Hojas (9): Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | **6. Servicios**.
- Contenido: VAL08, periodo MARZO 2026 (16–31 mar), plazo 130 D.C. **4. VAL** (+235 filas). **6. Servicios** (lista: ADICIONAL DE ARQUITECTURA, TRÁMITE MUNICIPAL).
- Números clave: Monto referencial 2'866,414.72 / 2'429,165.02; Costo Directo 1'798,417.87; Presupuesto referencial 2'864,748.61. RO: Total Costo Obra 2'274,437.57 / quincenal 325,364.38 / acumulado 2'121,925.67; Costo Directo 1'798,417.87 / 257,268.49 / 1'677,825.36.
- Propósito: valorización quincenal de cobro VAL08 + RO interno + servicios/adicionales.
- Origen -> Destino: sustentos VAL08 -> cobro cliente; 5. RO -> control interno; 6. Servicios -> Adicionales.
- Automatización: módulo **Valorizaciones (cliente)** + **RO/CR/F06**; 6. Servicios -> **Adicionales/Deductivos**.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\1. Encofrado\01. Sustento_Encofrado_VAL09.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | Met_VIG | Met_Losa Maciza | 5. Sust. Fotografico.
- Contenido: ENCOFRADO VAL09 (periodo abril). **2. Sustento** (ANTERIOR/ACUMULADO/ACTUAL, pocas filas). **Met_VIG** (simple/doble, curado; V1 23.86 m2). **Met_Losa Maciza** (encofrado + curado).
- Números clave: V1 23.86 m2; pocos elementos (avance bajo en el periodo).
- Propósito: respaldo metrado encofrado VAL09.
- Origen -> Destino: cómputo de elementos -> partidas encofrado F07 VAL09.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\2. Acarreo con Camion Grua\01. Sustento_Acarreo Camion Grua_Val09.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento Metrados | 3. Report. de Guias | 4. Sust. Fotografico.
- Contenido: ACARREO C/CAMIÓN GRÚA VAL09. **2. Sustento Metrados** (FECHA/N°GUIA/N° HORAS/ANTERIOR/ACUMULADO/ACTUAL).
- Números clave: medición por horas.
- Propósito: respaldo partida acarreo camión grúa VAL09.
- Origen -> Destino: partes de horas/guías -> partida acarreo F07 VAL09.
- Automatización: GAP — adjunto; horas de equipo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\3. Arquitectura\Sustento_Arquitectura_Val09.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03**.
- Hojas: 1. Metrado | 2. Sustento | 3. Met_ARQ | 4. Sust. Fotografico.
- Contenido: ARQUITECTURA VAL09. **3. Met_ARQ** (+104 filas): IMPERMEABILIZACIÓN, LOSA DE FONDO; ej. LOSA OXIDACIÓN 13.75 x 18.62 -> 256.02 (m2). **2. Sustento** (UNIDAD/ANTERIOR/ACUMULADO/ACTUAL).
- Números clave: losa oxidación 256.02 m2.
- Propósito: respaldo metrado arquitectura/impermeabilización VAL09.
- Origen -> Destino: cómputo de arquitectura -> partidas F07 VAL09.
- Automatización: GAP — adjunto de respaldo.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\4. Eliminación de desmonte\01. Sustento_Eliminacion de desmonte_Val09.xlsx
- Tipo / formato: xlsx · sustento metrados **PRO-GCE-FOR-F03** (5 páginas).
- Hojas: 1. Metrado | 2. Sustento Elim. | 3. Guias de Salida | 4. Sustento Fotografico.
- Contenido: MOVIMIENTO DE TIERRAS / ELIMINACIÓN VAL09. **2. Sustento Elim.** (Fecha/Descripcion/Vol. m3). **3. Guias de Salida** (guías de salida; cliente "PRECOTEX SAC" por plantilla).
- Números clave: volúmenes de eliminación m3 (por volquetes).
- Propósito: respaldo metrado de eliminación de desmonte VAL09.
- Origen -> Destino: guías de salida -> partida eliminación F07 VAL09.
- Automatización: GAP — adjunto.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\1. Sustento de Metrados\5. Nave industrial\01. Sustento_Nave Industrial_Val09.xlsx
- Tipo / formato: xlsx · sustento metrados Nave.
- Hojas (16): 3. MOV | 4. EST | Met_MOV | Met_FZ | Met_ZAP | Met_PED | Placas | Escalera | Camara | Sobrecimientos | Cimiento corridos | bases | pedestales | cimientos armados | relleno rampa | losa rampa.
- Contenido: estructura completa de metrados de la NAVE VAL09 (igual a VAL07/08), con columnas ANTERIOR/ACUM/ACTUAL en 3.MOV/4.EST; cabecera "PTARI CREDITEX" / DIRAC.
- Números clave: volúmenes por elemento (m3/m2/KG); ej. CM-01 excavación 3.04 m3.
- Propósito: respaldo metrados de la NAVE para VAL09.
- Origen -> Destino: cómputo de estructuras nave -> valorización nave/frente F2.
- Automatización: GAP — sustento detallado.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\1. PTARI\9. PTAR-VAL 09\GP-GCE-FOR-F07_Val N°09.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07**. APUs F01.
- Hojas (9): Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos. | 6. Servicios.
- Contenido: VAL09, periodo ABRIL 2026 (01–15 abr), plazo 130 D.C. **4. VAL** (+261 filas). **6. Servicios** (ADICIONAL DE ARQUITECTURA, TRÁMITE MUNICIPAL).
- Números clave: RO: Total Costo Obra 2'328,290.71 / quincenal 115,269.95 / acumulado 2'237,195.62; Costo Directo 1'841,000.03 / 91,144.97 / 1'768,970.33.
- Propósito: valorización quincenal de cobro VAL09 + RO interno + servicios.
- Origen -> Destino: sustentos VAL09 -> cobro cliente; 5. RO -> control interno.
- Automatización: módulo **Valorizaciones (cliente)** + **RO/CR/F06**; 6. Servicios -> **Adicionales**.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\1. NAVE-VAL 01\GP-GCE-FOR-F07_CREDITEX NAVE-Val N°01.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** (valorización NAVE — frente independiente).
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: Obra "ESTRUCTURA METÁLICA Y LOSA COLABORANTE", Cliente CREDITEX, VAL N°01, periodo MAYO 2026 (01–15 may), plazo **75 D.C.**. **4. VAL** (+79 filas, presupuesto NAVE). **5. RO** vista interna.
- Números clave: Monto referencial 749,994.16 (inc. IGV) / 635,588.27 (no inc.); Costo Directo 545,588.27. RO: Total Costo Obra 689,998.95 / quincenal 291,168.81 / acumulado 291,168.81; Costo Directo 545,588.27 / 230,229.75 / 230,229.75.
- Propósito: valorización quincenal de cobro de la NAVE (frente F2), primer periodo.
- Origen -> Destino: metrados nave + presupuesto NAVE -> cobro al cliente; 5. RO -> control interno frente NAVE.
- Automatización: módulo **Valorizaciones (cliente)** segregado por frente (PTARI vs NAVE); 4. VAL y 5. RO -> **RO/CR/F06** con dimensión Frente F1/F2.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\2. NAVE-VAL 02\GP-GCE-FOR-F07_CREDITEX NAVE-VAL N°02 Rev.02.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** (NAVE), revisión 02.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: NAVE VAL N°02, periodo MAYO 2026 (16–31 may), plazo 75 D.C. **4. VAL** (+79 filas).
- Números clave: Monto referencial 749,994.16 / 635,588.27; Costo Directo 545,588.27. RO: Total Costo Obra 689,998.95 / quincenal 186,648.65 / acumulado 477,817.46; Costo Directo 545,588.27 / 147,584.73 / 377,814.48.
- Propósito: valorización quincenal de cobro de la NAVE, segundo periodo.
- Origen -> Destino: metrados nave -> cobro cliente; 5. RO -> control interno.
- Automatización: módulo **Valorizaciones (cliente)** (frente NAVE) + **RO/CR/F06**.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\3. NAVE-VAL 03\GP-GCE-FOR-F07_CREDITEX NAVE-VAL N°03.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** (NAVE).
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: NAVE VAL N°03, periodo JUNIO 2026 (01–15 jun), plazo 75 D.C. **4. VAL** (+79 filas).
- Números clave: Monto referencial 749,994.16 / 635,588.27; Costo Directo 545,588.27. RO: Total Costo Obra 689,998.95 / quincenal 111,918.59 / acumulado 589,736.05; Costo Directo 545,588.27 / 88,495.02 / 466,309.50.
- Propósito: valorización quincenal de cobro de la NAVE, tercer periodo.
- Origen -> Destino: metrados nave -> cobro cliente; 5. RO -> control interno.
- Automatización: módulo **Valorizaciones (cliente)** (frente NAVE) + **RO/CR/F06**.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\1. Valorizaciones\2. NAVE\4. NAVE-LIQUIDACION\GP-GCE-FOR-F07_CREDITEX NAVE-LIQUIDACION.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** (LIQUIDACIÓN de la NAVE).
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. APUs Nuevos | 5. RO | 6. APUs Nuevos.
- Contenido: LIQUIDACIÓN NAVE, periodo JUNIO 2026 (16–30 jun), plazo 75 D.C. Cierre final del frente NAVE. **4. VAL** (+79 filas).
- Números clave: Monto referencial **791,567.50** (inc. IGV) / 670,819.92 (no inc.); Costo Directo 580,819.91 (sube respecto a VAL01-03 por liquidación). RO: Total Costo Obra 734,556.00 / del periodo 100,262.90 / acumulado final 689,998.95; Costo Directo 580,819.91 / 79,278.76 / 545,588.27 (acumulado final = total CD ejecutado).
- Propósito: liquidación/cierre del contrato de la NAVE (saldo final a cobrar).
- Origen -> Destino: acumulado de VAL01-03 + saldos -> liquidación final al cliente; 5. RO -> resultado operativo final del frente NAVE.
- Automatización: módulo **Valorizaciones (cliente)** estado "Liquidación"; alimenta cierre del **RO** frente NAVE.

---

### \05. Gestión Costos\7. Valorizaciones\1. Cliente\2. Adicionales\GP-GCE-FOR-F07_VAL-ADICIONALES N°01,02,03 2025.12.15.xlsx
- Tipo / formato: xlsx · **GP-GCE-FOR-F07** aplicado a ADICIONALES.
- Hojas: Carátula | 1. RESUMEN | 2. PAGOS | 3. RES.VAL | 4. VAL | 5. RO | Hoja1 | Hoja 8.
- Contenido: VALORIZACIÓN DE ADICIONALES N°01 (engloba 01, 02, 03), periodo DICIEMBRE 2025 (01–13 dic), plazo 130 D.C., presupuesto "ADICIONALES N°01, N°02 Y N°03". **4. VAL** (+54 filas, adicionales). **5. RO** (con errores #DIV/0! y costos directos en 0 — plantilla no consolidada para adicionales). **Hoja1** (cómputo de áreas: LONGITUD/ALTO/AREA; total 286.80 m2). **Hoja 8** (flujo por SEMANAS: VIENEN, EGRESOS por Sem 1..24 — esqueleto de **flujo de caja**; mayoría en 0 y #REF!).
- Números clave: Costo Directo adicionales 12,769.22; presupuesto adicionales (referencial) 3,379.86 (RO, con error de cálculo); área computada 286.80 m2.
- Propósito: valorización de adicionales (mayores metrados/partidas nuevas) ante el cliente + esbozo de flujo de caja por semanas.
- Origen -> Destino: APUs nuevos/adicionales aprobados -> cobro de adicionales; Hoja 8 -> intento de flujo de caja semanal.
- Automatización: módulo **Adicionales/Deductivos** (4. VAL y APUs). **Hoja 8 = GAP Flujo de Caja** (gap conocido): estructura semanal EGRESOS por rubro es candidata para el futuro importador de **Flujo de Caja**.

---

## Resumen de automatización del chunk
- **A importador Valorizaciones (cliente) + RO/CR/F06 (EVM)**: las 7 valorizaciones GP-GCE-FOR-F07 (PTARI VAL06/07/08/09 + NAVE VAL01/02/03 + Liquidación). Hojas clave: "4. VAL" (avance por partida anterior/actual/acumulado) y "5. RO" (costo de obra por frente/partida quincenal y acumulado). Requiere dimensión Frente F1 (PTARI) / F2 (NAVE) — pendiente conocido del RO.
- **A Adicionales/Deductivos**: archivo de Adicionales N°01-03 + hojas "6. Servicios" de VAL08/09 (Adicional de Arquitectura, Trámite Municipal) + APUs Nuevos (F01).
- **GAP Flujo de Caja**: "Hoja 8" del archivo de Adicionales (egresos semanales Sem 1..24).
- **GAP sustentos de metrados** (PRO-GCE-FOR-F03): 13 archivos de respaldo (concreto/encofrado/acero/acarreo/cordón/arquitectura/excavación/nave). No tienen importador; van como adjunto/evidencia de la partida valorizada. Las guías (concreto, acero, salida de volquetes, camión grúa) son candidatas a futura ingestión hacia Almacén/control de equipos.
