// src/services/escolinhaService.js
let escolinhaData = [
  {
    id: "escolinha1",
    campoId: "SIfI1DMe9hHuZEnTWSd3",
    nome: "Aula Sub-10",
    responsavel: "Professor Pedro",
    telefone: "987654321",
    dia: "segunda",
    inicio: "16:00",
    fim: "17:00",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

export const escolinhaService = {
  getAulas: async () => {
    console.log("escolinhaService: Buscando aulas");
    return escolinhaData;
  },
  addAula: async (aula) => {
    const novaAula = {
      ...aula,
      id: `escolinha${escolinhaData.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    escolinhaData.push(novaAula);
    console.log("escolinhaService: Aula adicionada:", novaAula);
  },
  updateAula: async (id, aulaAtualizada) => {
    const index = escolinhaData.findIndex((aula) => aula.id === id);
    if (index !== -1) {
      escolinhaData[index] = { ...escolinhaData[index], ...aulaAtualizada };
      console.log("escolinhaService: Aula atualizada:", escolinhaData[index]);
    } else {
      throw new Error("Aula não encontrada");
    }
  },
  deleteAula: async (id) => {
    const index = escolinhaData.findIndex((aula) => aula.id === id);
    if (index !== -1) {
      escolinhaData.splice(index, 1);
      console.log("escolinhaService: Aula deletada:", id);
    } else {
      throw new Error("Aula não encontrada");
    }
  },
};
