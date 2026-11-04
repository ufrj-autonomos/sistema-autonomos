export type SelectOption = { label: string; value: string | number; group?: string };
export function selectOptions(options: SelectOption[], current: unknown) {
  const unique = [...new Map(options.map(option => [String(option.value), option])).values()];
  const value = current === null || current === undefined ? '' : String(current);
  if (value && !unique.some(option => String(option.value) === value)) unique.unshift({ value, label: `${value} (valor atual)`, group: 'Cadastro atual' });
  return { options: unique, showPlaceholder: !unique.some(option => String(option.value) === '') };
}
