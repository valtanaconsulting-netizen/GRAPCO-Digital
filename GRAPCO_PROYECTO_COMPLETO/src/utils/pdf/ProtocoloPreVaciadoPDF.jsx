/* eslint-disable react-refresh/only-export-components */
// src/utils/pdf/ProtocoloPreVaciadoPDF.jsx
// Plantilla PDF CAL-FOR-006 · Liberación de Pre-Vaciado de Concreto.
// Calcada pixel a pixel al formato corporativo GRAPCO.
// Se rellena con datos del protocolo y se descarga para imprimir, firmar a mano (5 firmas)
// y luego escanear → subir → archivar automático (Storage + Drive + Sheets).
//
// Nota: este archivo expone el componente <ProtocoloPreVaciadoPDF> y un helper
// `descargarProtocoloPreVaciadoPDF`. La conviven a propósito porque el helper
// usa el componente. La regla react-refresh/only-export-components no aplica
// (este módulo no participa de HMR — solo se invoca on-demand al descargar).

import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, pdf,
} from '@react-pdf/renderer';
import { CHECKLIST_PREVACIADO, FIRMANTES_PREVACIADO } from '../calidadOTAnalytics';

// Paleta exacta del formato (negro grilla + amarillo cabecera GRAPCO).
const GOLD   = '#FFC72C';   // ámbar del formato impreso (más vivo que el navy gold premium UI)
const BORDER = '#000000';
const TEXT   = '#000000';
const MUTED  = '#222222';

