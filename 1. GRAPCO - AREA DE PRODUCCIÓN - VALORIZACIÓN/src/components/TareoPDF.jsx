import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { crearResolverNombre } from '../utils/nombresCanonicos';

const HORAS_TRABAJO = { inicio: '7:30', fin: '17:00' };

const styles = StyleSheet.create({
  page: {
    pageSize: [841.89, 595.28],
    padding: [12, 15],
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  rucText: {
    fontSize: 7,
  },
  headerRight: {
    textAlign: 'right',
  },
  headerLabel: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  headerValue: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  infoGrid: {
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 18,
    marginBottom: -1,
  },
  infoCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'flex-start',
  },
  infoCellLast: {
    borderRightWidth: 0,
  },
  infoCellLabel: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  infoCellValue: {
    fontSize: 7,
    marginTop: 2,
  },
  activitiesRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 18,
    marginBottom: -1,
  },
  actCol1: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  actCol2: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  actCol3: {
    width: '25%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  actCol4: {
    width: '25%',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  actNum: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  actName: {
    fontSize: 7,
    marginTop: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 16,
    backgroundColor: '#f5f5f5',
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 15,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 1.5,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 6.5,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  footerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 20,
  },
  footerCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 2,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 6.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footerValue: {
    fontSize: 6.5,
    textAlign: 'center',
  },
});

