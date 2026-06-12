import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { crearResolverNombre } from '../utils/nombresCanonicos';

const styles = StyleSheet.create({
  page: {
    padding: 12,
    pageSize: 'A4',
    pageOrientation: 'landscape',
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  headerLogo: {
    width: '25%',
  },
  headerTitle: {
    width: '50%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerDate: {
    width: '25%',
    textAlign: 'right',
    fontSize: 9,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 12,
    paddingLeft: 2,
  },
  activitiesSection: {
    marginBottom: 6,
    fontSize: 7,
    fontWeight: 'bold',
  },
  activitiesContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  activityColumn: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
    minHeight: 12,
  },
  activityNum: {
    width: '35%',
    borderRightWidth: 0.5,
    borderRightColor: '#999',
    paddingHorizontal: 2,
    fontSize: 7,
  },
  activityName: {
    width: '65%',
    paddingHorizontal: 2,
    fontSize: 7,
  },
  table: {
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    backgroundColor: '#f0f0f0',
    minHeight: 14,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
    minHeight: 12,
  },
  tableCell: {
    borderRightWidth: 0.5,
    borderRightColor: '#999',
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
  },
  tableCellHeader: {
    borderRightWidth: 0.5,
    borderRightColor: '#999',
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    fontSize: 6,
  },
  footerSignatures: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-around',
  },
  signatureLine: {
    width: '32%',
    alignItems: 'center',
  },
  signatureSpace: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    height: 20,
    marginBottom: 2,
  },
  signatureLabel: {
    fontSize: 7,
    textAlign: 'center',
  },
});

