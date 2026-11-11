import { CutDirection } from "../replay-insights";

/**
 * Rotation (degrees, clockwise) that turns the animation's travel direction (downwards)
 * into the direction the block has to be cut in.
 */
const TRAVEL_ROTATION: Record<Exclude<CutDirection, "dot">, number> = {
  up: 180,
  upRight: 225,
  right: 270,
  downRight: 315,
  down: 0,
  downLeft: 45,
  left: 90,
  upLeft: 135,
};

const LOOP = "2s";
/** Share of the loop at which the saber goes through the block. */
const HIT = 0.3;
/** How far each half of the sliced block drifts away, in viewBox units. */
const SPLIT = 3.5;

/** A Beat Saber style block seen from slightly above and to the right, centered on the origin. */
function Cube({ arrowRotation }: { arrowRotation?: number }) {
  return (
    <g transform="translate(-1 0)">
      {/* Front face */}
      <rect x="-4" y="-3" width="8" height="8" fill="var(--danger)" />
      {/* Top face (lit) */}
      <polygon points="-4,-3 -2,-5 6,-5 4,-3" fill="var(--danger)" />
      <polygon points="-4,-3 -2,-5 6,-5 4,-3" fill="#fff" opacity="0.45" />
      {/* Right face (in shadow) */}
      <polygon points="4,-3 6,-5 6,3 4,5" fill="var(--danger)" />
      <polygon points="4,-3 6,-5 6,3 4,5" fill="#000" opacity="0.4" />
      {/* Edge highlight */}
      <rect x="-4" y="-3" width="8" height="1" fill="#fff" opacity="0.35" />

      {/* Direction arrow, or a dot for any-direction blocks */}
      <g transform="translate(0 1)">
        {arrowRotation === undefined ? (
          <circle cx="0" cy="0" r="1.6" fill="#fff" />
        ) : (
          <polygon
            transform={`rotate(${arrowRotation})`}
            points="-1,-2.8 1,-2.8 1,0 2.6,0 0,2.8 -2.6,0 -1,0"
            fill="#fff"
          />
        )}
      </g>
    </g>
  );
}

/**
 * A tiny animated block that gets sliced in half in the given cut direction.
 * Pure SVG (SMIL) so it needs no client JS.
 */
export default function SaberCut({ direction, className }: { direction: CutDirection; className?: string }) {
  const rotation = direction === "dot" ? 0 : TRAVEL_ROTATION[direction];
  const arrowRotation = direction === "dot" ? undefined : rotation;
  const id = `saber-cut-${direction}`;
  // The last keyframe stays open and invisible; the loop restart then snaps the block back whole
  const splitTimes = `0;${HIT};${HIT + 0.3};1`;

  return (
    <svg
      viewBox="0 0 16 16"
      className={`overflow-visible ${className ?? "size-10"}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        {/* Each half of the block, in the rotated frame, split down the line of the slash (travel is downwards) */}
        <clipPath id={`${id}-back`}>
          <rect x="-14" y="-14" width="14" height="28" />
        </clipPath>
        <clipPath id={`${id}-front`}>
          <rect x="0" y="-14" width="14" height="28" />
        </clipPath>
      </defs>

      {/* Floor shadow */}
      <ellipse cx="8" cy="14.5" rx="6" ry="1.2" fill="#000" opacity="0.3" />

      <g transform={`translate(8 8) rotate(${rotation})`}>
        {(direction === "dot" ? [] : (["back", "front"] as const)).map(half => (
          <g key={half}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0; 0 0; ${half === "back" ? -SPLIT : SPLIT} 0; ${half === "back" ? -SPLIT : SPLIT} 0`}
              keyTimes={splitTimes}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;1;0;0"
              keyTimes={splitTimes}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <g clipPath={`url(#${id}-${half})`}>
              {/* Undo the frame rotation so the block keeps its lighting */}
              <g transform={`rotate(${-rotation})`}>
                <Cube arrowRotation={arrowRotation} />
              </g>
            </g>
          </g>
        ))}

        {direction === "dot" ? (
          <>
            <g>
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1;1.25;1;1"
                keyTimes={`0;${HIT};${HIT + 0.05};${HIT + 0.2};1`}
                dur={LOOP}
                repeatCount="indefinite"
              />
              <Cube />
            </g>
            <circle cx="0" cy="0" r="1" fill="#fff">
              <animate
                attributeName="r"
                values="1;1;9;9"
                keyTimes={`0;${HIT};${HIT + 0.2};1`}
                dur={LOOP}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0;0.7;0;0"
                keyTimes={`0;${HIT};${HIT + 0.02};${HIT + 0.2};1`}
                dur={LOOP}
                repeatCount="indefinite"
              />
            </circle>
          </>
        ) : (
          /* The slash streak runs along the swing direction, through the middle of the block */
          <g>
            <animate
              attributeName="opacity"
              values="0;0;1;0;0"
              keyTimes={`0;${HIT - 0.05};${HIT};${HIT + 0.25};1`}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 -6; 0 -6; 0 0; 0 4; 0 4"
              keyTimes={`0;${HIT - 0.05};${HIT};${HIT + 0.25};1`}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <rect x="-1.5" y="-11" width="3" height="22" fill="var(--primary)" opacity="0.35" />
            <rect x="-0.5" y="-11" width="1" height="22" fill="#fff" />
          </g>
        )}
      </g>
    </svg>
  );
}
