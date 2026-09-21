import type { ReactNode } from "react";
import MobileShell from "@/components/mobile/MobileShell";

export default function NewAuctionLayout({ children }: { children: ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
