/**
 * Measures the box an element covers on the canvas, in design pixels (after its scale is applied).
 *
 * @returns undefined when the element is not rendered
 */
export function measureElementBounds(elementId: string) {
  const stage = document.querySelector<HTMLElement>("[data-overlay-stage]");
  const element = document.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(elementId)}"]`);
  if (!stage || !element) {
    return undefined;
  }
  const stageRect = stage.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const k = stageRect.width / stage.offsetWidth;
  return {
    left: (rect.left - stageRect.left) / k,
    top: (rect.top - stageRect.top) / k,
    width: rect.width / k,
    height: rect.height / k,
  };
}
