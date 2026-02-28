"use client";

import { CalendarGrid } from "@/components/calendar-grid";
import { Button } from "@/components/ui/button";
import { eachDayOfInterval, isSameDay } from "date-fns";

interface DateSelectorProps {
  rangeStart: Date;
  rangeEnd: Date;
  selectedDates: Date[];
  onToggle: (date: Date) => void;
  enabledDates?: Date[];
  onSelectAll?: (dates: Date[]) => void;
}

export function DateSelector({
  rangeStart,
  rangeEnd,
  selectedDates,
  onToggle,
  enabledDates,
  onSelectAll,
}: DateSelectorProps) {
  const selectableDates = enabledDates ?? eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const allSelected =
    selectableDates.length > 0 &&
    selectableDates.every((date) => selectedDates.some((selected) => isSameDay(selected, date)));

  return (
    <div className="space-y-2">
      {onSelectAll && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectAll(selectableDates)}
            disabled={selectableDates.length === 0 || allSelected}
          >
            {allSelected ? "All Selected" : "Select All"}
          </Button>
        </div>
      )}
      <CalendarGrid
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        selectedDates={selectedDates}
        onToggleDate={onToggle}
        enabledDates={enabledDates}
        selectable
      />
      <p className="text-xs text-muted-foreground">
        {selectedDates.length} date{selectedDates.length !== 1 ? "s" : ""} selected
      </p>
    </div>
  );
}
