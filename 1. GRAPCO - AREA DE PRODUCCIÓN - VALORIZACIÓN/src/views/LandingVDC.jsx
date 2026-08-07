// src/views/LandingVDC.jsx
// Landing de entrada de GRAPCO Gestión VDC.
// Usa los CRITERIOS de diseño de la app de cabidas (Valtana In) — tipografía
// Playfair + Inter, paleta navy + dorado, kicker, H1 serif con palabra acento,
// tarjetas glass, botones gold/ghost — pero con GRÁFICA PROPIA de GRAPCO:
// fondo navy elegante (sin foto de bosque ni auroras) y logo GRAPCO.
// Se muestra antes del login; "Ingresar" llama onEntrar() para revelar el Login.
// Todo va scopeado bajo .vdclz para no colisionar con los estilos globales.
import React from 'react';

const FEATURES = [
  { t: 'Asistencia por reconocimiento facial', d: 'Registro de ingreso del personal en obra con reconocimiento facial: sin tarjetas, sin suplantación y con evidencia.',
    ic: (<><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="11" r="2.4"/><path d="M8 16.5c.7-1.7 2.2-2.5 4-2.5s3.3.8 4 2.5"/></>) },
  { t: 'Tareo digital e ISP', d: 'Tareo de cuadrillas e ISP en tiempo real desde el campo, con parte diario y horas-hombre por partida.',
    ic: (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>) },
  { t: 'Costos y valorizaciones', d: 'Control de costos, Resultado Operativo, CPI / EAC y valorización F07 con una única fuente de verdad.',
    ic: (<><path d="M4 20V4M4 20h16"/><path d="M8 20v-6M13 20V9M18 20v-9"/></>) },
  { t: 'Almacén y logística', d: 'Kardex, órdenes de compra y almacén conectados a la operación diaria de la obra, sin planillas sueltas.',
    ic: (<><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>) },
];

