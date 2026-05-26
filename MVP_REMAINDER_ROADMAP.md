# RoboStudio MVP Remainder Roadmap

## Goal
Ship a usable MVP for a dense, keyboard-first, dockable robotics/simulation desktop tool.

## Remaining Work

1. Docking system
- Add drag-to-dock for panel headers with drop zones: `left`, `right`, `top`, `bottom`, `tab-stack`.
- Keep split-based layout model compatible with docking operations.
- Persist dock relationships in layout state.
- Acceptance: user can move any panel to any dock zone without layout corruption.

2. Viewport interaction MVP
- Keep orbit/pan/zoom stable across resize and DPI changes.
- Add `frame selection` and `reset camera` actions.
- Add selection outline/highlight in viewport.
- Acceptance: camera and selection behavior are consistent in Tauri runtime.

3. Cross-panel selection sync
- Scene graph selection updates viewport + inspector.
- Viewport pick updates scene graph + inspector.
- Inspector reflects currently selected entity and updates live.
- Acceptance: one source of truth for selected entity ID.

4. Node editor interaction MVP
- Create, move, connect, and delete nodes/edges.
- Support basic selection and keyboard delete.
- Persist graph state per workspace.
- Acceptance: user can construct and edit a small node graph end-to-end.

5. Simulation inspection tools
- Add entity inspect overlay: id, type, transform, runtime status.
- Add pause/play/step controls tied to simulation state.
- Add frame/epoch readout with deterministic step behavior.
- Acceptance: user can inspect a specific sim frame and entity state.

6. Sensor debug views
- Implement at least two practical debug panels:
  - LiDAR sample/point-cloud preview
  - IMU/encoder timeseries
- Provide simple filters/range controls.
- Acceptance: debugging panels update with workspace context and selection.

7. Job orchestration MVP
- Queue panel with run/stop/retry controls.
- Status chips: queued/running/success/failed.
- Filtered logs by selected job.
- Acceptance: users can manage and inspect at least one job lifecycle.

8. Training data inspector MVP
- Dataset list + sample preview panel.
- Metadata/tag pane for each sample.
- Basic next/prev navigation.
- Acceptance: user can inspect sample content and metadata quickly.

9. Keyboard-first pass
- Panel focus traversal shortcuts.
- Command palette coverage for core actions.
- Core shortcuts: split, close, focus panel, open search, frame selection.
- Acceptance: common workflows executable without mouse.

10. Persistence
- Save/restore workspace layout, panel sizes, active tabs, selected workspace.
- Store in local persisted state (desktop-safe).
- Acceptance: restart app and recover prior workspace accurately.

11. Responsive floor + no-wrap guarantees
- Define minimum app size and enforce per-pane min constraints.
- Prevent header/control wrapping in dense mode.
- Ensure viewport remains usable under aggressive panel resizing.
- Acceptance: no overlap/wrap breakage at minimum supported size.

12. Stability and QA
- Add tests for:
  - layout/split ratio math
  - viewport centering/projection math
  - selection sync state updates
- Add smoke checklist for Tauri runtime.
- Acceptance: core layout/viewport/selection flows are regression-protected.

## Recommended MVP Build Order

1. Docking system + resize hardening
2. Cross-panel selection sync
3. Viewport interaction polish
4. Node editor interaction baseline
5. Simulation inspector + sensor debug views
6. Job orchestration + training data inspector
7. Keyboard-first completion
8. Persistence + QA stabilization

## MVP Exit Criteria

- Dockable, resizable, dense desktop workspace is stable.
- Viewport/scene graph/inspector selection is fully synchronized.
- Keyboard-first path covers core daily tasks.
- Minimum simulation debugging loop is complete (inspect, step, debug sensor, run job).
- Layout and panel state persist reliably between launches.
