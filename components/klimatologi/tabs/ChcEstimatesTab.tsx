"use client";

import React from "react";
import { ChcEarlyEstimatesViewer } from "@/components/climatology/ChcEarlyEstimatesViewer";

export function ChcEstimatesTab() {
  return (
    <div className="space-y-6">
      <ChcEarlyEstimatesViewer />
    </div>
  );
}
