import { MetaDropdown } from "@pps/shell/MetaDropdown";
import React, { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { DegreeDropdownOption } from "./graph-degree-scope";

export interface GraphDegreeDropdownHandle {
  setValue: (value: string) => void;
  setOptions: (options: DegreeDropdownOption[]) => void;
}

export function mountGraphDegreeDropdown(
  host: HTMLElement,
  config: {
    value: string;
    options: DegreeDropdownOption[];
    onChange: (value: string) => void;
  },
): GraphDegreeDropdownHandle {
  const root: Root = createRoot(host);
  const state = {
    value: config.value,
    options: config.options,
    onChange: config.onChange,
  };

  function render(): void {
    root.render(
      <StrictMode>
        <MetaDropdown
          className="network__degree-dropdown"
          ariaLabel="Carrera"
          value={state.value}
          options={state.options}
          maxVisibleRows={12}
          onChange={(value) => {
            state.value = value;
            state.onChange(value);
            render();
          }}
        />
      </StrictMode>,
    );
  }

  render();

  return {
    setValue(value: string) {
      state.value = value;
      render();
    },
    setOptions(options: DegreeDropdownOption[]) {
      state.options = options;
      render();
    },
  };
}
