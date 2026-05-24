# 📂 Organización del código por rol — Bloque 21

> **Estructura nueva** introducida en el Bloque 21 para escalar el proyecto al estándar de empresas grandes (Cosapi, Graña, JJC).

## Estructura objetivo

```
src/views/
├── _paneles_por_rol/         ← VISTAS PRINCIPALES POR PUESTO
│   ├── capataz/              ← lo que ve el capataz al loguearse
│   ├── almacenero/           ← lo que ve almacenero
│   ├── calidad/              ← lo que ve QC
│   ├── ingeniero/            ← lo que ve residente
│   ├── oficinaTecnica/       ← lo que ve OT
│   ├── gerencia/             ← lo que ve admin/gerente
│   └── supervisorCliente/    ← lo que ve el cliente
│
├── modulos/                  ← MÓDULOS REUTILIZABLES (transversales a roles)
│   ├── planMaestro/          ← WBS, partidas, programación (Bloque 21)
│   ├── apus/                 ← Análisis Precios Unitarios (Bloque 21)
│   ├── resultadoOperativo/   ← RO mensual, EVM, EAC (Bloque 21)
│   ├── calidad/              ← (futuro: mover desde src/views/calidad/)
│   ├── oficinaTecnica/       ← (futuro: mover desde src/views/oficinatecnica/)
│   └── materiales/           ← (futuro: mover desde src/views/materiales/)
│
└── (archivos legacy)         ← componentes y vistas antiguas
    ├── Login.jsx
    ├── Capataz.jsx
    ├── Ingeniero.jsx
    ├── Almacenero.jsx
    └── ...
```

## Por qué esta estructura

**Antes (Bloques 1-20):**
- Carpetas por dominio (`/calidad`, `/materiales`, `/lps`).
- Funciona para módulos pequeños, pero al crecer un mismo rol toca múltiples carpetas.

**Después (Bloque 21+):**
- `_paneles_por_rol/` define qué ve cada puesto al loguearse.
- `modulos/` contiene módulos REUTILIZABLES que pueden usarse en varios paneles.
- Cada módulo es independiente y testeable.

## Mapeo: rol → módulos que ve

| Rol                  | Módulos accesibles                                                  |
|----------------------|---------------------------------------------------------------------|
| **capataz**          | LPS (Plan Diario, Tareo) · Materiales (solo lectura)                |
| **almacenero**       | Materiales (Almacén) · Insumos (lectura)                            |
| **calidad**          | Calidad · PETs · Plan Maestro (lectura)                             |
| **supervisor_cliente** | Calidad (firmas) · RDO (lectura)                                  |
| **ingeniero**        | TODO: Plan Maestro · APUs · RO · LPS · Materiales · Calidad · OT    |
| **admin**            | TODO + Administración + Configuración                               |
| **subcontratista**   | Tareo de su personal · Valorizaciones de su contrato                |

## Estrategia de migración progresiva

**No movemos los archivos existentes** porque rompería ~50 imports en cascada. En su lugar:

1. ✅ **Bloque 21**: archivos NUEVOS van organizados (planMaestro, apus, resultadoOperativo).
2. 🔄 **Bloque 22+**: cuando se cree una vista nueva de un módulo existente, va a `modulos/`.
3. 🔄 **Refactor futuro**: cuando se toque un archivo legacy, se mueve a su nueva ubicación con import updates.

## Convenciones de imports

```jsx
// Desde src/views/modulos/planMaestro/PlanMaestroPanel.jsx:
import { BASE } from '../../../utils/styles';                    // 3 niveles arriba
import { useAuth } from '../../../contexts/AuthContext';         // 3 niveles arriba
import RoleGuard from '../../../components/RoleGuard';           // 3 niveles arriba
import { calcularEVM } from '../../../utils/planMaestroAnalytics';

// Desde src/views/modulos/planMaestro/WBSExplorer.jsx (mismo módulo):
import ActividadEditor from './ActividadEditor';                 // mismo nivel
```

## Flujo de datos

```
   Capataz (mobile)             Almacenero (mobile)
   └─ registra avance           └─ registra entrada/salida
            ↓                            ↓
       Historial                    KardexMovimientos
            ↓                            ↓
            └────────► Plan Maestro WBS ◄────────┘
                              ↓
                   ┌──────────┼──────────┐
                   ↓          ↓          ↓
                 APUs    Calidad    Valorizaciones
                   ↓          ↓          ↓
                   └──────────┼──────────┘
                              ↓
                         Resultado Operativo
                          (lo ve gerencia)
```

## Próximos pasos sugeridos

1. **Crear panel ejecutivo `gerencia/PanelGerencia.jsx`** con:
   - KPIs del RO (margen, CPI, EAC)
   - Curva S
   - Alertas críticas
   - Resumen de calidad
2. **Migrar `src/views/Capataz.jsx`** a `src/views/_paneles_por_rol/capataz/PanelCapataz.jsx`
3. **Migrar `src/views/Ingeniero.jsx`** a `src/views/_paneles_por_rol/ingeniero/PanelIngeniero.jsx`
4. **Crear PETs vinculados al WBS** en `src/views/modulos/calidad/PETsView.jsx`
