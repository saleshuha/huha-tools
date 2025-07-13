export type MappingMethod = 'drag-drop' | 'dropdown' | 'click-connect' | 'table' | 'auto-suggest';

export interface MappingMethodOption {
  value: MappingMethod;
  label: string;
  description: string;
  icon: string;
}

export const MAPPING_METHODS: MappingMethodOption[] = [
  {
    value: 'drag-drop',
    label: 'Drag & Drop',
    description: 'Drag source columns to target columns',
    icon: 'move'
  },
  {
    value: 'dropdown',
    label: 'Dropdown Selection',
    description: 'Select target columns from dropdowns',
    icon: 'chevron-down'
  },
  {
    value: 'click-connect',
    label: 'Click to Connect',
    description: 'Click source, then target to create mapping',
    icon: 'link'
  },
  {
    value: 'table',
    label: 'Table Mapping',
    description: 'Side-by-side table with selection controls',
    icon: 'table'
  },
  {
    value: 'auto-suggest',
    label: 'Auto Suggestion',
    description: 'Automatically suggest mappings by name similarity',
    icon: 'sparkles'
  }
];