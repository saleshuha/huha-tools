export type MappingMethod = 'dropdown' | 'click-connect';

export interface MappingMethodOption {
  value: MappingMethod;
  label: string;
  description: string;
  icon: string;
}

export const MAPPING_METHODS: MappingMethodOption[] = [
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
  }
];