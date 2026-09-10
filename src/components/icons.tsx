"use client";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const LayoutGrid = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></Icon>
);
export const Package = (p: IconProps) => (
  <Icon {...p}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /></Icon>
);
export const ShoppingCart = (p: IconProps) => (
  <Icon {...p}><circle cx="9.5" cy="20" r="1.4" fill="currentColor" stroke="none" /><circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" /><path d="M2.5 3h2.4l2.1 11.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7H6" /></Icon>
);
export const Receipt = (p: IconProps) => (
  <Icon {...p}><path d="M6 2.5h12v19l-2.4-1.6L13.2 21l-1.2-1.6L10.8 21l-2.4-1.1L6 21.5z" /><path d="M9 8h6M9 12h6M9 16h4" /></Icon>
);
export const Boxes = (p: IconProps) => (
  <Icon {...p}><path d="M12 2.7 18.5 6.5v7.6L12 17.9l-6.5-3.8V6.5z" /><path d="M12 2.7v7.6M12 10.3l6.5-3.8M12 10.3 5.5 6.5M12 10.3v7.6" /></Icon>
);
export const FileBarChart = (p: IconProps) => (
  <Icon {...p}><path d="M6 2.5h9l4 4v15H6z" /><path d="M9.5 17v-4M13 17V9M16.5 17v-6.5" /></Icon>
);
export const AlertTriangle = (p: IconProps) => (
  <Icon {...p}><path d="M12 3.5 21.5 20h-19z" /><path d="M12 9.5v4.4" /><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" /></Icon>
);
export const Plus = (p: IconProps) => <Icon {...p}><path d="M12 4.5v15M4.5 12h15" /></Icon>;
export const Trash2 = (p: IconProps) => (
  <Icon {...p}><path d="M4 6.5h16" /><path d="M9 6.5V4h6v2.5" /><path d="M6.5 6.5 7.3 20a1.5 1.5 0 0 0 1.5 1.4h6.4A1.5 1.5 0 0 0 16.7 20l.8-13.5" /><path d="M10.2 10.5v7M13.8 10.5v7" /></Icon>
);
export const Pencil = (p: IconProps) => (
  <Icon {...p}><path d="M14.3 4.7 4 15l-1.2 4.2L7 18l10.3-10.3z" /><path d="M12.4 6.6l4 4" /></Icon>
);
export const X = (p: IconProps) => <Icon {...p}><path d="M5 5l14 14M19 5 5 19" /></Icon>;
export const Search = (p: IconProps) => (
  <Icon {...p}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m20 20-4.3-4.3" /></Icon>
);
export const LogOut = (p: IconProps) => (
  <Icon {...p}><path d="M9 3.5H5.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5H9" /><path d="M16 16.5 21 12l-5-4.5" /><path d="M21 12H9" /></Icon>
);
export const Bell = (p: IconProps) => (
  <Icon {...p}><path d="M6 9.5a6 6 0 0 1 12 0c0 5.2 1.7 6.3 1.7 6.3H4.3S6 14.7 6 9.5z" /><path d="M10 19a2 2 0 0 0 4 0" /></Icon>
);
export const Lock = (p: IconProps) => (
  <Icon {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></Icon>
);
export const Eye = (p: IconProps) => (
  <Icon {...p}><path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5z" /><circle cx="12" cy="12" r="2.2" /></Icon>
);
export const EyeOff = (p: IconProps) => (
  <Icon {...p}><path d="m3 3 18 18" /><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.5M6.2 6.8C3.9 8.2 2.5 12 2.5 12s3.4 6 9.5 6a9.8 9.8 0 0 0 3-.5" /><path d="M9.9 9.9a2.2 2.2 0 0 0 3.1 3.1" /></Icon>
);
export const Sun = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></Icon>
);
export const Moon = (p: IconProps) => (
  <Icon {...p}><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2z" /></Icon>
);
export const Menu = (p: IconProps) => <Icon {...p}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></Icon>;
export const UserPlus = (p: IconProps) => (
  <Icon {...p}><path d="M15 20.5v-1.2a4.8 4.8 0 0 0-4.8-4.8H6.8A4.8 4.8 0 0 0 2 19.3v1.2" /><circle cx="8.5" cy="7.2" r="3.7" /><path d="M19 8v6M16 11h6" /></Icon>
);
