export const CustomizedAxisTick = ({
  x,
  y,
  payload,
  rotateAngle = -45,
}: {
  x?: number;
  y?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
  rotateAngle?: number;
}) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform={`rotate(${rotateAngle})`}>
        {payload.value}
      </text>
    </g>
  );
};
