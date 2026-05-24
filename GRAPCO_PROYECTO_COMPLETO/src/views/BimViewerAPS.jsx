// src/components/BimViewerAPS.jsx
// Visor 3D nativo usando el SDK oficial de Autodesk Platform Services (v7).
// Carga dinámica del SDK desde CDN — no requiere npm install.
//
// Props:
//   urn          → URN base64 de un modelo único (modo simple)
//   urns         → Array de URNs para FEDERACIÓN visual (carga superpuesta de varias especialidades)
//   onSeleccion  → callback ({ dbId, externalId, properties }) al click en elemento

import React, { useEffect, useRef, useState } from 'react';
import { BASE } from '../utils/styles';
import { obtenerTokenVisor } from '../utils/apsClient';

const APS_VIEWER_VERSION = '7.*';
const APS_VIEWER_CSS = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${APS_VIEWER_VERSION}/style.min.css`;
const APS_VIEWER_JS  = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${APS_VIEWER_VERSION}/viewer3D.min.js`;

let _sdkPromise = null;

const cargarSDK = () => {
  if (_sdkPromise) return _sdkPromise;
  if (window.Autodesk?.Viewing) return Promise.resolve(window.Autodesk);

  _sdkPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${APS_VIEWER_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = APS_VIEWER_CSS;
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement('script');
    script.src = APS_VIEWER_JS;
    script.onload = () => {
      if (window.Autodesk?.Viewing) resolve(window.Autodesk);
      else reject(new Error('SDK Autodesk Viewer no se inicializó'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar el SDK desde CDN'));
    document.head.appendChild(script);
  });
  return _sdkPromise;
};

export default function BimViewerAPS({ urn, urns, onSeleccion, onModelReady, alturaVisor = '700px' }) {
  // Soporta dos modos: urn único (backward compat) o urns[] para FEDERACIÓN visual.
  const urnList = Array.isArray(urns) && urns.length > 0
    ? urns.filter(Boolean)
    : (urn ? [urn] : []);
  // Memoización por contenido — evita re-render por cambio de identidad de array
  const urnsKey = urnList.join('|');

  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [estado, setEstado] = useState('cargando');  // cargando | listo | error | sin_urn
  const [error, setError] = useState('');
  const [progresoCarga, setProgresoCarga] = useState({ cargados: 0, total: 0 });

  useEffect(() => {
    if (urnList.length === 0) { setEstado('sin_urn'); return; }

    let cancelled = false;
    const init = async () => {
      try {
        setEstado('cargando');
        setProgresoCarga({ cargados: 0, total: urnList.length });
        // 1. Cargar SDK
        const Autodesk = await cargarSDK();
        if (cancelled) return;

        // 2. Obtener token desde backend (precalentamiento)
        await obtenerTokenVisor();
        if (cancelled) return;

        // 3. Inicializar runtime del visor
        const options = {
          env: 'AutodeskProduction2',
          api: 'streamingV2',
          getAccessToken: (callback) => {
            obtenerTokenVisor()
              .then(t => callback(t.access_token, t.expires_in))
              .catch(err => console.error('[Viewer token]', err));
          },
        };

        await new Promise((resolve) => Autodesk.Viewing.Initializer(options, resolve));
        if (cancelled) return;

        // 4. Crear visor
        if (!containerRef.current) return;
        const viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current, {
          extensions: ['Autodesk.DocumentBrowser', 'Autodesk.ModelStructure'],
        });
        const startCode = viewer.start();
        if (startCode > 0) throw new Error('No se pudo iniciar el visor');
        viewerRef.current = viewer;

        // Listener de selección — se mantiene en todos los modelos cargados
        viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, (ev) => {
          const dbIds = ev.dbIdArray;
          if (dbIds.length === 0 || !onSeleccion) return;
          viewer.getProperties(dbIds[0], (props) => {
            onSeleccion({
              dbId: dbIds[0],
              externalId: props.externalId,  // GUID Revit/IFC
              name: props.name,
              properties: props.properties || [],
            });
          });
        });

        // 5. Cargar modelos uno por uno — el primero define la cámara, los demás se suman
        for (let i = 0; i < urnList.length; i++) {
          if (cancelled) return;
          const u = urnList[i];
          const documentId = u.startsWith('urn:') ? u : `urn:${u}`;

          await new Promise((resolve, reject) => {
            Autodesk.Viewing.Document.load(
              documentId,
              (doc) => {
                const viewables = doc.getRoot().getDefaultGeometry();
                const loadOpts = i === 0
                  ? {}                                  // primero limpia y carga
                  : { keepCurrentModels: true };        // siguientes se suman (federación)
                viewer.loadDocumentNode(doc, viewables, loadOpts).then(() => {
                  setProgresoCarga(p => ({ ...p, cargados: i + 1 }));
                  resolve();
                }).catch(reject);
              },
              (errCode, errMsg) => {
                reject(new Error(`URN ${i+1}/${urnList.length} (${errCode}): ${errMsg || 'modelo no disponible'}`));
              }
            );
          });
        }

        if (!cancelled) {
          setEstado('listo');
          // Fase 2: avisar que el modelo está listo para extraer cantidades.
          // Esperar al GEOMETRY_LOADED para asegurar el property DB.
          if (onModelReady) {
            const notify = () => { if (!cancelled) onModelReady(viewer); };
            if (viewer.model && viewer.model.isLoadDone && viewer.model.isLoadDone()) {
              notify();
            } else {
              viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, notify, { once: true });
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[BimViewerAPS]', err);
          setEstado('error');
          setError(err.message);
        }
      }
    };
    init();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try { viewerRef.current.finish(); } catch (_) {}
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urnsKey, onSeleccion, onModelReady]);

  if (estado === 'sin_urn') {
    return (
      <div style={{
        background: BASE.bgSoft, border: `2px dashed ${BASE.border}`,
        borderRadius: '14px', padding: '60px 30px', textAlign: 'center',
        color: BASE.muted, fontSize: '13px',
      }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>🏗️</p>
        <p style={{ fontWeight: '700', color: BASE.navy }}>Sin modelo cargado</p>
        <p style={{ fontSize: '11px', marginTop: '6px' }}>
          Sube un .rvt en la pestaña "Subir Modelo" o pega un URN existente.
        </p>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div style={{
        background: '#fef2f2', border: `2px solid ${BASE.red}`,
        borderRadius: '14px', padding: '40px 30px', textAlign: 'center',
        color: BASE.red, fontSize: '13px',
      }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</p>
        <p style={{ fontWeight: '900' }}>No se pudo cargar el visor</p>
        <p style={{ fontSize: '12px', marginTop: '8px', color: BASE.text }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {estado === 'cargando' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.92)', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '10px',
          borderRadius: '14px',
        }}>
          <div style={{
            width: '36px', height: '36px',
            border: `3px solid ${BASE.border}`,
            borderTop: `3px solid ${BASE.navy}`,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '12px', fontWeight: '800', color: BASE.navy }}>
            {progresoCarga.total > 1
              ? `Federando modelos... ${progresoCarga.cargados}/${progresoCarga.total}`
              : 'Cargando modelo 3D...'}
          </p>
          <p style={{ fontSize: '10px', color: BASE.muted }}>
            {progresoCarga.total > 1
              ? 'Cargando especialidades superpuestas (Arq + Est + MEP)'
              : '(Inicializando SDK Autodesk + descargando geometría)'}
          </p>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: alturaVisor,
          background: '#1a1a1a',
          borderRadius: '14px',
          overflow: 'hidden',
          position: 'relative',
        }}
      />
    </div>
  );
}
