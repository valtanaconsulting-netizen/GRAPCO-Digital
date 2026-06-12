import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { crearResolverNombre } from '../utils/nombresCanonicos';

const styles = StyleSheet.create({
  page: {
    padding: [10, 15],
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
    gap: 10,
  },
  logo: {
    width: 50,
    height: 50,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  rucText: {
    fontSize: 7,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 6,
  },
  infoGrid: {
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'stretch',
  },
  infoCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'flex-start',
  },
  infoCellLabel: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  infoCellValue: {
    fontSize: 8,
    marginTop: 2,
    minHeight: 12,
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 3,
    marginTop: 4,
  },
  activitiesGrid: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  activityColumn: {
    flex: 1,
  },
  activityRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 14,
  },
  activityNum: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 1,
    justifyContent: 'center',
    fontSize: 7,
    fontWeight: 'bold',
  },
  activityName: {
    width: '60%',
    paddingHorizontal: 3,
    paddingVertical: 1,
    fontSize: 7,
  },
  tableContainer: {
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f5f5f5',
    minHeight: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 14,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 7,
  },
  tableCellHeader: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 6,
    fontWeight: 'bold',
  },
  footerSignatures: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-around',
  },
  signatureLine: {
    flex: 1,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 2,
    marginHorizontal: 4,
  },
  signatureLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

function TareoPDFContent({ registrosPorDia, personalDB, ruc, logoBase64 }) {
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

        // Agrupar trabajadores sin duplicar
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
              };
            }
            const act = r._actividadCanonica || r.actividad;
            trabajadoresMap[nomKey].actividades[act] = (trabajadoresMap[nomKey].actividades[act] || 0) + (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
          });
        });

        const trabajadores = Object.values(trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const todasActividades = [...new Set(registros.flatMap(r => [(r._actividadCanonica || r.actividad)]))].slice(0, 14);

        return (
          <Page key={fechaCapKey} size={[841.89, 595.28]} style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
              <View style={styles.headerInfo}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerText}>GRAPCO</Text>
                  <Text style={styles.rucText}>RUC: {ruc}</Text>
                </View>
                <View style={styles.headerCenter}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold' }}>TAREO DIARIO</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.rucText}>FECHA:</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{fecha}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>Supervisor:</Text>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <Text style={styles.infoCellLabel}>ZONA:</Text>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '50%' }}>
                  <Text style={styles.infoCellLabel}>HORARIO DE TRABAJO</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 6 }}>INICIO</Text>
                      <View style={{ minHeight: 8 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 6 }}>FIN</Text>
                      <View style={{ minHeight: 8 }} />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>CUADRILLA</Text>
                  <Text style={styles.infoCellValue}>{capataz}</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>SECTOR:</Text>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>NIVEL:</Text>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>Jornada:</Text>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>Refrigerio:</Text>
                  <View style={styles.infoCellValue} />
                </View>
              </View>
            </View>

            {/* Activities */}
            <Text style={styles.sectionTitle}>CUENTA DE COSTO (Fase)</Text>
            <View style={styles.activitiesGrid}>
              <View style={styles.activityColumn}>
                {todasActividades.slice(0, 7).map((act, i) => (
                  <View key={i} style={styles.activityRow}>
                    <View style={styles.activityNum}>
                      <Text>Act. {i + 1}</Text>
                    </View>
                    <View style={styles.activityName}>
                      <Text>{act}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.activityColumn}>
                {todasActividades.slice(7, 14).map((act, i) => (
                  <View key={i + 7} style={styles.activityRow}>
                    <View style={styles.activityNum}>
                      <Text>Act. {i + 8}</Text>
                    </View>
                    <View style={styles.activityName}>
                      <Text>{act}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Workers Table */}
            <Text style={styles.sectionTitle}>REFERENCIAS / TRABAJADORES / ACTIVIDADES / HORAS REALES</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={{ ...styles.tableCellHeader, width: '3%' }}>
                  <Text>COD</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '4%' }}>
                  <Text>CAR.</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '6%' }}>
                  <Text>OCUPACION</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '7%' }}>
                  <Text>DNI</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '22%' }}>
                  <Text>TRABAJADORES</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '6%' }}>
                  <Text>Hora Ingreso</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '6%' }}>
                  <Text>FIRMA INGRESO</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '6%' }}>
                  <Text>Hora Salida</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '6%' }}>
                  <Text>FIRMA SALIDA</Text>
                </View>
                {todasActividades.slice(0, 10).map((_, i) => (
                  <View key={`a${i}`} style={{ ...styles.tableCellHeader, width: '2.5%' }}>
                    <Text>{i + 1}</Text>
                  </View>
                ))}
                <View style={{ ...styles.tableCellHeader, width: '2.5%' }}>
                  <Text>N</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '2.5%' }}>
                  <Text>0.6</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '2.5%' }}>
                  <Text>1.0</Text>
                </View>
                <View style={{ ...styles.tableCellHeader, width: '3%' }}>
                  <Text>TOT</Text>
                </View>
              </View>

              {trabajadores.map((t, idx) => {
                const totHH = Object.values(t.actividades).reduce((a, b) => a + b, 0);
                return (
                  <View key={idx} style={styles.tableRow}>
                    <View style={{ ...styles.tableCell, width: '3%' }}>
                      <Text>{idx + 1}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, width: '4%' }}>
                      <Text>{t.cargo.slice(0, 3).toUpperCase()}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, width: '6%' }}>
                      <Text>{t.cargo.toUpperCase()}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, width: '7%' }}>
                      <Text>{t.dni}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, width: '22%' }}>
                      <Text>{t.nombre}</Text>
                    </View>
                    <View style={{ ...styles.tableCell, width: '6%' }} />
                    <View style={{ ...styles.tableCell, width: '6%' }} />
                    <View style={{ ...styles.tableCell, width: '6%' }} />
                    <View style={{ ...styles.tableCell, width: '6%' }} />
                    {todasActividades.slice(0, 10).map((act, i) => (
                      <View key={i} style={{ ...styles.tableCell, width: '2.5%' }}>
                        <Text>{t.actividades[act] ? t.actividades[act].toFixed(1) : ''}</Text>
                      </View>
                    ))}
                    <View style={{ ...styles.tableCell, width: '2.5%' }} />
                    <View style={{ ...styles.tableCell, width: '2.5%' }} />
                    <View style={{ ...styles.tableCell, width: '2.5%' }} />
                    <View style={{ ...styles.tableCell, width: '3%' }}>
                      <Text>{totHH.toFixed(1)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Signatures */}
            <View style={styles.footerSignatures}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>MAESTRO</Text>
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>INGENIERO DE PRODUCCIÓN</Text>
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>INGENIERO RESIDENTE</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function generarPDFTareo(registrosPorDia, personalDB, ruc, logoBase64) {
  try {
    const doc = <TareoPDFContent registrosPorDia={registrosPorDia} personalDB={personalDB} ruc={ruc} logoBase64={logoBase64} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return blob;
  } catch (err) {
    console.error('Error generando PDF:', err);
    throw err;
  }
}

export async function cargarLogoBase64() {
  try {
    const response = await fetch('/brand/grapco-256.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('No se pudo cargar logo:', err);
    return null;
  }
}
