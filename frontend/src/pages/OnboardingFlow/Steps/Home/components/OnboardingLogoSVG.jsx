import { useTheme } from "@/hooks/useTheme";

export function OnboardingLogoSVG() {
  const { isLight } = useTheme();
  const fillOpacity = isLight ? 0.5 : 0.28;
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
    >
      <g filter="url(#filter0_i_onboarding)">
        <rect
          x="11.04"
          y="36.43"
          width="200"
          height="323.73"
          fill="url(#paint0_linear_onboarding)"
          fillOpacity={fillOpacity}
        />
        <polygon
          points="288.19 160.11 288.19 483.71 488.19 483.71 488.19 208.17 288.21 160.11 288.19 160.11"
          fill="url(#paint0_linear_onboarding)"
          fillOpacity={fillOpacity}
        />
      </g>
      <defs>
        <filter
          id="filter0_i_onboarding"
          x="0"
          y="0"
          width="500"
          height="512"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="7" />
          <feGaussianBlur stdDeviation="4" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
          />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        {/* userSpaceOnUse so the sweep runs across both shapes as one mark,
            rather than restarting inside each element's own bounding box. */}
        <linearGradient
          id="paint0_linear_onboarding"
          x1="11.04"
          y1="36.43"
          x2="488.19"
          y2="483.71"
          gradientUnits="userSpaceOnUse"
        >
          {isLight ? (
            <>
              <stop stopColor="#B0BAC5" />
              <stop offset="0.538462" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="1" stopColor="#A8B0BE" />
            </>
          ) : (
            <>
              <stop stopColor="#3C5769" />
              <stop
                offset="0.538462"
                stopColor="#9FA5C2"
                stopOpacity="0.253846"
              />
              <stop offset="1" stopColor="#40435E" />
            </>
          )}
        </linearGradient>
      </defs>
    </svg>
  );
}
