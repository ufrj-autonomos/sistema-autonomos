export function directoryPath(table: string) {
  return table === 'member' ? '/gestao/integrantes' : table === 'project' ? '/gestao/projetos' : `/gestao/site/${table.toLowerCase()}`;
}