export default function TareoPDF({ registrosPorDia, personalDB, ruc = '20203071702', proyectoNombre = 'PROYECTO' }) {
  const resolverNombre = React.useMemo(
    () => crearResolverNombre(Object.values(registrosPorDia).flat() || [], personalDB || []),
    [registrosPorDia, personalDB],
  );

  const fichaPorCanonico = React.useMemo(() => {
    const m = {};
    (personalDB || []).forEach(p => {
      if (!p?.nombre) return;
      const c = resolverNombre(p.nombre);
      if (c && !m[c]) m[c] = p;
    });
    return m;
  }, [personalDB, resolverNombre]);

  return (
    <Document>
      {Object.entries(registrosPorDia).map(([fechaCapKey, registros]) => {
        const [fecha, capataz] = fechaCapKey.split('__');
        if (!registros.length) return null;

        // Agrupar trabajadores por nombre canónico (sin duplicar)
        const trabajadoresMap = {};
        registros.forEach(r => {
          (r.detalleTareo || []).forEach(t => {
            if (!t?.nombre) return;
            const nomKey = resolverNombre(t.nombre);
            if (!trabajadoresMap[nomKey]) {
              const ficha = fichaPorCanonico[nomKey];
              trabajadoresMap[nomKey] = {
                nombre: nomKey,
                dni: ficha?.dni || '',
                cargo: ficha?.cargo || 'OP',
                actividades: {},
                totHN: 0,
                totHE: 0,
              };
            }
            const act = r._actividadCanonica || r.actividad;
            trabajadoresMap[nomKey].actividades[act] = (trabajadoresMap[nomKey].actividades[act] || 0) + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
            trabajadoresMap[nomKey].totHN += parseFloat(t.hn) || 0;
            trabajadoresMap[nomKey].totHE += parseFloat(t.he) || 0;
          });
        });

        const trabajadores = Object.values(trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const todasActividades = [...new Set(registros.flatMap(r => [(r._actividadCanonica || r.actividad)]))].slice(0, 14);

        return (
          <Page key={fechaCapKey} style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLogo}>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>GRAPCO</Text>
                <Text style={{ fontSize: 6 }}>RUC: {ruc}</Text>
              </View>
              <View style={styles.headerTitle}>
                <Text>TAREO DIARIO</Text>
              </View>
              <View style={styles.headerDate}>
                <Text>FECHA: {fecha}</Text>
              </View>
            </View>

            {/* Info row 1 */}
            <View style={styles.infoRow}>
              <View style={{ ...styles.infoBlock, flex: 0.25 }}>
                <Text style={styles.infoLabel}>SUPERVISOR:</Text>
                <View style={styles.infoBorder} />
              </View>
              <View style={{ ...styles.infoBlock, flex: 0.25 }}>
                <Text style={styles.infoLabel}>ZONA:</Text>
                <View style={styles.infoBorder} />
              </View>
              <View style={{ ...styles.infoBlock, flex: 0.5 }}>
                <Text style={styles.infoLabel}>HORARIO DE TRABAJO</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 6 }}>INICIO</Text>
                    <View style={styles.infoBorder} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 6 }}>FIN</Text>
                    <View style={styles.infoBorder} />
                  </View>
                </View>
              </View>
            </View>

            {/* Info row 2 */}
            <View style={styles.infoRow}>
              <View style={{ ...styles.infoBlock, flex: 0.25 }}>
                <Text style={styles.infoLabel}>CUADRILLA:</Text>
                <View style={styles.infoBorder}>
                  <Text style={{ fontSize: 8 }}>{capataz}</Text>
                </View>
              </View>
              <View style={{ ...styles.infoBlock, flex: 0.25 }}>
                <Text style={styles.infoLabel}>SECTOR:</Text>
                <View style={styles.infoBorder} />
              </View>
              <View style={{ ...styles.infoBlock, flex: 0.25 }}>
                <Text style={styles.infoLabel}>JORNADA:</Text>
                <View style={styles.infoBorder} />
              </View>
              <View style={{ ...styles.infoBlock, flex: 0.25 }}>
                <Text style={styles.infoLabel}>REFRIGERIO:</Text>
                <View style={styles.infoBorder} />
              </View>
            </View>

            {/* Activities */}
            <Text style={styles.activitiesSection}>CUENTA DE COSTO (Fase)</Text>
            <View style={styles.activitiesContainer}>
              <View style={styles.activityColumn}>
                {todasActividades.slice(0, 7).map((act, i) => (
                  <View key={i} style={styles.activityItem}>
                    <Text style={styles.activityNum}>Act. {i + 1}</Text>
                    <Text style={styles.activityName}>{act}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.activityColumn}>
                {todasActividades.slice(7, 14).map((act, i) => (
                  <View key={i + 7} style={styles.activityItem}>
                    <Text style={styles.activityNum}>Act. {i + 8}</Text>
                    <Text style={styles.activityName}>{act}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Workers table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.tableCellHeader, width: '4%' }}>COD</Text>
                <Text style={{ ...styles.tableCellHeader, width: '6%' }}>CAR.</Text>
                <Text style={{ ...styles.tableCellHeader, width: '7%' }}>OCP</Text>
                <Text style={{ ...styles.tableCellHeader, width: '10%' }}>DNI</Text>
                <Text style={{ ...styles.tableCellHeader, width: '28%' }}>TRABAJADORES</Text>
                {todasActividades.map((_, i) => (
                  <Text key={`h${i}`} style={{ ...styles.tableCellHeader, width: '2.5%' }}>{i + 1}</Text>
                ))}
                <Text style={{ ...styles.tableCellHeader, width: '5%' }}>TOT</Text>
              </View>

              {trabajadores.map((t, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={{ ...styles.tableCell, width: '4%' }}>
                    <Text>{idx + 1}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, width: '6%' }}>
                    <Text>{t.cargo.slice(0, 3).toUpperCase()}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, width: '7%' }}>
                    <Text>{t.cargo.toUpperCase()}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, width: '10%' }}>
                    <Text>{t.dni}</Text>
                  </View>
                  <View style={{ ...styles.tableCell, width: '28%' }}>
                    <Text>{t.nombre}</Text>
                  </View>
                  {todasActividades.map((act, i) => (
                    <View key={i} style={{ ...styles.tableCell, width: '2.5%' }}>
                      <Text>{t.actividades[act] ? t.actividades[act].toFixed(1) : ''}</Text>
                    </View>
                  ))}
                  <View style={{ ...styles.tableCell, width: '5%' }}>
                    <Text>{(t.totHN + t.totHE).toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Signatures */}
            <View style={styles.footerSignatures}>
              <View style={styles.signatureLine}>
                <View style={styles.signatureSpace} />
                <Text style={styles.signatureLabel}>MAESTRO</Text>
              </View>
              <View style={styles.signatureLine}>
                <View style={styles.signatureSpace} />
                <Text style={styles.signatureLabel}>INGENIERO DE PRODUCCIÓN</Text>
              </View>
              <View style={styles.signatureLine}>
                <View style={styles.signatureSpace} />
                <Text style={styles.signatureLabel}>INGENIERO RESIDENTE</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function generarPDFTareo(registrosPorDia, personalDB, ruc, proyectoNombre) {
  try {
    const doc = <TareoPDF registrosPorDia={registrosPorDia} personalDB={personalDB} ruc={ruc} proyectoNombre={proyectoNombre} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (err) {
    console.error('Error generando PDF:', err);
    throw err;
  }
}
