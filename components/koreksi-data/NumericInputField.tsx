"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function NumericInputField({
  value,
  onCommit,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onCommit: (nextVal: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    let clamped = parsed;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    onCommit(clamped);
    setDraft(String(clamped));
  };

  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() !== "" && raw.trim() !== "-") {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            let clamped = parsed;
            if (min !== undefined && clamped < min) clamped = min;
            if (max !== undefined && clamped > max) clamped = max;
            onCommit(clamped);
          }
        }
      }}
      onBlur={() => commitDraft(draft)}
      className={className}
    />
  );
}