const s = StyleSheet.create({
  page: {
    padding: 18,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: TEXT,
    lineHeight: 1.2,
  },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
    minHeight: 50,
  },
  headerLogo: {
    width: '20%',
    borderRightWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    padding: 4,
  },
  logoImg: { width: 80, height: 38, objectFit: 'contain' },
  headerTitle: {
    width: '55%',
    backgroundColor: GOLD,
    borderRightWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    padding: 4,
  },
  headerTitleText: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', color: TEXT },
  headerMeta: {
    width: '25%',
    flexDirection: 'column',
  },
  headerMetaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 16,
  },
  headerMetaRowLast: { borderBottomWidth: 0 },
  headerMetaLabel: {
    width: '50%',
    backgroundColor: GOLD,
    borderRightWidth: 1, borderColor: BORDER,
    padding: 3,
    fontSize: 7, fontWeight: 'bold',
  },
  headerMetaValue: {
    width: '50%',
    padding: 3,
    fontSize: 7,
  },

  // ── ROWS comunes ──
  row: { flexDirection: 'row' },
  band: {
    backgroundColor: GOLD,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 3,
    fontSize: 8,
    borderColor: BORDER,
  },
  cellBox: {
    borderColor: BORDER,
    padding: 3,
    fontSize: 8,
  },
  // Borde compuesto helper (todos los lados se controlan abajo)
  bAll:   { borderWidth: 1, borderColor: BORDER },
  bTop:   { borderTopWidth: 1, borderColor: BORDER },
  bBot:   { borderBottomWidth: 1, borderColor: BORDER },
  bLeft:  { borderLeftWidth: 1, borderColor: BORDER },
  bRight: { borderRightWidth: 1, borderColor: BORDER },

  // ── DATOS GENERALES ──
  bandRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
  },
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 22,
  },
  col3: { width: '33.33%', borderRightWidth: 1, borderColor: BORDER, padding: 3, justifyContent: 'center' },
  col3Last: { width: '33.34%', padding: 3, justifyContent: 'center' },

  // 5 columnas: Estructura | Ejes | Nivel | Sector/Sub | N°Registro
  col5Estructura: { width: '32%', borderRightWidth: 1, borderColor: BORDER, padding: 3, justifyContent: 'center' },
  col5Ejes:       { width: '12%', borderRightWidth: 1, borderColor: BORDER, padding: 3, justifyContent: 'center' },
  col5Nivel:      { width: '12%', borderRightWidth: 1, borderColor: BORDER, padding: 3, justifyContent: 'center' },
  col5Sector:     { width: '24%', borderRightWidth: 1, borderColor: BORDER, padding: 3, justifyContent: 'center' },
  col5Registro:   { width: '20%', padding: 3, justifyContent: 'center' },

  cellLabel: { fontSize: 7, fontWeight: 'bold', textAlign: 'center' },
  cellValue: { fontSize: 9, fontWeight: 'bold', textAlign: 'center' },

  // ── CHECK LIST datos generales (f'c, volumen, plano, probetas / tipo concreto, slump, fecha) ──
  fieldGridRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 18,
  },
  fLabel: {
    fontSize: 7, fontWeight: 'bold',
    paddingRight: 3,
  },
  fInputBox: {
    flex: 1, padding: 3, justifyContent: 'center',
  },

  // ── TABLA 10 ITEMS ──
  tblHeader: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    backgroundColor: GOLD,
  },
  tblRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 16,
  },
  thItem:  { width: '6%',  borderRightWidth: 1, borderColor: BORDER, padding: 3, fontWeight: 'bold', fontSize: 7, textAlign: 'center' },
  thAct:   { width: '49%', borderRightWidth: 1, borderColor: BORDER, padding: 3, fontWeight: 'bold', fontSize: 7, textAlign: 'center' },
  thConf:  { width: '21%', borderRightWidth: 1, borderColor: BORDER, padding: 0, fontWeight: 'bold', fontSize: 7 },
  thObs:   { width: '24%', padding: 3, fontWeight: 'bold', fontSize: 7, textAlign: 'center' },

  thConfTitle: { padding: 2, textAlign: 'center', borderBottomWidth: 1, borderColor: BORDER, fontWeight: 'bold', fontSize: 7 },
  thConfSubRow: { flexDirection: 'row' },
  thConfSub: { width: '33.33%', padding: 2, textAlign: 'center', fontWeight: 'bold', fontSize: 7, borderRightWidth: 1, borderColor: BORDER },
  thConfSubLast: { width: '33.34%', padding: 2, textAlign: 'center', fontWeight: 'bold', fontSize: 7 },

  tdItem:  { width: '6%',  borderRightWidth: 1, borderColor: BORDER, padding: 3, fontSize: 8, textAlign: 'center' },
  tdAct:   { width: '49%', borderRightWidth: 1, borderColor: BORDER, padding: 3, fontSize: 8 },
  tdConf:  { width: '21%', borderRightWidth: 1, borderColor: BORDER, flexDirection: 'row' },
  tdConfCell: { width: '33.33%', borderRightWidth: 1, borderColor: BORDER, padding: 2, alignItems: 'center', justifyContent: 'center', fontSize: 9 },
  tdConfCellLast: { width: '33.34%', padding: 2, alignItems: 'center', justifyContent: 'center', fontSize: 9 },
  tdObs:   { width: '24%', padding: 3, fontSize: 8 },

  // ── OBSERVACIONES / SE ADJUNTA PLANOS ──
  obsHeader: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    backgroundColor: GOLD,
  },
  obsHeaderObs: { width: '60%', borderRightWidth: 1, borderColor: BORDER, padding: 3, fontWeight: 'bold', fontSize: 7 },
  obsHeaderPlanos: { width: '40%', padding: 3, fontWeight: 'bold', fontSize: 7 },
  obsRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 14,
  },
  obsCellL: { width: '60%', borderRightWidth: 1, borderColor: BORDER, padding: 3, fontSize: 8 },
  obsCellR: { width: '40%', padding: 3, fontSize: 8 },

  // ── TABLA GUIAS DE REMISIÓN ──
  guiaH: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    backgroundColor: GOLD,
  },
  guiaR: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 14,
  },
  gth: { padding: 3, fontWeight: 'bold', fontSize: 7, textAlign: 'center', borderRightWidth: 1, borderColor: BORDER },
  gthLast: { padding: 3, fontWeight: 'bold', fontSize: 7, textAlign: 'center' },
  gtd: { padding: 3, fontSize: 8, textAlign: 'center', borderRightWidth: 1, borderColor: BORDER },
  gtdLast: { padding: 3, fontSize: 8, textAlign: 'center' },

  // ── FIRMAS ──
  firmaTitle: {
    backgroundColor: GOLD, padding: 4, textAlign: 'center',
    fontWeight: 'bold', fontSize: 9,
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
  },
  firmasRow: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    backgroundColor: GOLD,
  },
  firmaRolCell: { padding: 4, fontWeight: 'bold', fontSize: 8, textAlign: 'center', borderRightWidth: 1, borderColor: BORDER },
  firmaRolCellLast: { padding: 4, fontWeight: 'bold', fontSize: 8, textAlign: 'center' },
  firmasBody: {
    flexDirection: 'row',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    minHeight: 70,
  },
  firmaCol: {
    padding: 4,
    borderRightWidth: 1, borderColor: BORDER,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  firmaColLast: {
    padding: 4,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  firmaLine: { fontSize: 7, marginBottom: 2 },
  firmaImg:  { width: 70, height: 24, objectFit: 'contain', marginVertical: 1 },

  // Helpers de ancho 5 columnas firmas
  w20:     { width: '20%' },
  w20Last: { width: '20%' },
});