function TareoPDFContent({ registrosPorDia, personalDB, ruc, logoBase64, supervisor = 'DIRAC', fechaFormato = '' }) {
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
        const actividadesPorTrabajador = {};

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
                horas: {},
              };
              actividadesPorTrabajador[nomKey] = {};
            }
            const act = r._actividadCanonica || r.actividad;
            const hh = (parseFloat(t.hn) || 0) + (parseFloat(t.he) || 0);
            if (!actividadesPorTrabajador[nomKey][act]) actividadesPorTrabajador[nomKey][act] = 0;
            actividadesPorTrabajador[nomKey][act] += hh;
          });
        });

        const trabajadores = Object.values(trabajadoresMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const todasActividades = [...new Set(registros.flatMap(r => [(r._actividadCanonica || r.actividad)]))].slice(0, 10);

        // Calcular totales por actividad
        const totalesPorActividad = {};
        todasActividades.forEach(act => {
          totalesPorActividad[act] = 0;
          Object.keys(actividadesPorTrabajador).forEach(nom => {
            totalesPorActividad[act] += actividadesPorTrabajador[nom][act] || 0;
          });
        });

        const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' });

        return (
          <Page key={fechaCapKey} size={['A4', 'landscape']} style={styles.page}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.logoSection}>
                {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
                <View>
                  <Text style={styles.brandText}>GRAPCO</Text>
                  <Text style={styles.brandText} style={{ fontSize: 6 }}>S.A.C</Text>
                </View>
              </View>
              <View>
                <Text style={styles.rucText}>RUC: {ruc}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerLabel}>FECHA:</Text>
                <Text style={styles.headerValue}>{fechaFormateada}</Text>
              </View>
            </View>

            {/* INFO ROWS */}
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '15%' }}>
                  <Text style={styles.infoCellLabel}>Supervisor:</Text>
                  <Text style={styles.infoCellValue}>{supervisor}</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>CUADRILLA</Text>
                  <Text style={styles.infoCellValue}>{capataz}</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '25%' }}>
                  <Text style={styles.infoCellLabel}>ZONA:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '40%' }}>
                  <Text style={styles.infoCellLabel}>HORARIO DE TRABAJO</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <View><Text style={styles.infoCellLabel}>INICIO</Text></View>
                    <View><Text style={styles.infoCellLabel}>FIN</Text></View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '15%' }}>
                  <Text style={styles.infoCellLabel}>ESPECIALIDAD</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>SECTOR:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '25%' }}>
                </View>
                <View style={{ ...styles.infoCell, width: '40%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoCellLabel}>Jornada:</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoCellLabel}>INICIO</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoCellLabel}>FIN</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '15%' }}>
                  <Text style={styles.infoCellLabel}>JEFE GRUPO</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '20%' }}>
                  <Text style={styles.infoCellLabel}>NIVEL:</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '25%' }}>
                </View>
                <View style={{ ...styles.infoCell, width: '40%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoCellLabel}>Refrigerio:</Text>
                    </View>
                    <View style={{ flex: 1 }}></View>
                    <View style={{ flex: 1 }}></View>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={{ ...styles.infoCell, width: '60%' }}>
                </View>
                <View style={{ ...styles.infoCell, width: '20%', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={styles.infoCellLabel}>CUENTA DE COSTO (Fase)</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '10%', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={styles.infoCellLabel}>Uni</Text>
                </View>
                <View style={{ ...styles.infoCell, width: '10%', justifyContent: 'center', alignItems: 'center', ...styles.infoCellLast }}>
                  <Text style={styles.infoCellLabel}>Avance</Text>
                </View>
              </View>
            </View>

            {/* ACTIVITIES */}
            {todasActividades.slice(0, 4).map((act, i) => (
              <View key={i} style={styles.activitiesRow}>
                <View style={styles.actCol1}>
                  <Text style={styles.actNum}>Act. {i + 1}</Text>
                  <Text style={styles.actName}>{act}</Text>
                </View>
                {todasActividades[i + 5] && (
                  <>
                    <View style={styles.actCol2}>
                      <Text style={styles.actNum}>Act. {i + 8}</Text>
                      <Text style={styles.actName}>{todasActividades[i + 5]}</Text>
                    </View>
                  </>
                )}
                <View style={{ ...styles.actCol3, width: todasActividades[i + 5] ? '25%' : '75%' }}>
                </View>
                <View style={styles.actCol4}>
                </View>
              </View>
            ))}

            {/* TABLE HEADER */}
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableCell, width: '3%' }}>CODIGO</Text>
              <Text style={{ ...styles.tableCell, width: '3.5%' }}>CAR.</Text>
              <Text style={{ ...styles.tableCell, width: '5%' }}>OCUPACION</Text>
              <Text style={{ ...styles.tableCell, width: '5.5%' }}>DNI</Text>
              <Text style={{ ...styles.tableCell, width: '18%' }}>TRABAJADORES</Text>
              <Text style={{ ...styles.tableCell, width: '4%' }}>Hora Ingreso</Text>
              <Text style={{ ...styles.tableCell, width: '6%' }}>FIRMA INGRESO</Text>
              <Text style={{ ...styles.tableCell, width: '4%' }}>Hora Salida</Text>
              <Text style={{ ...styles.tableCell, width: '6%' }}>FIRMA SALIDA</Text>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <Text key={n} style={{ ...styles.tableCell, width: '2.2%' }}>{n}</Text>
              ))}
              <Text style={{ ...styles.tableCell, width: '2.2%' }}>N</Text>
              <Text style={{ ...styles.tableCell, width: '2.2%' }}>0.6</Text>
              <Text style={{ ...styles.tableCell, width: '2.2%' }}>1.0</Text>
              <Text style={{ ...styles.tableCell, width: '2.5%', ...styles.tableCellLast }}>TOT.</Text>
            </View>

            {/* TABLE ROWS */}
            {trabajadores.map((t, idx) => {
              const totHH = Object.values(actividadesPorTrabajador[t.nombre] || {}).reduce((a, b) => a + b, 0);
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={{ ...styles.tableCell, width: '3%' }}>{idx + 1}</Text>
                  <Text style={{ ...styles.tableCell, width: '3.5%' }}>{t.cargo.slice(0, 2)}</Text>
                  <Text style={{ ...styles.tableCell, width: '5%' }}>{t.cargo}</Text>
                  <Text style={{ ...styles.tableCell, width: '5.5%' }}>{t.dni}</Text>
                  <Text style={{ ...styles.tableCell, width: '18%' }}>{t.nombre}</Text>
                  <Text style={{ ...styles.tableCell, width: '4%' }}>{HORAS_TRABAJO.inicio}</Text>
                  <Text style={{ ...styles.tableCell, width: '6%' }} />
                  <Text style={{ ...styles.tableCell, width: '4%' }}>{HORAS_TRABAJO.fin}</Text>
                  <Text style={{ ...styles.tableCell, width: '6%' }} />
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                    const act = todasActividades[n - 1];
                    const val = act ? (actividadesPorTrabajador[t.nombre]?.[act] || 0) : 0;
                    return <Text key={n} style={{ ...styles.tableCell, width: '2.2%' }}>{val ? val.toFixed(1) : ''}</Text>;
                  })}
                  <Text style={{ ...styles.tableCell, width: '2.2%' }} />
                  <Text style={{ ...styles.tableCell, width: '2.2%' }} />
                  <Text style={{ ...styles.tableCell, width: '2.2%' }} />
                  <Text style={{ ...styles.tableCell, width: '2.5%', ...styles.tableCellLast }}>{totHH.toFixed(1)}</Text>
                </View>
              );
            })}

            {/* FOOTER */}
            <View style={styles.footerRow}>
              <View style={{ ...styles.footerCell, flex: 1 }}>
                <Text style={styles.footerLabel}>ARAYA QUISPECONDORI MARCELINO</Text>
              </View>
              <View style={{ ...styles.footerCell, flex: 1 }}>
                <Text style={styles.footerLabel}>RAFAEL CONDORI ALEXANDER</Text>
              </View>
              <View style={{ ...styles.footerCell, flex: 1 }}>
                <Text style={styles.footerLabel}>GONZALES GUTIERREZ GUIDO</Text>
              </View>
              <View style={{ ...styles.footerCell, flex: 0.5, borderRightWidth: 0 }}>
                <Text style={styles.footerValue}>{trabajadores.length}</Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={{ ...styles.footerCell, flex: 1 }}>
                <Text style={styles.footerLabel}>MAESTRO</Text>
              </View>
              <View style={{ ...styles.footerCell, flex: 1 }}>
                <Text style={styles.footerLabel}>INGENIERO DE PRODUCCIÓN</Text>
              </View>
              <View style={{ ...styles.footerCell, flex: 1 }}>
                <Text style={styles.footerLabel}>INGENIERO RESIDENTE</Text>
              </View>
              <View style={{ ...styles.footerCell, flex: 0.5, borderRightWidth: 0 }}>
                <Text style={styles.footerLabel}>Número de Trabajadores Parte</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function generarPDFTareo(registrosPorDia, personalDB, ruc, logoBase64, supervisor = 'DIRAC') {
  try {
    const doc = <TareoPDFContent registrosPorDia={registrosPorDia} personalDB={personalDB} ruc={ruc} logoBase64={logoBase64} supervisor={supervisor} />;
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
