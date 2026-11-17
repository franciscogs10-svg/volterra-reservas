<!-- BEGIN:continuidad-motores -->
# Instrucciones para cualquier asistente de IA

Este archivo es la puerta de entrada para todo motor distinto de Claude Code (Codex, Gemini, Cline, Cursor u otro). No duplica reglas: te dice dónde están.

1. Lee primero `CLAUDE.md`, en la raíz de este repo. Sus reglas valen igual para ti. Lo que mencione de herramientas, hooks, skills o agentes de Claude es contexto: usa solo lo que tengas disponible y no ejecutes un hook por el hecho de leerlo.
2. Lee `STATE.md` para saber dónde quedó el trabajo y qué sigue.
3. Antes de escribir, mira `git status`. No descartes cambios ajenos, no uses `--autostash` y no reescribas historial.
4. No hagas push a la rama principal, despliegues ni cambios en datos de producción sin aprobación explícita de quien dirige este repo.
5. No escribas claves ni secretos en ningún archivo del repo.
6. Al terminar, deja en `STATE.md` la fecha, qué hiciste, qué quedó pendiente y el siguiente paso, para que la próxima sesión continúe, sea del motor que sea.
<!-- END:continuidad-motores -->