// Helper para "marcar" SI / NO / N/A según el valor del item
const marcaConformidad = (item, opcion) => {
  if (!item) return '';
  if (opcion === 'SI'  && item.valor === 'OK')    return 'X';
  if (opcion === 'NO'  && item.valor === 'NO_OK') return 'X';
  if (opcion === 'N/A' && item.valor === 'NA')    return 'X';
  return '';
};

const tipoConcretoMarca = (data, opcion) => {
  if (!data?.tipoConcreto) return '☐';
  if (data.tipoConcreto === opcion) return '☒';
  return '☐';
};

const fmtFecha = (f) => {
  if (!f) return '';
  if (typeof f === 'string') return f;
  const d = new Date(f);
  return isNaN(d) ? '' : d.toLocaleDateString('es-PE');
};

// Genera un array de N filas (algunas vacías) — el formato real tiene filas en blanco siempre
const padFilas = (arr = [], minRows = 4, factory = () => ({})) => {
  const out = [...arr];
  while (out.length < minRows) out.push(factory());
  return out;
};

/**
 * Componente principal — recibe el doc del protocolo.
 * `data` = doc Firestore + opcionalmente `logoUrl` (default: /brand/grapco-192.png)
 */
export function ProtocoloPreVaciadoPDF({ data = {}, logoUrl = '/brand/grapco-192.png' }) {
  const items = (data.checklist?.length ? data.checklist : CHECKLIST_PREVACIADO.map(c => ({ ...c, valor: 'NO_LLENADO', obs: '' })));
  const guias = padFilas(data.guias || [], 5, () => ({ numGuia: '', placa: '', hSalida: '', hLlegada: '', hInicio: '', hFin: '' }));
  const obsLines = padFilas((data.observaciones || '').split('\n').filter(Boolean).map(o => ({ obs: o })), 4, () => ({ obs: '' }));

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ════ HEADER ════ */}
        <View style={s.header}>
          <View style={s.headerLogo}>
            {logoUrl ? <Image src={logoUrl} style={s.logoImg} /> : <Text style={{fontSize: 10, fontWeight: 'bold'}}>GRAPCO</Text>}
          </View>
          <View style={s.headerTitle}>
            <Text style={s.headerTitleText}>LIBERACIÓN DE PRE - VACIADO DE CONCRETO</Text>
          </View>
          <View style={s.headerMeta}>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>CÓDIGO:</Text>
              <Text style={s.headerMetaValue}>CAL-FOR-006</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>VERSIÓN:</Text>
              <Text style={s.headerMetaValue}>{data.versionFormato || '1.00'}</Text>
            </View>
            <View style={[s.headerMetaRow, s.headerMetaRowLast]}>
              <Text style={s.headerMetaLabel}>PÁGINA:</Text>
              <Text style={s.headerMetaValue}>1 DE 1</Text>
            </View>
          </View>
        </View>

        {/* ════ PROYECTO / CLIENTE / SUPERVISION ════ */}
        <View style={s.bandRow}>
          <Text style={[s.band, { width: '33.33%', borderRightWidth: 1 }]}>PROYECTO / OBRA</Text>
          <Text style={[s.band, { width: '33.33%', borderRightWidth: 1 }]}>CLIENTE / PROPIETARIO</Text>
          <Text style={[s.band, { width: '33.34%' }]}>SUPERVISIÓN DEL PROYECTO</Text>
        </View>
        <View style={s.dataRow}>
          <View style={s.col3}><Text style={s.cellValue}>{data.proyecto || ''}</Text></View>
          <View style={s.col3}><Text style={s.cellValue}>{data.cliente || ''}</Text></View>
          <View style={s.col3Last}><Text style={s.cellValue}>{data.supervision || ''}</Text></View>
        </View>

        {/* ════ ESTRUCTURA / EJES / NIVEL / SECTOR / N°REGISTRO ════ */}
        <View style={s.bandRow}>
          <Text style={[s.band, { width: '32%', borderRightWidth: 1 }]}>ESTRUCTURA / ELEMENTO</Text>
          <Text style={[s.band, { width: '12%', borderRightWidth: 1 }]}>EJES</Text>
          <Text style={[s.band, { width: '12%', borderRightWidth: 1 }]}>NIVEL</Text>
          <Text style={[s.band, { width: '24%', borderRightWidth: 1 }]}>SECTOR / SUB-SECTOR</Text>
          <Text style={[s.band, { width: '20%' }]}>N° REGISTRO</Text>
        </View>
        <View style={s.dataRow}>
          <View style={s.col5Estructura}><Text style={s.cellValue}>{data.estructuraElemento || ''}</Text></View>
          <View style={s.col5Ejes}><Text style={s.cellValue}>{data.ejes || ''}</Text></View>
          <View style={s.col5Nivel}><Text style={s.cellValue}>{data.nivel || ''}</Text></View>
          <View style={s.col5Sector}><Text style={s.cellValue}>{data.sectorSubSector || ''}</Text></View>
          <View style={s.col5Registro}><Text style={[s.cellValue, { color: '#b91c1c' }]}>{data.numeroRegistro || ''}</Text></View>
        </View>

        {/* ════ TITULO CHECK LIST DE PRE VACIADO ════ */}
        <View style={{
          borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
          backgroundColor: GOLD, padding: 4,
        }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>
            CHECK LIST DE PRE VACIADO DE CONCRETO
          </Text>
        </View>

        {/* Fila 1: f'c · volumen · plano ref · n° probetas */}
        <View style={s.fieldGridRow}>
          <View style={[s.fInputBox, { width: '25%', borderRightWidth: 1, borderColor: BORDER, flexDirection: 'row' }]}>
            <Text style={s.fLabel}>RESISTENCIA (f'c):</Text>
            <Text>{data.fc || ''}</Text>
          </View>
          <View style={[s.fInputBox, { width: '25%', borderRightWidth: 1, borderColor: BORDER, flexDirection: 'row' }]}>
            <Text style={s.fLabel}>VOLUMEN:</Text>
            <Text>{data.volumen || ''}</Text>
          </View>
          <View style={[s.fInputBox, { width: '25%', borderRightWidth: 1, borderColor: BORDER, flexDirection: 'row' }]}>
            <Text style={s.fLabel}>PLANO DE REF:</Text>
            <Text>{data.planoRef || ''}</Text>
          </View>
          <View style={[s.fInputBox, { width: '25%', flexDirection: 'row' }]}>
            <Text style={s.fLabel}>N° PROBETAS:</Text>
            <Text>{data.numProbetas || ''}</Text>
          </View>
        </View>

        {/* Fila 2: TIPO CONCRETO IN SITU ☐ PREMEZCLADO ☐ | SLUMP | FECHA */}
        <View style={s.fieldGridRow}>
          <View style={[s.fInputBox, { width: '50%', borderRightWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={s.fLabel}>TIPO DE CONCRETO:</Text>
            <Text style={{ marginLeft: 4 }}>IN SITU</Text>
            <Text style={{ marginLeft: 2, fontSize: 11 }}>{tipoConcretoMarca(data, 'insitu')}</Text>
            <Text style={{ marginLeft: 8 }}>PREMEZCLADO</Text>
            <Text style={{ marginLeft: 2, fontSize: 11 }}>{tipoConcretoMarca(data, 'premezclado')}</Text>
          </View>
          <View style={[s.fInputBox, { width: '25%', borderRightWidth: 1, borderColor: BORDER, flexDirection: 'row' }]}>
            <Text style={s.fLabel}>SLUMP DE DISEÑO:</Text>
            <Text>{data.slumpDiseno || ''}</Text>
          </View>
          <View style={[s.fInputBox, { width: '25%', flexDirection: 'row' }]}>
            <Text style={s.fLabel}>FECHA:</Text>
            <Text>{fmtFecha(data.fechaVaciado)}</Text>
          </View>
        </View>

        {/* ════ TABLA 10 ITEMS ════ */}
        <View style={s.tblHeader}>
          <Text style={s.thItem}>ITEM</Text>
          <Text style={s.thAct}>ACTIVIDADES</Text>
          <View style={s.thConf}>
            <Text style={s.thConfTitle}>CONFORMIDAD</Text>
            <View style={s.thConfSubRow}>
              <Text style={s.thConfSub}>SI</Text>
              <Text style={s.thConfSub}>NO</Text>
              <Text style={s.thConfSubLast}>N/A</Text>
            </View>
          </View>
          <Text style={s.thObs}>OBSERVACIONES</Text>
        </View>

        {items.map((it, idx) => (
          <View key={idx} style={s.tblRow}>
            <Text style={s.tdItem}>{idx + 1}</Text>
            <Text style={s.tdAct}>{it.item}</Text>
            <View style={s.tdConf}>
              <View style={s.tdConfCell}><Text>{marcaConformidad(it, 'SI')}</Text></View>
              <View style={s.tdConfCell}><Text>{marcaConformidad(it, 'NO')}</Text></View>
              <View style={s.tdConfCellLast}><Text>{marcaConformidad(it, 'N/A')}</Text></View>
            </View>
            <Text style={s.tdObs}>{it.obs || ''}</Text>
          </View>
        ))}

        {/* ════ OBSERVACIONES / SE ADJUNTA PLANOS ════ */}
        <View style={s.obsHeader}>
          <Text style={s.obsHeaderObs}>OBSERVACIONES Y/O COMENTARIOS</Text>
          <Text style={s.obsHeaderPlanos}>SE ADJUNTA PLANOS</Text>
        </View>
        {obsLines.map((o, i) => (
          <View key={i} style={s.obsRow}>
            <Text style={s.obsCellL}>{o.obs || ''}</Text>
            <Text style={s.obsCellR}>{i === 0 && data.seAdjuntaPlanos ? 'SÍ' : ''}</Text>
          </View>
        ))}

        {/* ════ TABLA GUIAS DE REMISION ════ */}
        <View style={{ height: 4 }} />
        <View style={s.guiaH}>
          <Text style={[s.gth, { width: '16%' }]}>N° DE GUÍA</Text>
          <Text style={[s.gth, { width: '13%' }]}>N° PLACA</Text>
          <Text style={[s.gth, { width: '18%' }]}>H. SALIDA DE PLANTA</Text>
          <Text style={[s.gth, { width: '17%' }]}>H. LLEGADA A OBRA</Text>
          <Text style={[s.gth, { width: '18%' }]}>H. INICIO DE VACIADO</Text>
          <Text style={[s.gthLast, { width: '18%' }]}>H. FIN DE VACIADO</Text>
        </View>
        {guias.map((g, i) => (
          <View key={i} style={s.guiaR}>
            <Text style={[s.gtd, { width: '16%' }]}>{g.numGuia || ''}</Text>
            <Text style={[s.gtd, { width: '13%' }]}>{g.placa || ''}</Text>
            <Text style={[s.gtd, { width: '18%' }]}>{g.hSalida || ''}</Text>
            <Text style={[s.gtd, { width: '17%' }]}>{g.hLlegada || ''}</Text>
            <Text style={[s.gtd, { width: '18%' }]}>{g.hInicio || ''}</Text>
            <Text style={[s.gtdLast, { width: '18%' }]}>{g.hFin || ''}</Text>
          </View>
        ))}

        {/* ════ REVISADO Y APROBADO POR ════ */}
        <View style={{ height: 6 }} />
        <Text style={s.firmaTitle}>REVISADO Y APROBADO POR:</Text>
        <View style={s.firmasRow}>
          {FIRMANTES_PREVACIADO.map((f, i) => (
            <Text
              key={i}
              style={[
                i === FIRMANTES_PREVACIADO.length - 1 ? s.firmaRolCellLast : s.firmaRolCell,
                { width: '20%' },
              ]}
            >
              {f.rol.toUpperCase()}
            </Text>
          ))}
        </View>
        <View style={s.firmasBody}>
          {FIRMANTES_PREVACIADO.map((f, i) => {
            const firma = data[f.campo] || {};
            const last = i === FIRMANTES_PREVACIADO.length - 1;
            return (
              <View key={i} style={[last ? s.firmaColLast : s.firmaCol, { width: '20%' }]}>
                <View>
                  <Text style={s.firmaLine}>Nombre: {firma.nombre || ''}</Text>
                  <Text style={s.firmaLine}>Firma:</Text>
                  {firma.dataUrl ? <Image src={firma.dataUrl} style={s.firmaImg} /> : null}
                </View>
                <Text style={s.firmaLine}>Fecha: {fmtFecha(firma.fecha)}</Text>
              </View>
            );
          })}
        </View>

      </Page>
    </Document>
  );
}

/** Genera el PDF oficial CAL-FOR-006 como Blob (sin descargar). Reutilizable para Drive/Storage. */
export async function blobProtocoloPreVaciadoPDF(data) {
  return pdf(<ProtocoloPreVaciadoPDF data={data} />).toBlob();
}

/**
 * Genera el PDF como blob y dispara la descarga en el navegador.
 * Llamar desde el botón "Generar PDF para firma".
 */
export async function descargarProtocoloPreVaciadoPDF(data) {
  const blob = await blobProtocoloPreVaciadoPDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.numeroRegistro || 'CAL-FOR-006'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default ProtocoloPreVaciadoPDF;
