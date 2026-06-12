import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { crearResolverNombre } from '../utils/nombresCanonicos';

const styles = StyleSheet.create({
  page: {
    padding: [15, 20],
    fontSize: 7,
    fontFamily: 'Helvetica',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 780,
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  logo: {
    width: 45,
    height: 45,
  },
  logoText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  rucText: {
    fontSize: 8,
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerRight: {
    textAlign: 'right',
  },
  fechaLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  fechaValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 20,
  },
  infoCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'flex-start',
  },
  infoCellLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000',
  },
  infoCellValue: {
    fontSize: 8,
    marginTop: 1,
    minHeight: 10,
  },
  infoCellLabelBg: {
    fontSize: 7,
    fontWeight: 'bold',
    backgroundColor: '#d3d3d3',
    paddingVertical: 1,
    marginHorizontal: -3,
    marginVertical: -2,
    paddingHorizontal: 3,
  },
  activitiesSection: {
    marginTop: 6,
    marginBottom: 6,
  },
  activitiesTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  activitiesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  activityColumn: {
    flex: 1,
  },
  activityRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 16,
  },
  activityNum: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 7,
  },
  activityName: {
    width: '65%',
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontSize: 7,
  },
  tableContainer: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
    minHeight: 18,
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 16,
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
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 6,
    fontWeight: 'bold',
  },
  footerContainer: {
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 50,
    marginBottom: -1,
  },
  footerCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footerSignatureRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 20,
  },
  footerSignatureCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerSignatureName: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  trabajadoresCount: {
    textAlign: 'right',
    paddingRight: 10,
    fontSize: 8,
    fontWeight: 'bold',
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
            <View style={styles.container}>
              {/* HEADER */}
              <View style={styles.header}>
                <View style={styles.logoSection}>
                  {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
                  <View>
                    <Text style={styles.logoText}>GRAPCO</Text>
                    <Text style={styles.rucText}>RUC: {ruc}</Text>
                  </View>
                </View>
                <View style={styles.headerCenter}>
                  <Text style={styles.headerTitle}>TAREO DIARIO</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.fechaLabel}>FECHA:</Text>
                  <Text style={styles.fechaValue}>{fecha}</Text>
                </View>
              </View>

              {/* INFO ROWS */}
              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%', borderRightWidth: 0 }}>
                  <Text style={styles.infoCellLabel}>Supervisor:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <Text style={styles.infoCellLabel}>ZONA:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '50%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoCellLabel}>HORARIO DE TRABAJO</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%', borderRightWidth: 0 }}>
                  <Text style={styles.infoCellLabelBg}>CUADRILLA</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <Text style={styles.infoCellLabelBg}>ZONA:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '50%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
                    <View style={{ flex: 0.4 }}>
                      <Text style={styles.infoCellLabel}>HORARIO DE TRABAJO</Text>
                    </View>
                    <View style={{ flex: 0.3 }}>
                      <Text style={styles.infoCellLabel}>INICIO</Text>
                    </View>
                    <View style={{ flex: 0.3 }}>
                      <Text style={styles.infoCellLabel}>FIN</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%', borderRightWidth: 0 }}>
                  <Text style={styles.infoCellValue}>{capataz}</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '50%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
                    <View style={{ flex: 0.4 }}>
                      <View style={styles.infoCellValue} />
                    </View>
                    <View style={{ flex: 0.3 }}>
                      <View style={styles.infoCellValue} />
                    </View>
                    <View style={{ flex: 0.3 }}>
                      <View style={styles.infoCellValue} />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%', borderRightWidth: 0 }}>
                  <Text style={styles.infoCellLabelBg}>ESPECIALIDAD</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <Text style={styles.infoCellLabelBg}>SECTOR:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabelBg}>Jornada:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '30%', borderRightWidth: 0 }}>
                  <Text style={styles.infoCellLabelBg}>Refrigerio:</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%', borderRightWidth: 0 }}>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <View style={styles.infoCellValue} />
                </View>
                <View style={{ ...styles.infoCell, width: '30%', borderRightWidth: 0 }}>
                  <View style={styles.infoCellValue} />
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '20%', borderRightWidth: 0 }}>
                  <Text style={styles.infoCellLabelBg}>JEFE GRUPO</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '30%' }}>
                  <Text style={styles.infoCellLabelBg}>NIVEL:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '50%', borderRightWidth: 0 }}>
                  <View style={styles.infoCellValue} />
                </View>
              </View>

              {/* ACTIVITIES */}
              <View style={styles.activitiesSection}>
                <Text style={styles.activitiesTitle}>CUENTA DE COSTO (Fase)</Text>
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
              </View>

              {/* TABLE */}
              <View style={styles.tableContainer}>
                <Text style={{ fontSize: 6, fontWeight: 'bold', marginBottom: 2 }}>REFERENCIAS / ACTIVIDADES / HORAS REALES</Text>
                <View style={styles.tableHeader}>
                  <View style={{ ...styles.tableCellHeader, width: '3%' }}>
                    <Text>CODIGO</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '4%' }}>
                    <Text>CAR.</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '5%' }}>
                    <Text>OCUPACION</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '7%' }}>
                    <Text>DNI</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '20%' }}>
                    <Text>TRABAJADORES</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '5%' }}>
                    <Text>Hora Ingreso</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '5%' }}>
                    <Text>FIRMA INGRESO</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '5%' }}>
                    <Text>Hora Salida</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '5%' }}>
                    <Text>FIRMA SALIDA</Text>
                  </View>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <View key={n} style={{ ...styles.tableCellHeader, width: '2.2%' }}>
                      <Text>{n}</Text>
                    </View>
                  ))}
                  <View style={{ ...styles.tableCellHeader, width: '2.2%' }}>
                    <Text>N</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '2.2%' }}>
                    <Text>0.6</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '2.2%' }}>
                    <Text>1.0</Text>
                  </View>
                  <View style={{ ...styles.tableCellHeader, width: '3%' }}>
                    <Text>TOT.</Text>
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
                        <Text>{t.cargo.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <View style={{ ...styles.tableCell, width: '5%' }}>
                        <Text>{t.cargo.toUpperCase().slice(0, 9)}</Text>
                      </View>
                      <View style={{ ...styles.tableCell, width: '7%' }}>
                        <Text>{t.dni}</Text>
                      </View>
                      <View style={{ ...styles.tableCell, width: '20%' }}>
                        <Text>{t.nombre}</Text>
                      </View>
                      <View style={{ ...styles.tableCell, width: '5%' }} />
                      <View style={{ ...styles.tableCell, width: '5%' }} />
                      <View style={{ ...styles.tableCell, width: '5%' }} />
                      <View style={{ ...styles.tableCell, width: '5%' }} />
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                        const act = todasActividades[n - 1];
                        return (
                          <View key={n} style={{ ...styles.tableCell, width: '2.2%' }}>
                            <Text>{act && t.actividades[act] ? t.actividades[act].toFixed(1) : ''}</Text>
                          </View>
                        );
                      })}
                      <View style={{ ...styles.tableCell, width: '2.2%' }} />
                      <View style={{ ...styles.tableCell, width: '2.2%' }} />
                      <View style={{ ...styles.tableCell, width: '2.2%' }} />
                      <View style={{ ...styles.tableCell, width: '3%' }}>
                        <Text>{totHH.toFixed(1)}</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Blank row for spacing */}
                <View style={styles.tableRow}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <View key={i} style={{ ...styles.tableCell, width: i < 5 ? '3-7%' : '2.2%', borderWidth: i === 23 ? 1 : 0.5 }} />
                  ))}
                </View>
              </View>

              {/* SIGNATURES */}
              <View style={styles.footerContainer}>
                <View style={styles.footerRow}>
                  <View style={styles.footerCell}>
                    <Text style={styles.footerLabel}>ARAYA QUISPECONDORI MARCELINO</Text>
                  </View>
                  <View style={styles.footerCell}>
                    <Text style={styles.footerLabel}>RAFAEL CONDORI ALEXANDER</Text>
                  </View>
                  <View style={styles.footerCell}>
                    <Text style={styles.footerLabel}>GONZALES GUTIERREZ GUIDO</Text>
                  </View>
                  <View style={{ ...styles.footerCell, flex: 0.3, paddingRight: 5, alignItems: 'flex-end', borderRightWidth: 0 }}>
                    <Text style={{ fontSize: 6, fontWeight: 'bold' }}>Número de Trabajadores Parte</Text>
                  </View>
                </View>

                <View style={styles.footerSignatureRow}>
                  <View style={styles.footerSignatureCell}>
                    <Text style={styles.footerSignatureName}>MAESTRO</Text>
                  </View>
                  <View style={styles.footerSignatureCell}>
                    <Text style={styles.footerSignatureName}>INGENIERO DE PRODUCCIÓN</Text>
                  </View>
                  <View style={styles.footerSignatureCell}>
                    <Text style={styles.footerSignatureName}>INGENIERO RESIDENTE</Text>
                  </View>
                  <View style={{ ...styles.footerSignatureCell, flex: 0.3, borderRightWidth: 0 }}>
                    <Text style={styles.trabajadoresCount}>{trabajadores.length}</Text>
                  </View>
                </View>
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
