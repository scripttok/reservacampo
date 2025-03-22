// src/services/turmaService.js
import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const TURMAS_COLLECTION = "turmas";

export const turmaService = {
  async getTurmas() {
    try {
      ("turmaService: Buscando turmas");
      const turmasCol = collection(db, TURMAS_COLLECTION);
      const turmasSnapshot = await getDocs(turmasCol);
      const turmasList = turmasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      "turmaService: Turmas encontradas:", turmasList.length;
      return turmasList;
    } catch (error) {
      console.error("turmaService: Erro ao buscar turmas:", error);
      return [];
    }
  },

  async addTurma(turma) {
    "turmaService: Adicionando turma:", turma;
    const createdAt = new Date().toISOString(); // Data atual em formato ISO
    const turmaComData = { ...turma, createdAt };
    const turmasCol = collection(db, TURMAS_COLLECTION);
    const docRef = await addDoc(turmasCol, turmaComData);
    "turmaService: Turma adicionada com ID:", docRef.id;
  },

  async updateTurma(id, turma) {
    "turmaService: Atualizando turma:", id, turma;
    const turmaRef = doc(db, TURMAS_COLLECTION, id);
    await updateDoc(turmaRef, turma);
    ("turmaService: Turma atualizada");
  },

  async deleteTurma(id) {
    "turmaService: Deletando turma:", id;
    const turmaRef = doc(db, TURMAS_COLLECTION, id);
    await deleteDoc(turmaRef);
    ("turmaService: Turma deletada");
  },
};
