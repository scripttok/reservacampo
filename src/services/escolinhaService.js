// src/services/escolinhaService.js
import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const ESCOLINHA_COLLECTION = "escolinha";

export const escolinhaService = {
  async getAulas() {
    try {
      ("escolinhaService: Buscando aulas");
      const aulasCol = collection(db, ESCOLINHA_COLLECTION);
      const aulasSnapshot = await getDocs(aulasCol);
      const aulasList = aulasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      "escolinhaService: Aulas encontradas:", aulasList.length;
      return aulasList;
    } catch (error) {
      console.error("escolinhaService: Erro ao buscar aulas:", error);
      return [];
    }
  },

  async addAula({ campoId, dia, inicio, fim, nome, responsavel, telefone }) {
    "escolinhaService: Adicionando aula:",
      {
        campoId,
        dia,
        inicio,
        fim,
      };
    if (!dia) throw new Error("O campo 'dia' é obrigatório");
    const createdAt = new Date().toISOString();
    const aulaComData = {
      campoId,
      dia,
      inicio,
      fim,
      nome,
      responsavel,
      telefone,
      createdAt,
    };
    const aulasCol = collection(db, ESCOLINHA_COLLECTION);
    const docRef = await addDoc(aulasCol, aulaComData);
    return { id: docRef.id, ...aulaComData };
  },

  async updateAula(id, aulaAtualizada) {
    "escolinhaService: Atualizando aula:", id, aulaAtualizada;
    const aulaRef = doc(db, ESCOLINHA_COLLECTION, id);
    await updateDoc(aulaRef, aulaAtualizada);
    ("escolinhaService: Aula atualizada");
  },

  async deleteAula(id) {
    "escolinhaService: Deletando aula:", id;
    const aulaRef = doc(db, ESCOLINHA_COLLECTION, id);
    await deleteDoc(aulaRef);
    ("escolinhaService: Aula deletada");
  },
};
