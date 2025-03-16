// src/utils/horarioUtils.js
function checkHorarioConflito(item1, item2) {
  if (item1.campoId !== item2.campoId || item1.dia !== item2.dia) {
    return false; // Não há conflito se o campo ou dia forem diferentes
  }

  const inicio1 = new Date(`2025-01-01T${item1.inicio}:00`);
  const fim1 = new Date(`2025-01-01T${item1.fim}:00`);
  const inicio2 = new Date(`2025-01-01T${item2.inicio}:00`);
  const fim2 = new Date(`2025-01-01T${item2.fim}:00`);

  return inicio1 < fim2 && inicio2 < fim1; // Há sobreposição se um começa antes do outro terminar
}

export { checkHorarioConflito };
