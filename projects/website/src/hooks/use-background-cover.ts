import { BACKGROUND_COVERS } from "@/components/background-cover";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";

export function useBackgroundCover(onChange: (value: string | number | boolean) => void) {
  const database = useDatabase();
  const [customValue, setCustomValue] = useState("");
  const [selectedOption, setSelectedOption] = useState("default");
  const [isInitialized, setIsInitialized] = useState(false);
  const previousDebouncedValue = useRef<string>("");
  const debouncedCustomValue = useDebounce(customValue, 500);

  const backgroundCoverOption = useStableLiveQuery(() => database.getBackgroundCover());
  const customBackgroundCover = useStableLiveQuery(() => database.getCustomBackgroundUrl());

  // Initialize state from database
  useEffect(() => {
    if (backgroundCoverOption !== undefined && customBackgroundCover !== undefined) {
      setSelectedOption(backgroundCoverOption);
      setCustomValue(customBackgroundCover);
      setIsInitialized(true);
    }
  }, [backgroundCoverOption, customBackgroundCover]);

  // Save debounced custom value
  useEffect(() => {
    if (
      isInitialized &&
      selectedOption === "custom" &&
      debouncedCustomValue !== previousDebouncedValue.current &&
      debouncedCustomValue !== customBackgroundCover
    ) {
      previousDebouncedValue.current = debouncedCustomValue;
      database.setCustomBackgroundUrl(debouncedCustomValue);
      onChange(debouncedCustomValue);
    }
  }, [
    debouncedCustomValue,
    isInitialized,
    selectedOption,
    customBackgroundCover,
    onChange,
    database,
  ]);

  const handleSelectChange = async (value: string) => {
    if (!isInitialized || value === selectedOption) return;

    setSelectedOption(value);

    if (value === "custom") {
      await database.setBackgroundCover("custom");
    } else {
      const cover = BACKGROUND_COVERS.find(c => c.id === value);
      const coverValue = cover?.value || value;
      await database.setBackgroundCover(value);
      onChange(coverValue);
    }
  };

  const handleCustomInputChange = (value: string) => {
    setCustomValue(value);
  };

  return {
    selectedOption,
    customValue,
    handleSelectChange,
    handleCustomInputChange,
  };
}
