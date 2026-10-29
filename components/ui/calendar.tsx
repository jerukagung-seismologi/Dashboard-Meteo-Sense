"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 sm:p-4 [--cell-size:2.35rem] sm:[--cell-size:2.55rem] md:[--cell-size:2.75rem] select-none [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit max-w-full", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-6 md:flex-row md:gap-8",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-3 sm:gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-9 w-9 select-none p-0 aria-disabled:opacity-30 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-9 w-9 select-none p-0 aria-disabled:opacity-30 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-9 w-full items-center justify-center px-10 text-sm sm:text-base font-bold capitalize text-slate-900 dark:text-slate-100 tracking-tight",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-9 w-full items-center justify-center gap-1.5 text-sm font-semibold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-lg border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100",
          captionLayout === "label"
            ? "text-sm sm:text-base"
            : "[&>svg]:text-muted-foreground flex h-9 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-4",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse space-y-1",
        weekdays: cn("flex w-full items-center justify-between pb-1", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex size-[--cell-size] items-center justify-center select-none rounded-md text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full items-center justify-between", defaultClassNames.week),
        week_number_header: cn(
          "size-[--cell-size] select-none flex items-center justify-center",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem] flex size-[--cell-size] items-center justify-center",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative flex aspect-square size-[--cell-size] items-center justify-center select-none p-0 text-center font-medium",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-xl bg-blue-100/50 dark:bg-blue-950/40",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none bg-blue-50/70 dark:bg-blue-950/30", defaultClassNames.range_middle),
        range_end: cn("rounded-r-xl bg-blue-100/50 dark:bg-blue-950/40", defaultClassNames.range_end),
        today: cn(
          "rounded-xl",
          defaultClassNames.today
        ),
        outside: cn(
          "text-slate-300 dark:text-slate-600 opacity-40 aria-selected:opacity-50",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-slate-300 dark:text-slate-600 opacity-30 cursor-not-allowed pointer-events-none",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4.5 sm:size-5", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4.5 sm:size-5", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4.5 sm:size-5", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-[--cell-size] items-center justify-center p-0 text-center text-xs sm:text-sm font-medium leading-none rounded-xl transition-all select-none",
        // Single selection
        "data-[selected-single=true]:bg-blue-600 data-[selected-single=true]:text-white data-[selected-single=true]:font-bold data-[selected-single=true]:shadow-sm hover:data-[selected-single=true]:bg-blue-700",
        // Range start & end
        "data-[range-start=true]:bg-blue-600 data-[range-start=true]:text-white data-[range-start=true]:font-bold data-[range-start=true]:rounded-l-xl data-[range-start=true]:rounded-r-none hover:data-[range-start=true]:bg-blue-700",
        "data-[range-end=true]:bg-blue-600 data-[range-end=true]:text-white data-[range-end=true]:font-bold data-[range-end=true]:rounded-r-xl data-[range-end=true]:rounded-l-none hover:data-[range-end=true]:bg-blue-700",
        // Range middle
        "data-[range-middle=true]:bg-blue-100 dark:data-[range-middle=true]:bg-blue-950/60 data-[range-middle=true]:text-blue-900 dark:data-[range-middle=true]:text-blue-200 data-[range-middle=true]:rounded-none",
        // Today indicator (when not selected)
        modifiers.today && !modifiers.selected && "border-2 border-blue-500/80 text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/30",
        // Hover state
        "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
        // Focus ring
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-blue-500",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
