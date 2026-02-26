/**
 * Official Pyth Network logo — inline SVG from the official brand asset.
 * Paths sourced from pyth-network-pyth-logo.svg (cryptologos.cc)
 *
 * The background circle is omitted so the mark renders cleanly on
 * any background. Fill color is controlled via the `color` prop.
 */

interface PythLogoProps {
  size?: number;
  /** Tailwind class or hex color for the icon fill. Defaults to Pyth purple. */
  color?: string;
  className?: string;
}

export default function PythLogo({
  size = 28,
  color = "#E6DAFE",
  className = "",
}: PythLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pyth Network"
    >
      {/* Outer circular ring — use a translucent purple fill */}
      <circle cx="256" cy="256" r="256" fill="#7C3AED" opacity="0.18" />

      {/* Official Pyth symbol paths */}
      <path
        fill={color}
        d="M303.4,228.5c0,20.7-16.7,37.5-37.4,37.5v37.5c41.3,0,74.7-33.5,74.7-74.9
           s-33.5-74.9-74.7-74.9c-13.6,0-26.4,3.6-37.4,10c-22.3,12.9-37.4,37.2-37.4,64.9
           v187.3l33.6,33.7l3.8,3.8V228.5c0-20.7,16.7-37.5,37.4-37.5S303.4,207.9,303.4,228.5z"
      />
      <path
        fill={color}
        d="M266,78.7c-27.2,0-52.7,7.3-74.7,20.1c-14.1,8.1-26.7,18.5-37.4,30.7
           c-23.2,26.4-37.4,61.1-37.4,99.1v112.4l37.4,37.5V228.5c0-33.3,14.4-63.2,37.4-83.8
           c10.8-9.7,23.4-17.3,37.4-22.2c11.7-4.2,24.3-6.4,37.4-6.4c61.9,0,112.1,50.3,112.1,112.4
           S327.9,340.9,266,340.9v37.5c82.5,0,149.4-67.1,149.4-149.8S348.5,78.7,266,78.7z"
      />
    </svg>
  );
}