export default function LandingVDC({ onEntrar }) {
  const [verPriv, setVerPriv] = React.useState(false);
  return (
    <div className="vdclz">
      <div className="landing">
        {/* Fondo: video de la plataforma Gestión VDC + overlay navy para legibilidad */}
        <video className="vdc-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
          <source src="/grapco-bg-0723.mp4" type="video/mp4" />
        </video>
        <div className="vdc-ov" aria-hidden="true" />

        <header className="lnd-top">
          <div className="vlogo">
            <span className="vlogo-chip">
              <img src="/brand/valtana-montana.png" alt="Valtana" />
            </span>
          </div>
          <button className="btn gold" onClick={onEntrar}>Ingresar</button>
        </header>

        <main className="lnd-hero">
          <div className="lnd-card">
            <span className="lnd-kicker">Plataforma VDC · Lean Construction</span>
            <h1>La obra bajo control, <span>en tiempo real.</span></h1>
            <p>Centraliza la gestión integral del proyecto VDC — personas, procesos e información en una sola plataforma, para maximizar la eficiencia operativa y el control del negocio.</p>
            <div className="lnd-cta">
              <button className="btn gold lg" onClick={onEntrar}>Ingresar a la plataforma</button>
              <a className="btn ghost lg" href="mailto:comercial@valtana.pe?subject=Inter%C3%A9s%20en%20GRAPCO%20Gesti%C3%B3n%20VDC">Contáctanos</a>
            </div>
          </div>

          <div className="lnd-features">
            {FEATURES.map((f) => (
              <div className="lnd-feat" key={f.t}>
                <span className="lnd-feat-ic">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.ic}</svg>
                </span>
                <b>{f.t}</b>
                <span>{f.d}</span>
              </div>
            ))}
          </div>
        </main>

        <footer className="lnd-foot">© {new Date().getFullYear()} · <span className="vmark"><b className="c1">VAL</b><b className="c2">TA</b><b className="c3">NA</b></span> Consultoría &amp; Construcción S.A.C. · <button type="button" className="lnd-foot-link" onClick={() => setVerPriv(true)}>Política de privacidad</button></footer>
      </div>

      {verPriv && (
        <div className="modal-ov" onClick={() => setVerPriv(false)}>
          <div className="priv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Política de privacidad">
            <div className="modal-h"><h3>Política de privacidad</h3><button className="modal-x" onClick={() => setVerPriv(false)} aria-label="Cerrar">✕</button></div>
            <div className="priv-body">
              <p><b>Responsable del tratamiento.</b> Valtana Consultoría &amp; Construcción S.A.C. («Valtana»), con contacto en comercial@valtana.pe.</p>
              <p><b>Datos que recopilamos.</b> Nombre y apellido, empresa, cargo, correo electrónico y, opcionalmente, teléfono y el mensaje que nos escribas. Solo los que ingresas al contactarnos.</p>
              <p><b>Finalidad.</b> Contactarte para coordinar una reunión o demostración de GRAPCO Gestión VDC y enviarte información comercial relacionada con nuestros servicios. No usamos tus datos para otros fines ni los vendemos.</p>
              <p><b>Base legal y conservación.</b> Tratamos tus datos con tu consentimiento, conforme a la <b>Ley N.° 29733</b> de Protección de Datos Personales del Perú y su reglamento. Los conservamos mientras exista interés comercial o hasta que solicites su eliminación.</p>
              <p><b>Encargado.</b> La información se almacena en la infraestructura de Google Firebase (Google LLC), que actúa como encargado del tratamiento con medidas de seguridad estándar de la industria.</p>
              <p><b>Tus derechos.</b> Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) escribiendo a comercial@valtana.pe. Atenderemos tu solicitud en los plazos que fija la ley.</p>
              <p className="priv-foot">Al enviar cualquier formulario de contacto, declaras haber leído esta política y autorizas el tratamiento de tus datos para las finalidades descritas.</p>
              <button className="btn gold" onClick={() => setVerPriv(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .vdclz {
          --navy:#16294d; --navy-3:#25406e; --navy-deep:#0d1a30;
          /* Paleta dorada GRAPCO (como la app de presupuestos) */
          --yellow:#E5A82F; --yellow-2:#f3c14e; --orange:#d99a3a; --orange-2:#f3c14e;
          --line:#e7eaf0;
          --serif:"Playfair Display","Georgia","Times New Roman",serif;
          --sans:"Inter","Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;
          font-family: var(--sans);
        }
        .vdclz *, .vdclz *::before, .vdclz *::after { box-sizing: border-box; }
        .vdclz .landing { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; background:#0a1426; }

        /* Fondo: video de la plataforma + overlay navy para legibilidad del texto */
        .vdclz .vdc-video { position: fixed; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; pointer-events:none; }
        .vdclz .vdc-ov { position: fixed; inset:0; z-index:1; pointer-events:none;
          background: linear-gradient(160deg, rgba(8,16,30,.82) 0%, rgba(13,26,48,.58) 48%, rgba(8,16,30,.88) 100%);
        }

        .vdclz .lnd-top,.vdclz .lnd-hero,.vdclz .lnd-foot { position: relative; z-index:2; }
        .vdclz .lnd-top { display:flex; align-items:center; justify-content:space-between; padding:18px 34px; }
        .vdclz .lnd-hero { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px; padding:24px 20px; text-align:center; }
        .vdclz .lnd-card { max-width:760px; }
        .vdclz .lnd-kicker { color: var(--yellow); font-weight:800; text-transform:uppercase; letter-spacing:2px; font-size:12px; }
        .vdclz .lnd-card h1 { color:#fff; font-family: var(--serif); font-size:46px; line-height:1.1; margin:14px 0 12px; font-weight:800; letter-spacing:-.5px; text-wrap:balance; }
        .vdclz .lnd-card h1 span { color: var(--yellow); font-style: italic; }
        .vdclz .lnd-card p { color:#d3dcec; font-size:16px; line-height:1.6; max-width:560px; margin:0 auto; }
        .vdclz .lnd-cta { display:flex; gap:12px; justify-content:center; margin-top:24px; flex-wrap:wrap; }
        .vdclz .lnd-features { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; max-width:1020px; width:100%; }
        .vdclz .lnd-feat { background: rgba(255,255,255,.065); backdrop-filter: blur(16px) saturate(1.2); -webkit-backdrop-filter: blur(16px) saturate(1.2); border:1px solid rgba(255,255,255,.16); border-radius:14px; padding:18px 16px; text-align:left; transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
        .vdclz .lnd-feat:hover { transform: translateY(-4px); border-color: rgba(248,197,32,.42); box-shadow: 0 18px 40px rgba(0,0,0,.4); }
        .vdclz .lnd-feat-ic { display:inline-grid; place-items:center; width:40px; height:40px; border-radius:11px; background: rgba(248,197,32,.14); border:1px solid rgba(248,197,32,.24); color: var(--yellow); margin-bottom:10px; }
        .vdclz .lnd-feat b { display:block; color:#fff; font-size:14px; margin-bottom:4px; }
        .vdclz .lnd-feat > span:last-child { font-size:12px; line-height:1.5; color:#c7d2e6; }
        .vdclz .lnd-foot { text-align:center; padding:16px; color:#aebbd2; font-size:12px; }
        .vdclz .lnd-foot .vmark .c1 { color:#fff; }
        .vdclz .lnd-foot-link { background:none; border:none; padding:0; color:inherit; text-decoration:underline; cursor:pointer; font:inherit; }
        .vdclz .lnd-foot-link:hover { color:#fff; }

        /* Modal Política de privacidad */
        .vdclz .modal-ov { position:fixed; inset:0; z-index:60; background:rgba(6,12,24,.66); -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
        .vdclz .priv-modal { width:100%; max-width:520px; max-height:82vh; display:flex; flex-direction:column; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,.55); }
        .vdclz .modal-h { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:15px 20px; background:linear-gradient(120deg, var(--navy-deep), var(--navy-3)); color:#fff; }
        .vdclz .modal-h h3 { margin:0; font-family:var(--serif); font-size:19px; font-weight:800; }
        .vdclz .modal-x { background:rgba(255,255,255,.12); border:none; color:#fff; width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:14px; line-height:1; }
        .vdclz .modal-x:hover { background:rgba(255,255,255,.22); }
        .vdclz .priv-body { padding:18px 20px; overflow-y:auto; color:#334155; font-size:13px; line-height:1.55; }
        .vdclz .priv-body p { margin:0 0 10px; }
        .vdclz .priv-body b { color: var(--navy); }
        .vdclz .priv-foot { font-size:11.5px; color:#64748b; }
        .vdclz .priv-body .btn { margin-top:4px; }

        .vdclz .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:8px 14px; border-radius:9px; border:1px solid var(--line); background:#fff; cursor:pointer; font-family:inherit; font-weight:600; font-size:12.5px; color:var(--navy); transition: border-color .15s, box-shadow .15s, transform .12s, background .15s; text-decoration:none; }
        .vdclz .btn:hover { border-color: var(--orange); box-shadow:0 3px 10px rgba(16,31,61,.1); transform: translateY(-1px); }
        .vdclz .btn.gold { background: linear-gradient(135deg, var(--yellow-2) 0%, var(--yellow) 48%, var(--orange) 135%); color: var(--navy); border-color: var(--yellow); box-shadow:0 8px 20px rgba(216,154,58,.28); }
        .vdclz .btn.gold:hover { transform: translateY(-2px); box-shadow:0 12px 28px rgba(216,154,58,.42); }
        .vdclz .btn.ghost { background: rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.3); }
        .vdclz .btn.ghost:hover { border-color: var(--yellow); background: rgba(248,197,32,.14); }
        .vdclz .btn.lg { padding:12px 26px; font-size:15px; border-radius:11px; font-weight:700; }

        .vdclz .vlogo { display:flex; align-items:center; gap:13px; }
        /* Logo Valtana (montaña) — mismo tamaño y brillo sutil que la app de cabidas */
        .vdclz .vlogo-chip { display:inline-flex; align-items:center; justify-content:center; padding:0; background:transparent; }
        .vdclz .vlogo-chip img { width:auto; height:40px; object-fit:contain; display:block;
          filter: drop-shadow(0 0 7px rgba(248,197,32,.8)) drop-shadow(0 0 16px rgba(248,197,32,.45)); }
        .vdclz .vlogo-word-wrap { display:flex; flex-direction:column; line-height:1.05; }
        .vdclz .vlogo-word { font-weight:800; letter-spacing:2.5px; font-size:22px; color:#fff; display:inline-flex; align-items:baseline; gap:2px; white-space:nowrap; }
        .vdclz .vlogo-tag { font-style:normal; font-weight:800; font-size:22px; letter-spacing:2.5px; color: var(--yellow); }
        .vdclz .vlogo-sub { font-size:10.5px; letter-spacing:2px; color: var(--yellow-2); font-weight:600; margin-top:6px; text-transform:uppercase; }
        .vdclz .vmark { font-weight:800; letter-spacing:1px; }
        .vdclz .vmark .c1 { color: var(--navy); } .vdclz .vmark .c2 { color:#e0a81b; } .vdclz .vmark .c3 { color: var(--orange); }

        @media (prefers-reduced-motion: reduce){ .vdclz .btn, .vdclz .lnd-feat { transition:none; } }
        @media (max-width: 820px){ .vdclz .lnd-features{ grid-template-columns:1fr 1fr } .vdclz .lnd-card h1{ font-size:34px } }
        @media (max-width: 520px){ .vdclz .lnd-features{ grid-template-columns:1fr } .vdclz .lnd-top{ padding:14px 18px } .vdclz .vlogo-sub{ display:none } }
      `}</style>
    </div>
  );
}
